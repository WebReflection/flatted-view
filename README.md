# flatted-view

[![Coverage Status](https://coveralls.io/repos/github/WebReflection/flatted-view/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/flatted-view?branch=main) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/license/MIT)

<sup>**Social Media Photo by [Sebastian Schuster](https://unsplash.com/@sschusterphotoart) on [Unsplash](https://unsplash.com/)**</sup>

**JSON-shaped data, binary on the wire, graphs that don’t explode.** [flatted](https://github.com/WebReflection/flatted) proved you can ship circular structures as portable JSON; *flatted-view* carries that idea into **bytes**—`Uint8Array` views, `bigint`, symbols, optional hooks for anything weirder, and a path to **growable `SharedArrayBuffer`** so workers and WASM can share payloads without an extra “allocate, then copy” memory spike.

If you move structured state across threads, into WASM, or over the network and want **one format** that stays close to JSON semantics yet speaks **binary**, this is meant for you.

The package ships two entry points:

- **`flatted-view`** — core encoder/decoder: JSON-compatible values, `bigint`, `Uint8Array`, **symbols**, recursion-safe graphs, your own **`custom`** / **`view`** hooks, and the **`Shared`** helper for **growable** shared/resizable buffers (see below).
- **`flatted-view/extras`** — same API shape, but wraps the core with a built-in **`custom`** implementation that understands **TypedArray** (other than `Uint8Array`), **ArrayBuffer**, **Date**, **Map**, **Set**, **RegExp**, **Error**, **File**, **Blob**, and **ImageData** (when `globalThis.ImageData` exists).

```js
import { decode, encode, view } from 'https://esm.run/flatted-view';

const data = {
  nope: false,
  sure: true,
  nil: null,
  object: { o: 'k' },
  array: [ 'also', 'ok' ],
  string: '👍',
  view: new Uint8Array([1, 2, 3]),
  numbers: [
    // int8
    -128, 0, 127,
    // uint8
    0, 255,
    // int16
    -32768, 0, 32767,
    // uint16
    0, 65535,
    // int32
    -2147483648, 0, 2147483647,
    // uint32
    0, 4294967295,
    // int64 (according to JS number type)
    -9007199254740992, 0, 9007199254740991,
    // bigint
    -9223372036854775808n, 0n, 9223372036854775807n,
    // biguint
    0n, 18446744073709551615n
  ],
};

const encoded = encode(data);
const decoded = decode(encoded);
// that's it 👍
```

Extras example (TypedArray, `Map`, `Blob`, etc.):

```js
import { decode, encode } from 'https://esm.run/flatted-view/extras';

const map = new Map([['a', 1], ['b', 2]]);
const roundTrip = decode(encode(map));
// Map with the same entries

// Blob body is read asynchronously — encode may return a Promise<Uint8Array | number[] | Shared>
const blob = new Blob([JSON.stringify({ ok: true })], { type: 'application/json' });
const out = await encode(blob);
decode(out);
```

### Project status — you’re invited

This module is **young**: the core format and APIs are stable enough to **build on**, but edge cases, ergonomics, and “extras” on other runtimes will keep evolving. **Try it in side projects, fuzz it, wrap it from Pyodide or your bundler, or throw generated clients at it** — real usage is what turns rough corners into issues we can fix.

If something breaks, surprises you, or feels under-documented, **open an issue** or drop a PR. The same goes if you’re using **assistive tooling** (including AI) to explore the API: feedback from those workflows still helps tighten examples and behavior.

To test cross *PL* compatibility, see [MicroPython Live Demo](./test/micropython/), based on [PyScript](https://pyscript.net/) remote packages feature. A [Python](./python/) implementation targets the **same JSON-compatible core** on the wire.

## Features

| feature | description |
| :--- | :--: |
| fast | tight loops, reference caching, and format tuned for real payloads |
| recursion (stack based) | 5K nested arrays or literals? not a problem! |
| bigint | compatible out of the box |
| symbols (core) | well-known, `Symbol.for`, and local symbols round-trip |
| custom types | add any type you like, no fuss attached |
| extras types | TypedArray, ArrayBuffer, Date, Map, Set, RegExp, Error, File, Blob, ImageData |
| compact outcome | types and lengths are embedded and optimized |
| binary format | works for *SharedArrayBuffer* too |
| **`Shared` + `set: true`** | encode **into** a growable buffer in one pass: virtual length, **64 KiB** page growth (same as WASM), no extra copy peak |
| `toJSON` | when `json` is `true` (default), objects with `toJSON` use legacy behavior; pass **`json: false`** on **`encode`** to skip that and encode the live object graph instead |
| **`fn` (encode only)** | by default, **functions** are dropped (properties omitted, standalone `encode(fn)` → `undefined`). Pass **`fn: true`** on **`encode`** so each function is passed to **`custom(fn)`** and can be replaced or encoded via **`view(...)`**; there is no `fn` option on **`decode`** |
| cross PL | *Python* variant [available](./python/) |

## Entry points

| import | purpose |
| :--- | :--- |
| `flatted-view` | Core: JSON types, `bigint`, `Uint8Array`, symbols, optional **`fn`** (**encode** only; enables `custom` for functions) / **`json`** (default `true`; set `false` to disable `toJSON`) / `custom` / `view` |
| `flatted-view/extras` | Core plus built-in encoding for extra built-ins (see table below). Uses a fixed internal `custom` — you cannot pass your own `custom` through this wrapper; use the core package if you need a fully user-defined `custom`. |

### The `Shared` class (`set: true`)

The main export **`Shared`** is a small **`Uint8Array`** subclass meant to sit on top of a **growable** **`SharedArrayBuffer`** or **resizable `ArrayBuffer`**. It exists so encode/decode stay **view-first** without forcing everything through a plain `number[]`.

- **Virtual `.length`** — The instance tracks how many bytes are logically written (`this._`). That value is what the encoder treats as the end of the payload, so you do not run past meaningful data or fight the underlying slab’s larger `byteLength`. You can reset `.length` and reuse the same backing memory for another run.
- **`set: true` + `output: shared`** — When **`encode`** is called with **`set: true`** and **`output`** is a **`Shared`** instance, writes go **straight into that buffer** via **`set`** / **`push`** semantics: no separate “allocate full size, then copy” step. That matters because a growable buffer can only **grow**; the naive alternative is to materialize a second buffer and copy into it, which briefly needs **roughly twice the RAM** for the same payload.
- **Page growth** — If a write would exceed the current view window, the backing buffer is grown in **64 KiB (2¹⁶) byte** steps (aligned to a page boundary), the same **page size** used by **WebAssembly** linear memory. Growth is capped by the buffer’s **`maxByteLength`**.

```js
import { Shared, encode, decode } from 'https://esm.run/flatted-view';

const sab = new SharedArrayBuffer(8, { maxByteLength: 2 ** 20 });
const out = new Shared(sab);
encode({ ok: true }, { output: out, set: true });
decode(out); // decoder accepts this `Shared` view; logical length is the virtual `.length`
```

Plain **`number[]`** or **`Uint8Array`** outputs are still fine when you do not need shared or growable semantics.

## Supported types

All JSON-compatible types are supported in the core package, plus more:

| type | bits | value |
| :--- | :--: | :---: |
| FALSE | `00000000` | `false` |
| TRUE  | `00000001` | `true` |
| NULL  | `00000010` | `null` |
| OBJECT | `00010000` | `{...}` |
| ARRAY | `00100000` | `[...]` |
| STRING | `01000000` | `"..."` |
| NUMBER | `10000000` | *int* or *float* or *bigint* |
| VIEW | `10100000` | `new Uint8Array([...])` |
| RECURSION | `01110000` | 🔁 |
| CUSTOM | `11111110` | value returned as `view(...)` or directly |

### Extras-built-in types (via `flatted-view/extras`)

These are not special-cased in the bit table; they are normalized to tagged arrays or `view(...)` payloads by the extras `custom` handler, then decoded back in `extras`’ decode.

| kind | encoding idea |
| :--- | :--- |
| **TypedArray** (not `Uint8Array`) | constructor name + backing buffer, byte offset, optional length |
| **ArrayBuffer** | wrapped as bytes |
| **Date** | ISO string in a tagged structure |
| **Map** / **Set** | size + entries |
| **RegExp** | source + flags |
| **Error** | constructor name, message, stack |
| **File** / **Blob** | metadata + bytes (Blob/`File` may make `encode` **async** because `arrayBuffer()` is async) |
| **ImageData** | pixel data + dimensions + color space / pixel format when available |

### The `custom` callback and `view()`

You can pass **`custom(value)`** in **`encode`** options (core package). It runs before default object/array/`Uint8Array` handling:

1. **No change** — If `custom(value) === value`, encoding continues with the normal rules: optional **`toJSON`** (only when **`json`** is not `false`), then arrays, plain objects, `Uint8Array`, etc.
2. **Replacement value** — If `custom` returns something else, that return value is encoded **instead of** walking the original value again for that step.

How the replacement is encoded depends on what you return:

- **`view(number[] | Uint8Array)`** — The encoder writes a **CUSTOM** block whose **payload is exactly those bytes** (plus the usual framing). Those bytes are **not** interpreted as a nested value graph on the main encoder stack. That is how you can inject **pre-serialized** data without hitting the same recursion/stack machinery used for nested objects and arrays. Use this when you already flattened a subtree to bytes (or when you want a single opaque blob).
- **Any other value** — The encoder calls **`encode(returnedValue, …)`** again on that value (same options), so the result participates in the normal stack-based walk. That is appropriate when you return a plain array or object “view model” of your value.

The optional **`decode`** hook is **`custom(value, fromView)`**. The second argument tells you how **`value`** was produced:

- **`fromView === false`** — The value was **stack-decoded** already (the normal graph walk). There is usually nothing to “unwrap”; you can return **`value`** as-is unless you still want to normalize it.
- **`fromView === true`** — The value is the CUSTOM **payload from a `view(...)` encode** (opaque nested encoding). This is where you **counter-revive** whatever you put on the wire during **`encode`**’s `custom` / **`view`**: decode the inner shape, rebuild class instances, etc.

So the decode **`custom`** handler always knows whether it is seeing a **view payload** or an **already-resolved** value.

When the `view(...)` utility is **not** used for a replacement, the returned value is encoded via `encode(value)` so that it fits into the current `output`.

### Functions and the `fn` option (**encode** only)

The **`fn`** flag exists only on **`encode`** options — **`decode`** has no corresponding switch. Out of the box, functions are treated like values you do not want on the wire: **function** properties on objects are **skipped** (same as `undefined`), and encoding a **standalone** function yields **`undefined`**.

With **`fn: true`**, the encoder **stops discarding** functions and instead runs your **`custom(fn)`** for each one, so you can replace a function with a serializable stand-in or a **`view(...)`** payload. If **`custom` returns the same function reference**, the format stores **`null`**. If **`custom` returns something else**, that value is encoded like any other replacement (including **`view(...)`** as above).

### Recursion

The only types allowed to be recursive are `ARRAY`, `STRING` and `OBJECT`.

Each of those variants is parsed only once (by reference).

The reason `NUMBER` is not recursive is that storing numbers inline takes less space than creating a separate number table, especially since small integers are the norm and floating-point values are rarely duplicated.

If your custom handler receives a value with `typeof value === 'object'`, rest assured that is the only time you will see that reference; it must return something serializable once, and that result is reused for any later occurrence.

### Serializables (encoding)

Anything JSON-compatible survives encoding and decoding. The `custom(value)` callback lets you define a specific return type for a given value without dictating how or what that should be.

By default, objects that implement **`toJSON`** are serialized through that method (like `JSON.stringify`). To encode the **actual** object instead (e.g. preserve non-JSON fields the method would drop), pass **`json: false`** to **`encode`**.

Use `view(value)` to return an array of `uint8` values or a `Uint8Array` view of your own data. If you prefer a different encoding, you can still define any custom type—including `Map`, `Set`, and others (or use **`flatted-view/extras`** for many built-ins).

### Numbers

The `NUMBER` type embeds the number *type* and the bytes needed to represent the next entries.

| type | bits | value |
| :--- | :--: | :--: |
| int8  | `10000001` | -128 to 127 |
| int16 | `10000010` | -32768 to 32767 |
| int32 | `10000100` | -2147483648 to 2147483647 |
| int64 | `10001000` | up to [2^53 – 1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) |
| uint8  | `10000011` | 0 to 255 |
| uint16 | `10000110` | 0 to 65535 |
| uint32 | `10000111` | 0 to 4294967295 |
| uint64 | `10001100` | 0 to [2^53 – 1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) |
| float64 | `10001000` | every floating point |

#### Variants

All variants are meant to signal the "*next move*" for the *decoder* so that it's clear what needs to be parsed.

This is achieved by combining `OBJECT`, `ARRAY`, or `STRING` with the number of bytes needed to retrieve a *length* (for key/value pairs, or for the array or string).

The `CUSTOM` type becomes `11111111` when the value returned by `custom(value)` was encoded implicitly, as opposed to returning a `view(...)`.

The `NUMBER` type embeds the byte length in its type as well, so the format stays compact for every supported type.

So a number that fits in a single byte uses 2 bytes total; 16-bit values use 3 bytes, 32-bit values use 5 bytes, and floating-point or 64-bit (including *bigint*) values use 9 bytes.

If you need to improve performance or size for specific views that are not `Uint8Array`, you can use the `custom(value)` hook; for example:

```js
import { encode, decode } from 'https://esm.run/flatted-view';

const serialize = (name, details) => ({ '🔐': [name, details] });

const encoded = encode(data, {
  custom(value) {
    if (value instanceof ArrayBuffer)
      return serialize('ArrayBuffer', new Uint8Array(value));

    if (ArrayBuffer.isView(value)) {
      const { BYTES_PER_ELEMENT, byteOffset, buffer, length } = value;
      const args = [new Uint8Array(buffer), byteOffset];
      if ((buffer.byteLength - byteOffset) / BYTES_PER_ELEMENT)
        args.push(length);
      return serialize(value.constructor.name, args);
    }

    return value;
  }
});

const decoded = decode(encoded, {
  custom(value) {
    if (typeof value === 'object' && '🔐' in value) {
      const [name, args] = value['🔐'];
      if (name === 'ArrayBuffer')
        return args.buffer;

      const View = globalThis[name];
      args[0] = args[0].buffer;
      return new View(...args);
    }
    return value;
  }
});
```

This example shows a practical way to hook into the `custom(value)` logic and preserve complex values or references from the encoded state.

## About Encoding

```js
// all direct or empty types require a single byte

[FALSE]       // false
[TRUE]        // true
[NULL]        // null
[NUMBER]      // 0
[OBJECT]      // {}
[ARRAY]       // []
[STRING]      // ''
[VIEW]        // new Uint8Array(0)
[RECURSION]   // at position 0

// custom takes a prefix byte to signal
// the next value is a custom one

[CUSTOM]      // for views returned directly
[CUSTOM | 1]  // for automatically encoded/decoded values

// numbers different from 0 use 2 to 9 bytes
NUMERIC_ONLY = NUMBER | RECURSION

[NUMERIC_ONLY | u/int8, byte]
[NUMERIC_ONLY | u/int16, ...[byte, byte]]
[NUMERIC_ONLY | u/int32, ...[byte, byte, byte, byte]]
[NUMERIC_ONLY | u/int64 | bigu/int | float, ...[byte, byte, byte, byte, byte, byte, byte, byte]]

// STRING are the same as NUMERIC_ONLY for the length + UTF8 bytes
[STRING | size, ...size_bytes, ...utf8_chars]

// ARRAY are the same as NUMERIC_ONLY for the length + bytes per entry
[ARRAY | size, ...size_bytes, ...array_entries]

// // ARRAY are the same as NUMERIC_ONLY for the key/value pairs + bytes per entry
[OBJECT | kv_size, ...kv_size_bytes, ...kv_pairs]
```

### About Technical Choices

  * **why are strings recursive?**
    * because homogeneous collections are pretty common for anything *RESTful* so you get the automatic packing of same keys per row out of the box (background: [JSONH](https://github.com/WebReflection/JSONH#readme))
    * because that works well in [flatted](https://github.com/WebReflection/flatted#readme) so I just brought in what 500M+ downloads per month believe is a good way to "*pack*" generic data
    * because [TextEncoder](https://github.com/whatwg/encoding/issues/343) is slow so once any cache is needed/used to avoid encoding same string twice, there's an opportunity to make it just recursive, as that takes *O(1)* to retrieve
  * **why are numbers so different?**
    * in *JSON* there is just `number` and nothing else, that includes floating-point numbers and signed or unsigned integers and that worked well for a long time except they had to patch *JSON* to also support the `bigint` primitive. In *flatted*, *bigints* are not supported, but because here we target *binary* data it made little sense not to support `bigint` as well, where negative *bigints* are stored as such and any positive *bigint* is stored as [setBigUint64](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView/setBigUint64)
    * in *JS* numbers are numbers, here it's just convenient to have the ability to use a single byte for both types with a length attached or numbers so that `-128` to `255` take only a single byte to store, besides the kind of the entry being resolved: compactness
  * **why only one view type is supported?**
    * because [Uint8Array is special](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array#description) and it can carry or represent any other view
    * because anything that produces a *view* is usually producing a *Uint8Array*
    * because with *custom* types (or **`flatted-view/extras`**) one can reproduce anything else if, or when, needed
  * **what about symbols?**
    * the core codec encodes **symbols** directly (well-known symbols, registered symbols via `Symbol.for`, and local symbols with descriptions). You can still use **`custom`** if you need a different string form or non-symbol output on the wire

---

**Build something with it.** If flatted-view saves you a copy, a conversion, or a headache, or if it doesn’t—say so. Early adopters (and early experiments) are how this gets better.
