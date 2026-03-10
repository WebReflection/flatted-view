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

The `NUMBER` type contains within itself the number *type* and bytes needed to represent the next entries.

| type | value | bits |
| :--- | :---: | :--: |
| int8  | -128 to 127 | 10000001 |
| int16 | -32768 to 32767 | 10000010 |
| int32 | -2147483648 to 2147483647 | 10000100 |
| int64 | up to [2^53 – 1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) | 10001000 |
| uint8  | 0 to 255 | 10000011 |
| uint16 | 0 to 65535 | 10000110 |
| uint32 | 0 to 4294967295 | 10000111 |
| uint64 | 0 to [2^53 – 1](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER) | 10001100 |
| float64 | every floaing point | 10001000 |
