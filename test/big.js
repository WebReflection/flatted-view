import { encode, decode } from '../src/index.js';
import { readFileSync, writeFileSync } from 'fs';

let o = {
  t: true,
  f: false,
  n: null,
  u: undefined,
  uint: 123,
  int: -123,
  uint8: 255,
  uint16: 65535,
  uint32: 4294967295,
  uint64: Number.MAX_SAFE_INTEGER - 1,
  int8: -123,
  int16: -32767,
  int32: -2147483647,
  int64: -Number.MAX_SAFE_INTEGER,
  f64: 123.456,
  s: 'string',
};
let a = [];
o.a = a;
o.o = o;
a.push(o, a);


// JS implementation as source of truth
writeFileSync(import.meta.dirname + '/big.buffer', Buffer.from(encode(o)));
o = decode(new Uint8Array(readFileSync(import.meta.dirname + '/big.buffer')));
a = o.a;

console.assert(o.t === true, 't');
console.assert(o.f === false, 'f');
console.assert(o.n === null, 'n');
console.assert(o.uint === 123, 'uint');
console.assert(o.int === -123, 'int');
console.assert(o.uint8 === 255, 'uint8');
console.assert(o.uint16 === 65535, 'uint16');
console.assert(o.uint32 === 4294967295, 'uint32');
console.assert(o.uint64 === Number.MAX_SAFE_INTEGER - 1, 'uint64');
console.assert(o.int8 === -123, 'int8');
console.assert(o.int16 === -32767, 'int16');
console.assert(o.int32 === -2147483647, 'int32');
console.assert(o.int64 === -Number.MAX_SAFE_INTEGER, 'int64');
console.assert(o.f64 === 123.456, 'f64');
console.assert(o.s === 'string', 's');
console.assert(a.length === 2, 'a');
console.assert(a[0] === o, 'a[0]');
console.assert(a[1] === a, 'a[1]');
console.assert(o.o === o, 'o.o');
