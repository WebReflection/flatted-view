"""
Encode Python values to the flatted-view binary format (JS-compatible).
"""
import struct

from .constants import (
    ARRAY,
    BUI,
    BI,
    CUSTOM,
    F64,
    FALSE,
    I8,
    I16,
    I32,
    LEN,
    MAX_I8,
    MAX_I16,
    MAX_I32,
    MAX_U8,
    MAX_U16,
    MAX_U32,
    NULL,
    NUMBER,
    OBJECT,
    RECURSION,
    STRING,
    TRUE,
    U8,
    U16,
    U32,
)


def _default_custom(value):
    return value


def item(k, v):
    return {"k": k, "v": v}


class View:
    """Wrapper for custom binary payload. Like JS view()."""

    __slots__ = ("_value",)

    def __init__(self, value):
        # bytes(x) works for list of ints, bytes, or bytearray
        self._value = bytes(value)

    def __eq__(self, other):
        if isinstance(other, View):
            return self._value == other._value
        return False

    def value(self):
        return self._value


view = lambda value: View(value)

def _uint(output, type_byte, length):
    if length == 0:
        output.append(type_byte)
    elif length < MAX_U8:
        output.append(type_byte | U8)
        output.append(length)
    elif length < MAX_U16:
        output.append(type_byte | U16)
        output.extend(struct.pack("<H", length))
    elif length < MAX_U32:
        output.append(type_byte | U32)
        output.extend(struct.pack("<I", length))
    else:
        output.append(type_byte | LEN)
        output.extend(struct.pack("<d", float(length)))


def _push_bytes(output, data, length):
    output.extend(data[:length])


def _bigint(output, value):
    if value < 0:
        output.append(NUMBER | BI)
        output.extend(struct.pack("<q", value))
    else:
        output.append(NUMBER | BUI)
        output.extend(struct.pack("<Q", value))


def _floating(output, value):
    output.append(NUMBER | F64)
    output.extend(struct.pack("<d", value))


def _number(output, value):
    if isinstance(value, float):
        _floating(output, value)
        return
    # int
    if value < 0:
        if -MAX_I8 <= value:
            output.append(NUMBER | I8)
            output.append(struct.pack("<b", value)[0] & 0xFF)
        elif -MAX_I16 <= value:
            output.append(NUMBER | I16)
            output.extend(struct.pack("<h", value))
        elif -MAX_I32 <= value:
            output.append(NUMBER | I32)
            output.extend(struct.pack("<i", value))
        else:
            _floating(output, float(value))
    else:
        _uint(output, NUMBER, value)


def _string(output, cache, data):
    if data == "":
        output.append(STRING)
        return
    if id(data) in cache:
        _uint(output, RECURSION, cache[id(data)])
        return
    cache[id(data)] = len(output)
    encoded = data.encode("utf-8")
    length = len(encoded)
    _uint(output, STRING, length)
    _push_bytes(output, encoded, length)


def _augment(output, value, encode_fn):
    if isinstance(value, View):
        raw = value.value()
        output.append(CUSTOM)
        _uint(output, NUMBER, len(raw))
        _push_bytes(output, raw, len(raw))
    else:
        output.append(CUSTOM | I8)
        nested = encode_fn(value)
        _uint(output, NUMBER, len(nested))
        output.extend(nested)


def _compatible(key, obj):
    v = obj.get(key, None)
    if v is None:
        return False
    t = type(v)
    return t in (bool, int, float, str, list, tuple, dict, bytes, bytearray)


def encode(data, output=None, custom=None):
    if output is None:
        output = []
    if custom is None:
        custom = _default_custom

    cache = {}
    stack = [item(None, data)]

    while stack:
        frame = stack.pop()
        k, v = frame["k"], frame["v"]

        if k is not None:
            _string(output, cache, k)

        if v is None:
            output.append(NULL)
            continue

        t = type(v)

        if t == bool:
            output.append(TRUE if v else FALSE)
            continue

        if t in (int, float):
            _number(output, v)
            continue

        if t == str:
            _string(output, cache, v)
            continue

        # Object-like (list, tuple, dict, bytes, bytearray, or any object with to_json)
        to_json = getattr(v, "to_json", None) or getattr(v, "toJSON", None)
        if callable(to_json):
            replacement = to_json()
            if replacement is v:
                output.append(NULL)
                continue
            stack.append(item(None, replacement))
            continue

        if t in (list, tuple, dict, bytes, bytearray):
            if id(v) in cache:
                _uint(output, RECURSION, cache[id(v)])
                continue

            cache[id(v)] = len(output)

            custom_result = custom(v)
            if custom_result is not v:
                _augment(output, custom_result, lambda x: encode(x, [], custom))
                continue

            if isinstance(v, (bytes, bytearray)):
                length = len(v)
                _uint(output, ARRAY | NUMBER, length)
                _push_bytes(output, v, length)
                continue

            if isinstance(v, (list, tuple)):
                length = len(v)
                _uint(output, ARRAY, length)
                for i in range(length - 1, -1, -1):
                    stack.append(item(None, v[i]))
                continue

            if isinstance(v, dict):
                own = [key for key in v if _compatible(key, v)]
                length = len(own)
                _uint(output, OBJECT, length)
                for i in range(length - 1, -1, -1):
                    key = own[i]
                    stack.append(item(key, v[key]))
                continue

        # Custom handler (before __dict__ so e.g. Symbol-like can return a value)
        custom_result = custom(v)
        if custom_result is not v:
            _augment(output, custom_result, lambda x: encode(x, [], custom))
            continue

        # Class instance: encode __dict__ as object (like JS enumerable keys)
        if hasattr(v, "__dict__"):
            if id(v) in cache:
                _uint(output, RECURSION, cache[id(v)])
                continue
            cache[id(v)] = len(output)
            d = v.__dict__
            own = [key for key in d if _compatible(key, d)]
            length = len(own)
            _uint(output, OBJECT, length)
            for i in range(length - 1, -1, -1):
                key = own[i]
                stack.append(item(key, d[key]))
            continue

        # Unsupported: null
        output.append(NULL)

    return output
