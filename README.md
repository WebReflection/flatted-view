# flatted-view

[![Coverage Status](https://coveralls.io/repos/github/WebReflection/flatted-view/badge.svg?branch=main)](https://coveralls.io/github/WebReflection/flatted-view?branch=main) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/license/MIT)

It's like [flatted](https://github.com/WebReflection/flatted) but with *Uint8Array* and binary data in mind.

It also offers customization of any non supported *JSON* type.

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
| CUSTOM | 11111111 | `[...]` or `new Uint8Array([...])` |

The *custom* callback while *encoding* expects either the same value back (encoded as it is) or an array of *uint8* integers or an actual `Uint8Array` generic view for the representation of the specific value within the output.

The `CUSTOM` type uses 1 byte to signal next bytes are about the *length* and the value stored for that specific custom value.

It is possible to return `encode(any_value)` to simplify serialization of the *custom type* and it's possible to use `decode(view)` while decoding the array buffer to revive the value as it is.


### Numbers

The `NUMBER` type contains the size of the bytes needed to represent the number.

| type | value | bits |
| :--- | :---: | :--: |
| int8  | -128 to 127 | 10000001 |
| int16 | -32768 to 32767 | 10000010 |
| int32 | -2147483648 to 2147483647 | 10000100 |
| int64 | up to [2^53 – 1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) | 10001000 |
| float64 | every floaing point | 10001000 |

It might be useful to combine variants to signal `uint` capability instead, but that's currently not supported (yet), example:

| type | bits |
| :--- | :--: |
| uint8  | 10000011 |
| uint16 | 10000110 |
| uint32 | 10000111 |
| uint64 | 10001100 |

There could be room also for *bigint* as `10001101` and *biguint* as `10001111` but for the time being that's still to be discussed (the current state of numbers is already pretty compact after all).

### Lenght as uint

Each value with a `length` or *x own keys*, such as object literals, stores the type and the length as *uint*.

This is used to store `STRING`, `ARRAY` or `OBJECT` length within the type.

| type | value | bits |
| :--- | :---: | :--: |
| uint8  | 0 to 255 | 0SAO0001 |
| uint16 | 0 to 65535 | 0SAO0010 |
| uint32 | 0 to 4294967295 | 0SAO0100 |
| uint64 | 0 to [2^53 – 1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) | 0SAO1000 |

