// 8 bits combinatory logic to rule them all

// bytes per number (1, 4, 8)
export const L8        = 1 << 0;
export const L16       = 1 << 1;
export const L32       = 1 << 2;
export const L64       = 1 << 3;

// switch (type & ~LEN) case RECURSION: ...
export const LEN       = L8 | L16 | L32 | L64;

// primitive values
export const FALSE     = 0;
export const TRUE      = 1 << 0;
export const NULL      = 1 << 1;

// more complex values (in terms of required amount of bytes)
export const OBJECT    = 1 << 4;
export const ARRAY     = 1 << 5;
export const STRING    = 1 << 6;
export const NUMBER    = 1 << 7;

// recursive types
export const RECURSION = ARRAY | OBJECT | STRING;

// custom type (delegated to toJSON and fromJSON)
export const CUSTOM = RECURSION | NUMBER | LEN;

// RECURSION | (L8 | L16 | L32 | L64) to spefify both recursion type and (uint) index of the value
// STRING | (L8 | L16 | L32 | L64) to spefify both string type and (uint) length
// ARRAY | (L8 | L16 | L32 | L64) to spefify both array type and (uint) length
// OBJECT | (L8 | L16 | L32 | L64) to spefify both object type and (uint) amount of keys

// NUMBER | L8 number of type int8
// NUMBER | L16 number of type int16
// NUMBER | L32 number of type int32
// NUMBER | L64 number of type int too big to fit into int32 of float numbers
