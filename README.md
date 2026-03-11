# flatted-view

[![Coverage Status](https://coveralls.io/repos/github/WebReflection/flatted-view/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/flatted-view?branch=main) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/license/MIT)

It's like [flatted](https://github.com/WebReflection/flatted) but with *Uint8Array* and binary data in mind, with broader support for `bigint` and `Uint8Array` views plus *custom types* to satisfy any need.

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
    // int64 (accordingly to JS number type)
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

## Features

| feature | description |
| :--- | :--: |
| fast | smart cache and battle-tested logic |
| recursion (stack based) | 5K nested arrays or literals? not a problem! |
| bigint | compatible out of the box |
| custom types | add any type you like, no fuss attached |
| compact outcome | types and lengths are embedded and optimized |
| binary format | works for *SharedArrayBuffer* too |
| `toJSON` | compatible with legacy `toJSON` behavior |
| cross PL | *WIP* - will work on *Python* and others soon |


## Supported Types

All JSON-compatible types are supported, plus more:

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

The `custom` optional callback can return either any value or a `view(number[] | Uint8Array)` value that will be directly converted as such.

When the `view(...)` utility is **not** used, the returned value is encoded via `encode(value)` so that it fits into the current `output`.

### Recursion

The only types allowed to be recursive are `ARRAY`, `STRING` and `OBJECT`.

Each of those variants is parsed only once (by reference).

The reason `NUMBER` is not recursive is that storing numbers inline takes less space than creating a separate number table, especially since small integers are the norm and floating-point values are rarely duplicated.

If your custom handler receives a value with `typeof value === 'object'`, rest assured that is the only time you will see that reference; it must return something serializable once, and that result is reused for any later occurrence.

### Serializables (encoding)

Anything JSON-compatible survives encoding and decoding. The `custom(value)` callback lets you define a specific return type for a given value without dictating how or what that should be.

Use `view(value)` to return an array of `uint8` values or a `Uint8Array` view of your own data. If you prefer a different encoding, you can still define any custom type—including `Map`, `Set`, and others.

### Numbers

The `NUMBER` type contains within itself the number *type* and bytes needed to represent the next entries.

| type | bits | value |
| :--- | :---: | :--: |
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

All variants are meant to signal the "*next move*" for the *decoder* so that it's clear what's needed to be parsed.

This is achieved by combining `OBJECT`, `ARRAY`, or `STRING` with the number of bytes needed to retrieve a *length* (for key/value pairs, or for the array or string).

The `CUSTOM` type becomes `11111111` when the value returned by `custom(value)` was encoded implicitly, as opposed to returning a `view(...)`.

The `NUMBER` type embeds the byte length in its type as well, so the format stays compact for every supported type.

So a number that fits in a single byte uses 2 bytes total; 16-bit values use 3 bytes, 32-bit values use 5 bytes, and floating-point or 64-bit (including *bigint*) values use 9 bytes.

If you need to improve performance or space around specific views that are not `Uint8Array` kind, you can use the `custom(value)` entry point to do so, example:

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

## Encoding in details

```js
NUMERIC_ONLY = NUMBER | RECURSION
// always 1 byte + bytes needed to represent it
[NUMERIC_ONLY | u/int8, byte]
[NUMERIC_ONLY | u/int16, ...[byte, byte]]
[NUMERIC_ONLY | u/int32, ...[byte, byte, byte, byte]]
[NUMERIC_ONLY | u/int64 | float | bigint, ...[byte, byte, byte, byte, byte, byte, byte, byte]]

// STRING are the same as NUMERIC_ONLY for the length + UTF8 bytes
[STRING | size, ...size_bytes, ...utf8_chars]

// ARRAY are the same as NUMERIC_ONLY for the length + bytes per entry
[ARRAY | size, ...size_bytes, ...array_entries]

// // ARRAY are the same as NUMERIC_ONLY for the key/value pairs + bytes per entry
```
