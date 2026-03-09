import { decode, encode } from './index.js';

const data = {
  a: true,
  b: 'hello',
  c: 123,
  d: [1, 2, 3],
  e: { f: 456, g: 'world' }
};

const encoded = encode([true, false]);
console.log(decode(encoded));
