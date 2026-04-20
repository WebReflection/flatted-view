"""
Decode flatted-view binary format (JS-compatible) to Python values.
"""
import struct

from .constants import (
    ARRAY,
    BI,
    BUI,
    CUSTOM,
    CUSTOM_REVIVE,
    F64,
    FALSE,
    I8,
    I16,
    I32,
    LEN,
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

NUMBER_IGNORE = ~(RECURSION | NUMBER)
# Same as JS `STACK_DECODED` in src/decode.js
STACK_DECODED = CUSTOM_REVIVE


def _default_custom(value, from_view=False):
    return value


def item(k, v):
    return {"k": k, "v": v}


def _read_number(data, type_byte, index):
    type_byte &= NUMBER_IGNORE
    if type_byte == 0:
        return 0
    b0 = data[index[0]]
    index[0] += 1
    if type_byte == U8:
        return b0
    if type_byte == I8:
        return struct.unpack("<b", bytes([b0]))[0]
    b1 = data[index[0]]
    index[0] += 1
    if type_byte == U16:
        return struct.unpack("<H", bytes([b0, b1]))[0]
    if type_byte == I16:
        return struct.unpack("<h", bytes([b0, b1]))[0]
    b2 = data[index[0]]
    b3 = data[index[0] + 1]
    index[0] += 2
    if type_byte == U32:
        return struct.unpack("<I", bytes([b0, b1, b2, b3]))[0]
    if type_byte == I32:
        return struct.unpack("<i", bytes([b0, b1, b2, b3]))[0]
    chunk = bytes([b0, b1, b2, b3]) + data[index[0] : index[0] + 4]
    index[0] += 4
    return struct.unpack("<d", chunk)[0]


def _read_bigint(data, index, is_unsigned):
    chunk = data[index[0] : index[0] + 8]
    index[0] += 8
    if is_unsigned:
        return struct.unpack("<Q", chunk)[0]
    return struct.unpack("<q", chunk)[0]


def _read_key(data, cache, index):
    type_byte = data[index[0]]
    index[0] += 1
    kind = type_byte & ~LEN
    if kind == RECURSION:
        idx = _read_number(data, type_byte, index)
        return cache[idx]
    return _read_string(data, cache, type_byte, index)


def _read_string(data, cache, type_byte, index):
    if type_byte == STRING:
        return ""
    known = index[0] - 1
    length = int(_read_number(data, type_byte, index))
    start = index[0]
    index[0] += length
    s = data[start : start + length].decode("utf-8")
    cache[known] = s
    return s


def _slice(data, length, index):
    start = index[0]
    index[0] += length
    return data[start : start + length]


def decode(view, custom=None):
    """Decode flatted-view binary to Python values.

    ``custom`` matches JS: ``(value, from_view: bool) -> unknown``.
    When ``from_view`` is True, ``value`` is the raw CUSTOM payload bytes from ``view(...)``.
    When False, ``value`` is the list built by decoding the implicit CUSTOM array segment.
    """
    if custom is None:
        custom = _default_custom

    data = bytes(view)

    cache = {}
    # CUSTOM placeholders: list object -> byte offset (JS Map entry-as-key)
    rev = {}
    as_key = set()

    index = [0]
    ignore = item(NULL, None)
    stack = [ignore] if len(data) > 0 else []
    first = True
    result = None
    entry = None
    prop = None

    def finalize(k, pair, known):
        nonlocal first, result, entry
        value, inner = pair[0], pair[1]
        key = inner["k"]
        parent = inner["v"]
        revived = custom(value, k != STACK_DECODED)
        cache[known] = revived
        if parent is not None:
            parent[key] = revived
        elif first:
            result = revived
        return revived

    while stack:
        frame = stack.pop()
        k, v = frame["k"], frame["v"]

        if k == OBJECT:
            prop = _read_key(data, cache, index)

        elif CUSTOM <= k and isinstance(v, list):
            custom_pair = v
            known_ref = rev.get(id(custom_pair[0]))
            custom_pair[0].append(finalize(k, custom_pair, known_ref))
            continue

        if index[0] >= len(data):
            break

        type_byte = data[index[0]]
        index[0] += 1

        if type_byte == FALSE:
            entry = False
        elif type_byte == TRUE:
            entry = True
        elif type_byte == NULL:
            entry = None

        elif CUSTOM <= type_byte:
            known = index[0] - 1
            entry = []
            cache[known] = entry
            rev[id(entry)] = known
            as_key.add(id(entry))
            inner_k = None
            if k == OBJECT:
                inner_k = prop
            elif k == ARRAY:
                inner_k = len(v)
            stack.append(
                item(
                    type_byte,
                    item(inner_k, v),
                )
            )
            continue

        elif type_byte & NUMBER:
            if type_byte & ARRAY:
                length = int(_read_number(data, type_byte & ~ARRAY, index))
                entry = _slice(data, length, index)
            else:
                t = type_byte & ~NUMBER
                if t == BUI:
                    entry = _read_bigint(data, index, True)
                elif t == BI:
                    entry = _read_bigint(data, index, False)
                else:
                    entry = _read_number(data, type_byte, index)

        else:
            kind = type_byte & ~LEN
            if kind == RECURSION:
                idx = _read_number(data, type_byte, index)
                entry = cache[idx]
            elif kind == STRING:
                entry = _read_string(data, cache, type_byte, index)
            else:
                known = index[0] - 1
                length = int(_read_number(data, type_byte, index))
                is_custom = CUSTOM <= k

                if kind == ARRAY:
                    if is_custom:
                        entry = cache.get(known - 1)
                        if k != STACK_DECODED:
                            target = entry
                            pair = [_slice(data, length, index), v]
                            target.append(finalize(k, pair, known - 1))
                            continue
                        stack.append(item(k, [entry, v]))
                    else:
                        entry = []
                        cache[known] = entry
                    for _ in range(length):
                        stack.append(item(ARRAY, entry))

                elif kind == OBJECT:
                    entry = {}
                    cache[known] = entry
                    for _ in range(length):
                        stack.append(item(OBJECT, entry))

        if first:
            first = False
            result = entry
        elif k == OBJECT:
            v[prop] = entry
        elif k == ARRAY:
            v.append(entry)

    if isinstance(result, list) and id(result) in as_key:
        return result.pop()
    return result
