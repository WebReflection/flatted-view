// 8 bits combinatory logic to rule them all

// bytes per number (1, 4, 8)
export const L8        = 1 << 0;                   // 00000001
export const L16       = 1 << 1;                   // 00000010
export const L32       = 1 << 2;                   // 00000100
export const L64       = 1 << 3;                   // 00001000

// switch (type & ~LEN) case RECURSION: ...
export const LEN = L8 | L16 | L32 | L64;           // 00001111

// primitive values
export const FALSE     = 0;                        // 00000000
export const TRUE      = 1 << 0;                   // 00000001
export const NULL      = 1 << 1;                   // 00000010

// more complex values (in terms of required amount of bytes)
export const OBJECT    = 1 << 4;                   // 00010000
export const ARRAY     = 1 << 5;                   // 00100000
export const STRING    = 1 << 6;                   // 01000000
export const NUMBER    = 1 << 7;                   // 10000000

// VIEW as UINT8_ARRAY = ARRAY | NUMBER            // 10100000

// recursive types (or encoded and decoded once)
export const RECURSION = ARRAY | OBJECT | STRING;  // 01110000

// custom type (delegated to custom(value) => value | number[] | Uint8Array)
export const CUSTOM = RECURSION | NUMBER | LEN;    // 11111111

// RECURSION | (L8 | L16 | L32 | L64) to spefify both recursion type and (uint) index of the value
// STRING | (L8 | L16 | L32 | L64) to spefify both string type and (uint) length
// ARRAY | (L8 | L16 | L32 | L64) to spefify both array type and (uint) length
// OBJECT | (L8 | L16 | L32 | L64) to spefify both object type and (uint) amount of keys

// NUMBER | L8 number of type int8
// NUMBER | L16 number of type int16
// NUMBER | L32 number of type int32
// NUMBER | L64 number of type float or int too big to fit into int32
