# flatted-view (Python)

This package mirrors the [flatted-view](https://github.com/WebReflection/flatted-view) JavaScript implementation: a binary format with JSON-compatible data at its core, plus recursion-safe graphs like [flatted](https://github.com/WebReflection/flatted). The **core** codec matches the JS wire format for interoperability; **`extras`** adds Python-only extensions for richer round-trips within Python (and MicroPython).

## Status

| Area | State |
| :--- | :--- |
| **Core** (`encode`, `decode`, `view`, `View`) | Implemented — portable payloads aligned with the JS codec (JSON-shaped data, `bytes`/`bytearray`, graphs, optional `custom` / `view` hooks). |
| **Extras** (`flatted_view.extras`) | Implemented — fixed extended `encode` / `decode` for additional Python types (`tuple`, `set`, `frozenset`, `OrderedDict`, `array.array`, `memoryview`, `complex`, `deque`, `BaseException`, `re` patterns, `BytesIO` / binary file reads). Wire tags are **Python-only**; this is not byte-identical to `flatted-view/extras` on the JS side (same role, different language builtins). |

The API surface follows the main project; core behavior tracks the JS codec as it evolves.

## Core vs extras

- **Use the core** when you need **Python ↔ JavaScript** wire compatibility (e.g. Pyodide, workers, services): import `encode` / `decode` from the package root. Tuples are encoded like JSON arrays and **decode as `list`** (JSON has no tuple).
- **Use `extras`** when both ends are Python and you need those extra types to round-trip. `extras.encode` / `extras.decode` wrap the core with a built-in `custom`. You can pass an optional `custom` to `extras.decode` for unknown payloads. Extended values use tags defined for Python, not the JavaScript extras layout.

## Install

Published on PyPI (package name `flatted-view`, import as `flatted_view`):

```bash
pip install flatted-view
```

Package page: **[flatted-view on PyPI](https://pypi.org/project/flatted-view/)**

## Usage

Core:

```python
from flatted_view import encode, decode

payload = {"ok": True, "n": 42}
blob = encode(payload)
assert decode(blob) == payload

# Tuples become lists on decode (JSON-compatible)
assert decode(encode(("a", "b"))) == ["a", "b"]
```

Extras (tuple round-trips as `tuple`; see [`extras.py`](extras.py) for the full list):

```python
from flatted_view import extras

blob = extras.encode(("x", "y", "z"))
assert extras.decode(blob) == ("x", "y", "z")
```

## Tests

From the repository root:

```bash
PYTHONPATH=. python python/test_index.py
PYTHONPATH=. python python/test_extras.py
```

[`test_index.py`](test_index.py) covers the core codec, graphs, and optional `custom` hooks. [`test_extras.py`](test_extras.py) covers extended Python types.

## Relationship to the JS package

This folder is the Python source that ships in the same repository as the npm package. The goal is **wire-compatible** JSON-core payloads between Python and JavaScript so data can cross runtimes (e.g. Pyodide, workers, services) without inventing a second format for the common case. The **`extras`** module is for Python-centric payloads; do not assume interchangeability with `flatted-view/extras` on npm beyond the shared core binary format underneath.
