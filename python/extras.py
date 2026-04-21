"""
Extended types for Python-to-Python payloads. Use encode/decode from this module.

Core encodes tuples as arrays (decode yields ``list``). With this module, tuples round-trip
as ``tuple``. Also: ``frozenset``, ``set``, ``collections.OrderedDict``, ``array.array``,
``memoryview``, ``complex``, ``collections.deque``, ``BaseException`` (type name, message; fourth wire slot is ``""`` — no traceback dependency),
``re`` patterns when they expose
``pattern`` / ``flags``, and ``BytesIO`` / binary file reads. Same code paths on CPython and
MicroPython.
"""
import array
import builtins
import io
import re

from collections import OrderedDict, deque

from .encode import encode as _encode, view
from .decode import decode as _decode

# Python-only wire tags (not shared with any JS extras layout)
TUPLE = 0
FROZENSET = 1
SET = 2
ORDERED_DICT = 3
ARRAY_DATA = 4
MEMORYVIEW = 5
COMPLEX = 6
DEQUE = 7
EXCEPTION = 8
RE_PATTERN = 9
BYTES_IO = 10

try:
    BufferedReader = io.BufferedReader
except AttributeError:
    BufferedReader = io.IOBase


def _tagged_seq(tag, seq):
    out = [tag, len(seq)]
    for x in seq:
        out.append(x)
    return out


def _bytes_from_array(value):
    return bytes(value)


def _bytes_from_memoryview(value):
    return bytes(value)


def _is_file_like_binary(o):
    if isinstance(o, io.BytesIO):
        return False
    if isinstance(o, BufferedReader):
        return True
    read = getattr(o, "read", None)
    if not callable(read):
        return False
    mode = getattr(o, "mode", "") or ""
    return "b" in mode


def _read_all_binary(o):
    pos = getattr(o, "tell", None)
    if callable(pos):
        o.seek(0)
    data = o.read()
    data = bytes(data) if isinstance(data, (bytes, bytearray)) else bytes(data)
    if callable(pos):
        o.seek(0)
    return data


def _is_regex(o):
    pat = getattr(re, "Pattern", None)
    if pat is not None and isinstance(o, pat):
        return True
    return hasattr(o, "pattern") and hasattr(o, "flags") and callable(getattr(o, "match", None))


def _extras_include_dict_entry(key, obj):
    """Which ``dict`` / instance ``__dict__`` keys to serialize under :func:`encode` (extended types)."""
    v = obj.get(key, None)
    if v is None:
        return True
    t = type(v)
    if t in (bool, int, float, str, list, tuple, dict, bytes, bytearray):
        return True
    if t is frozenset or t is set:
        return True
    if isinstance(v, OrderedDict):
        return True
    if t is memoryview:
        return True
    if isinstance(v, array.array):
        return True
    if isinstance(v, BaseException):
        return True
    if _is_regex(v):
        return True
    if t is complex:
        return True
    if isinstance(v, deque):
        return True
    if isinstance(v, io.BytesIO):
        return True
    if _is_file_like_binary(v):
        return True
    return False


def encode(data, output=None):
    """Encode with extended Python types (same signature as :func:`python.encode.encode`)."""

    def custom(value):
        if value is None:
            return value
        t = type(value)
        if t is bool:
            return value
        if t in (int, float, str):
            return value
        if t in (list, dict, bytes, bytearray):
            return value

        if t is tuple:
            return _tagged_seq(TUPLE, value)

        if t is frozenset:
            return _tagged_seq(FROZENSET, value)

        if t is set:
            return _tagged_seq(SET, value)

        if isinstance(value, OrderedDict):
            n = len(value)
            out = [ORDERED_DICT, n]
            for k, val in value.items():
                out.append(k)
                out.append(val)
            return out

        if type(value) is memoryview:
            return _direct([MEMORYVIEW, _bytes_from_memoryview(value)])

        if isinstance(value, array.array):
            return [ARRAY_DATA, value.typecode, _bytes_from_array(value)]

        if isinstance(value, BaseException):
            return _direct([EXCEPTION, type(value).__name__, str(value), ""])

        if _is_regex(value):
            return _direct([RE_PATTERN, value.pattern, value.flags])

        if type(value) is complex:
            return [COMPLEX, value.real, value.imag]

        if isinstance(value, deque):
            return _tagged_seq(DEQUE, value)

        if isinstance(value, io.BytesIO):
            return _direct([BYTES_IO, "", bytes(value.getvalue())])

        if _is_file_like_binary(value):
            name = getattr(value, "name", "") or ""
            if not isinstance(name, str):
                name = str(name)
            data = _read_all_binary(value)
            return _direct([BYTES_IO, name, data])

        return value

    def _direct(inner):
        return view(
            bytes(
                _encode(
                    inner,
                    custom=custom,
                    include_dict_entry=_extras_include_dict_entry,
                )
            )
        )

    return _encode(
        data,
        output=output,
        custom=custom,
        include_dict_entry=_extras_include_dict_entry,
    )


def decode(view_arg, custom=None):
    """Decode with extended Python types. Optional ``custom`` is applied for unknown payloads."""

    def inner_custom(value, from_view=False):
        v = _decode(value, custom=inner_custom) if from_view else value

        if not isinstance(v, list) or len(v) == 0:
            return custom(v, from_view) if custom else v

        tag = v[0]

        if tag == ARRAY_DATA:
            a = array.array(v[1])
            a.frombytes(v[2])
            return a

        if tag == ORDERED_DICT:
            n = v[1]
            od = OrderedDict()
            for i in range(n):
                od[v[2 + 2 * i]] = v[2 + 2 * i + 1]
            return od

        if tag == SET:
            return set(v[2 : 2 + v[1]])

        if tag == EXCEPTION:
            exc_type = getattr(builtins, v[1], Exception)
            e = exc_type(v[2])
            if len(v) > 3 and v[3]:
                setattr(e, "stack", v[3])
            return e

        if tag == RE_PATTERN:
            return re.compile(v[1], v[2])

        if tag == TUPLE:
            return tuple(v[2 : 2 + v[1]])

        if tag == FROZENSET:
            return frozenset(v[2 : 2 + v[1]])

        if tag == BYTES_IO:
            return io.BytesIO(v[2])

        if tag == COMPLEX:
            return complex(v[1], v[2])

        if tag == DEQUE:
            n = v[1]
            items = v[2 : 2 + n]
            # Always pass maxlen: required on MicroPython; on CPython ``maxlen == n`` after decode.
            return deque(items, n if n > 0 else 1)

        if tag == MEMORYVIEW:
            return memoryview(v[1])

        return custom(v, from_view) if custom else v

    return _decode(view_arg, custom=inner_custom)
