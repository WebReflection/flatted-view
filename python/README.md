# flatted-view (Python)

**Work in progress.** This package mirrors the [flatted-view](https://github.com/WebReflection/flatted-view) JavaScript implementation: a binary format with JSON-compatible data at its core, plus recursion-safe graphs like [flatted](https://github.com/WebReflection/flatted).

## Status

| Area | State |
| :--- | :--- |
| **Core JSON-compatible types** | Implemented — encode/decode round-trips for the portable JSON subset aligned with the JS codec. |
| **Extras** (Python-specific types such as `set`, `tuple`, `BytesIO`, …) | **Not** implemented yet — parity with `flatted-view` extras on the JS side is planned. |

The API surface (`encode`, `decode`, `view`, `View`) matches the direction of the main project; behavior and edge cases may still move slightly as the format hardens.

## Install

Published on PyPI:

```bash
pip install flatted-view
```

Package page: **[flatted-view on PyPI](https://pypi.org/project/flatted-view/)**

## Usage

```python
from flatted_view import encode, decode

payload = {"ok": True, "n": 42}
blob = encode(payload)
assert decode(blob) == payload
```

See `test_index.py` in this directory for runnable checks against the reference logic.

## Relationship to the JS package

This folder is the Python source that ships in the same repository as the npm package. The goal is **wire-compatible** JSON-core payloads between Python and JavaScript so data can cross runtimes (e.g. Pyodide, workers, services) without inventing a second format for the common case.
