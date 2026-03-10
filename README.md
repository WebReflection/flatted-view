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
const decoded = decode(data);
// that's it 👍
```

## Features

| feature | status |
| :--- | :--: |
| fast | ✅ |
| recursive (stack based) | ✅ |
| bigint | ✅ |
| custom types | ✅ |
| compact outcome | ✅ |
| binary format | ✅ |
| `toJSON` | ✅ |
| cross PL | *WIP* |


## Supported Types

| type | bits | value |
| :--- | :--: | :---: |
| FALSE | 00000000 | `false` |
| TRUE  | 00000001 | `true` |
| NULL  | 00000010 | `null` |
| OBJECT | 00010000 | `{...}` |
| ARRAY | 00100000 | `[...]` |
| STRING | 01000000 | `"..."` |
| NUMBER | 10000000 | *int* or *float* |
| VIEW | 10100000 | `new Uint8Array([...])` |
| RECURSION | 01110000 | 🔁 |
| CUSTOM | 11111110 | value returned as `view(...)` or directly |

The `custom` optional callback can return either any value or a `view(number[] | Uint8Array)` value that will be directly converted as such.

When the `view(...)` utility is **not** used, the returned value will be encoded via `encode(value)` out of the box, to produce a flatted entry that could fit into the current `output`.

### Numbers

The `NUMBER` type contains within itself the number *type* and bytes needed to represent the next entries.

| type | bits | value |
| :--- | :---: | :--: |
| int8  | 10000001 | -128 to 127 |
| int16 | 10000010 | -32768 to 32767 |
| int32 | 10000100 | -2147483648 to 2147483647 |
| int64 | 10001000 | up to [2^53 – 1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) |
| uint8  | 10000011 | 0 to 255 |
| uint16 | 10000110 | 0 to 65535 |
| uint32 | 10000111 | 0 to 4294967295 |
| uint64 | 10001100 | 0 to [2^53 – 1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) |
| float64 | 10001000 | every floaing point |

#### Variants

All variants are meant to signal the "*next move*" for the *decoder* so that it's clear what's needed to be parsed.

This is achieved via combining `OBJECT`, `ARRAY`, `STRING` or with the next amount of bytes needed to retrive a *length* for either the amount of *key/value* pairs or the *length* of the array or string.

The `CUSTOM` type becomes `11111111` when the sonversion of the returned `custom(value)` was implicit, as opposite of returning a `view(...)`.

The `NUMBER` type embeds the amount of needed bytes within its type too, making this module more compact than needed for every supported type.

This also means for a generic number that would fit into a single *byte*, 2 bytes will be used, 3 for 16 bits and 5 for any 32 bit value. 9 is the amount of bytes needed for floating points or 64 bits, including *bigint*, values.

If you need to improve performance or space around specific views that are not `Uint8Array` kind, you can use the `custom(value)` entry point to do so, example:

```js
const encoded = encode(ref, {
  custom(value) {
    if (value instanceof Float32Array)
      return { typed: 'Float32Array', view: new Uint8Array(value.buffer) }
    return value;
  }
});

const decoded = decode(view, {
  custom(value) {
    if (typeof value === 'object' && typeof value?.typed === 'string')
      value = new globalThis[value.typed](value.view.buffer);
    return value;
  }
});
```

This example shows a creative, ad-hoc, way to hook yourself into the `custom(value)` logic, preserving more complex values/references from the original encoder of the state.
