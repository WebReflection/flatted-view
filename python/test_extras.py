"""
Tests for python.extras extended types not covered by test_index.py.

Run from repo root: PYTHONPATH=. python python/test_extras.py
"""
import array
import io
import os
import re
import sys
import tempfile
from collections import OrderedDict, deque

if __name__ == "__main__" and "." not in __name__:
    parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent not in sys.path:
        sys.path.insert(0, parent)

from python import extras


def assert_eq(expected, actual, msg=""):
    if expected != actual:
        raise AssertionError(f"Expected {expected!r} but got {actual!r}" + (f" ({msg})" if msg else ""))


def rt(value, msg=""):
    """Round-trip through extras.encode / extras.decode."""
    out = extras.decode(extras.encode(value))
    assert_eq(value, out, msg)


# --- frozenset / set ---
rt(frozenset())
rt(frozenset([1, 2, 3]))
s = {1, 2, 3}
assert_eq(s, extras.decode(extras.encode(s)))

# --- OrderedDict (order preserved) ---
od = OrderedDict([("z", 1), ("a", 2)])
assert_eq(list(od.items()), list(extras.decode(extras.encode(od)).items()))
rt(OrderedDict())

# --- array.array ---
rt(array.array("i", []))
rt(array.array("i", [1, -2, 3]))
rt(array.array("B", range(8)))

# --- memoryview ---
mv = memoryview(b"abc")
assert_eq(bytes(extras.decode(extras.encode(mv))), bytes(mv))

# --- complex ---
rt(complex(0, 0))
rt(complex(-1.5, 2.25))

# --- deque (decode uses maxlen=len(items); empty deque uses maxlen 1 on CPython) ---
d = deque([1, 2, 3])
assert_eq(list(d), list(extras.decode(extras.encode(d))))
d_empty = extras.decode(extras.encode(deque()))
assert_eq(0, len(d_empty))
assert_eq(1, d_empty.maxlen)

# --- BaseException: wire uses str(exception); ValueError round-trips message cleanly ---
ve = ValueError("plain")
ve2 = extras.decode(extras.encode(ve))
assert type(ve2) is ValueError
assert_eq("plain", str(ve2))
assert_eq(("plain",), ve2.args)

ke = KeyError("missing")
assert type(extras.decode(extras.encode(ke))) is KeyError

re2 = extras.decode(extras.encode(RuntimeError("boom")))
assert type(re2) is RuntimeError
assert_eq("boom", str(re2))


class CustomExc(Exception):
    pass


# Unknown __name__ falls back to Exception
ce = CustomExc("x")
ce2 = extras.decode(extras.encode(ce))
assert type(ce2) is Exception
assert_eq("x", str(ce2))

# --- regex ---
pat = re.compile(r"ab+c", re.IGNORECASE | re.MULTILINE)
pat2 = extras.decode(extras.encode(pat))
assert_eq(pat.pattern, pat2.pattern)
assert_eq(pat.flags, pat2.flags)
assert pat2.match("ABBBBC")

# --- BytesIO ---
bio = io.BytesIO(b"\x00\xffhello")
bio2 = extras.decode(extras.encode(bio))
assert_eq(bio.getvalue(), bio2.getvalue())

# --- Binary file object (not BytesIO): name + full read, position restored ---
with tempfile.NamedTemporaryFile(delete=False) as tf:
    tf.write(b"file payload")
    path = tf.name
try:
    with open(path, "rb") as f:
        pos_before = f.tell()
        out = extras.decode(extras.encode(f))
        assert_eq(pos_before, f.tell(), "read position restored")
    assert isinstance(out, io.BytesIO)
    assert_eq(b"file payload", out.getvalue())
finally:
    os.unlink(path)

# --- extras.decode optional custom for unknown list-shaped payloads (tag not in extras) ---
from python import encode as core_encode


def _inject_unknown_list(value):
    # Core encode only calls ``custom`` on whole containers; replace a sentinel list.
    if value == ["__inject__"]:
        return [9999, 1, "z"]
    return value


blob = core_encode(["__inject__"], custom=_inject_unknown_list)
seen = {}

def _extras_custom(value, from_view=False):
    if isinstance(value, list) and len(value) >= 1 and value[0] == 9999:
        seen["hit"] = True
        return "from-custom"
    return value


result = extras.decode(blob, custom=_extras_custom)
assert_eq("from-custom", result)
assert seen.get("hit") is True

# --- encode only includes dict entries whose values pass encode._compatible (core types) ---
# So set/complex/etc. as dict values are dropped unless wrapped (e.g. in a list) in a way the encoder supports.
assert_eq({}, extras.decode(extras.encode({"k": {1, 2}})))

print("All extras tests passed.")
