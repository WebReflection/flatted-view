"""
Mirror test/index.js for the Python encode/decode implementation.
Run from repo root: PYTHONPATH=. python python/test_index.py
"""
import sys
import time

# Allow running as script from repo root
if __name__ == "__main__" and "." not in __name__:
    import os
    parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent not in sys.path:
        sys.path.insert(0, parent)

from python import encode, decode, view


def assert_eq(expected, actual, msg=""):
    if expected != actual:
        raise AssertionError(f"Expected {expected!r} but got {actual!r}" + (f" ({msg})" if msg else ""))


# --- Basic roundtrip ---
v = bytes([1, 2, 3])
data = {
    "a": True,
    "b": "hello",
    "c": 123,
    "d": [1, 2, 3],
    "e": {"f": 456, "g": "world"},
    "v": v,
}

encoded = encode(data)
decoded = decode(encoded)

assert_eq(True, decoded["a"])
assert_eq("hello", decoded["b"])
assert_eq(123, decoded["c"])
assert_eq("1,2,3", ",".join(map(str, decoded["d"])))
assert_eq(456, decoded["e"]["f"])
assert_eq("world", decoded["e"]["g"])
assert_eq(v, decoded["v"])

# --- Repeated string in array ---
encoded = encode(["a", "b", "a"])
decoded = decode(encoded)
assert_eq("a,b,a", ",".join(decoded))

# --- Tuple encoded like list (decode returns list) ---
encoded = encode(("x", "y", "z"))
decoded = decode(encoded)
assert_eq("x,y,z", ",".join(decoded))

# --- Bytes roundtrip ---
encoded = encode(v)
decoded = decode(encoded)
assert_eq(v, decoded)

# --- Custom bigint as string (like JS ASCII.encode) ---
def encode_bigint_str(value):
    if isinstance(value, int) and (value < -2**53 or value >= 2**53):
        return str(value).encode("ascii")
    return value

def decode_bigint_str(value):
    if isinstance(value, bytes):
        return int(value.decode("ascii"))
    return value

encoded = encode(123, custom=encode_bigint_str)
decoded = decode(encoded, custom=decode_bigint_str)
assert_eq(123, decoded)

# --- Dict with int and large int (like bigint) ---
data_bi = {"bi": 123, "i": 123}
encoded = encode(data_bi)
decoded = decode(encoded)
assert_eq(123, decoded["bi"])
assert_eq(123, decoded["i"])

# --- Circular reference ---
data["data"] = data
encoded = encode(data)
decoded = decode(encoded)
assert_eq(decoded, decoded["data"])

# --- Deep chain array (5000) ---
AMOUNT = 5000
chain = ["leaf"]
for _ in range(AMOUNT):
    chain = [chain]

t0 = time.perf_counter()
chain_encoded = encode(chain)
t1 = time.perf_counter()
chain_decoded = decode(chain_encoded)
t2 = time.perf_counter()
for _ in range(AMOUNT):
    chain_decoded = chain_decoded[0]
print(f"encode {AMOUNT} [ recursion ]: {t1-t0:.3f}s")
print(f"decode {AMOUNT} [ recursion ]: {t2-t1:.3f}s")
assert_eq('["leaf"]', str(chain_decoded).replace("'", '"'), "deep array chain")

# --- Deep chain object (5000) ---
chain = {"next": "root"}
for _ in range(AMOUNT):
    chain = {"next": chain}

t0 = time.perf_counter()
chain_encoded = encode(chain)
t1 = time.perf_counter()
chain_decoded = decode(chain_encoded)
t2 = time.perf_counter()
for _ in range(AMOUNT):
    chain_decoded = chain_decoded["next"]
print(f"encode {AMOUNT} {{ recursion }}: {t1-t0:.3f}s")
print(f"decode {AMOUNT} {{ recursion }}: {t2-t1:.3f}s")
assert_eq("root", chain_decoded["next"])

# --- Number boundaries ---
for val in [
    9007199254740991,   # MAX_SAFE_INTEGER
    9007199254740990,
    -9007199254740991,
    2**32 - 1,
    2**16 - 1,
]:
    encoded = encode(val)
    decoded = decode(encoded)
    assert_eq(val, decoded)

# --- Float ---
encoded = encode(1.23)
decoded = decode(encoded)
assert_eq(1.23, decoded)

# --- Large bytes ---
for size in [2**16 - 1, 2**16, 2**20]:
    encoded = encode(bytes(size))
    decoded = decode(encoded)
    assert_eq(size, len(decoded))

# --- toJSON returns self -> null ---
class ToJSONSelf:
    def to_json(self):
        return self
encoded = encode(ToJSONSelf())
decoded = decode(encoded)
assert_eq(None, decoded)

# --- toJSON returns empty dict -> null (in JS); we encode empty dict as {}) ---
class ToJSONEmpty:
    def to_json(self):
        return {}
encoded = encode(ToJSONEmpty())
decoded = decode(encoded)
assert_eq({}, decoded)

# --- toJSON null, has 'a':'ok' ---
class ToJSONNull:
    def to_json(self):
        return None
# In JS they check toJSON and if it returns something else they use it. We don't have 'a' on this object.
# Skip or use dict with to_json that returns dict with a.
class ToJSONDict:
    def to_json(self):
        return {"a": "ok"}
encoded = encode(ToJSONDict())
decoded = decode(encoded)
assert_eq("ok", decoded["a"])

# --- toJSON returns [1,2,3] ---
class ToJSONArray:
    def to_json(self):
        return [1, 2, 3]
encoded = encode(ToJSONArray())
decoded = decode(encoded)
assert_eq("1,2,3", ",".join(map(str, decoded)))

# --- Unserializable (no custom) -> empty dict (we encode __dict__) ---
class Unserializable:
    pass
encoded = encode(Unserializable())
decoded = decode(encoded)
assert_eq({}, decoded)

# --- custom view([1,2,3]) ---
encoded = encode([1, 2, 3], custom=lambda val: view(val) if isinstance(val, (list, tuple)) else val)
decoded = decode(encoded)
assert_eq("1,2,3", ",".join(map(str, decoded)))

# --- Primitives ---
assert_eq(True, decode(encode(True)))
assert_eq(False, decode(encode(False)))
assert_eq(None, decode(encode(None)))
# undefined -> null
encoded = encode(None)  # Python has no undefined; use None
decoded = decode(encoded)
assert_eq(None, decoded)

# --- Output as list, decode ---
encoded = encode([1, 2, 3])
decoded = decode(encoded)
assert_eq("1,2,3", ",".join(map(str, decoded)))

# --- Empty input ---
assert_eq(None, decode(bytes([])))
assert_eq(None, decode([]))

# --- Negative int64 (like -1n) ---
encoded = encode(-1)
decoded = decode(encoded)
assert_eq(-1, decoded)

# --- Object with only method -> empty dict (methods not enumerated) ---
class MethodOnly:
    def method(self):
        pass
encoded = encode(MethodOnly())
decoded = decode(encoded)
assert_eq(0, len(decoded))

# --- encode({}, custom: ()=>1), decode with custom identity -> 1 ---
def custom_one(value):
    return 1
encoded = encode({}, custom=custom_one)
decoded = decode(encoded, custom=lambda x: x)
assert_eq(1, decoded)

# --- encode({}, custom: ()=>123), decode -> 123 ---
encoded = encode({}, custom=lambda _: 123)
decoded = decode(encoded)
assert_eq(123, decoded)

# --- Custom for "symbol" description (like JS Symbol('nope')) ---
class Sym:
    def __init__(self, desc):
        self.description = desc
encoded = encode(Sym("nope"), custom=lambda v: v.description if hasattr(v, "description") else v)
decoded = decode(encoded)
assert_eq("nope", decoded)

# --- Float32Array-like custom ---
import struct

def float32_custom_encode(value):
    if hasattr(value, "__class__") and value.__class__.__name__ == "Float32Array":
        return {"typed": "Float32Array", "view": bytes(value.buffer)}
    return value

def float32_custom_decode(value):
    if isinstance(value, dict) and value.get("typed") == "Float32Array":
        import array
        arr = array.array("f")
        arr.frombytes(value["view"])
        return arr
    return value

class Float32Array:
    def __init__(self, buf):
        self.buffer = buf

encoded = encode(Float32Array(struct.pack("<f", 1.23)), custom=float32_custom_encode)
decoded = decode(encoded, custom=float32_custom_decode)
assert 1.22 <= decoded[0] <= 1.24

# --- Negative and positive int boundaries ---
encoded = encode([-(2**4), -(2**8), -(2**16), -(2**32)])
decoded = decode(encoded)
assert_eq([-(2**4), -(2**8), -(2**16), -(2**32)], decoded)

encoded = encode([2**4, 2**8, 2**16, 2**32])
decoded = decode(encoded)
assert_eq([2**4, 2**8, 2**16, 2**32], decoded)

# --- Empty string ---
assert_eq(1, len(encode("")))
assert_eq("", decode(encode("")))

# --- Array with empty strings ---
assert_eq("a,,,b", ",".join(decode(encode(["a", "", "", "b"]))))

# --- Empty array ---
assert_eq(1, len(encode([])))
assert_eq(0, len(decode(encode([]))))

# --- Empty object ---
assert 1 <= len(encode({}))

# --- Zero and one and string in array ---
assert_eq("0,1,0,a,0,,0,b", ",".join(map(str, decode(encode([0, 1, 0, "a", 0, "", 0, "b"])))))

print("All tests passed.")
