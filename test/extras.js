import Shared from '../src/shared.js';
import { decode, encode, view } from '../src/extras/index.js';
import assert from './assert.js';

const blob = new Blob([JSON.stringify({ a: 1 })], { type: 'application/json' });

assert(JSON.stringify({}), JSON.stringify(decode(encode({}))));

console.log(decode(await encode(blob)));
console.log(decode(await encode(blob, { set: true, output: new Shared(new SharedArrayBuffer(128, { maxByteLength: 2 ** 8 }), 24) })));

const file = decode(await encode(new File([blob], 'test.json', { type: blob.type })));
file.text().then(value => {
  assert(value, JSON.stringify({ a: 1 }));
});

decode(await encode(new File([blob], 'test.json', { type: blob.type }), { set: true, output: new Shared(1024, 24) })).text().then(value => {
  assert(value, JSON.stringify({ a: 1 }));
});

class F32 extends Float32Array {
  [Symbol.toStringTag] = 'F32';
  constructor(...args) {
    // not sure why this is even needed ...
    super(...args);
  }
}

let typed = new F32(new ArrayBuffer(12), 4, 1);
typed[0] = 1.2300000190734863;

assert(typed.byteOffset, 4);
assert(typed.length, 1);
assert(typed[0], 1.2300000190734863);

typed = decode(encode(typed));

console.log(typed);

assert(typed.byteOffset, 4);
assert(typed.length, 1);
assert(typed[0], 1.2300000190734863);

typed = decode(encode(typed.buffer));

assert(typed.byteLength, 12);

assert(decode(encode(new Uint8Array(typed))).length, 12);

typed = new Float32Array(new ArrayBuffer(4));
typed[0] = 1.2300000190734863;

typed = decode(encode(typed));

assert(typed.byteOffset, 0);
assert(typed.length, 1);
assert(typed[0], 1.2300000190734863);

typed = new Float32Array(new ArrayBuffer(8), 0, 1);
typed[0] = 1.2300000190734863;

typed = decode(encode(typed));

assert(typed.byteOffset, 0);
assert(typed.length, 1);
assert(typed[0], 1.2300000190734863);

let date = new Date;
date = decode(encode(date));

assert(decode(encode(date)).toISOString(), date.toISOString());

let map = new Map;
map.set('a', 1);
map.set('b', 2);
map.set('c', 3);

console.log(map);
console.log(decode(encode(map)));

assert(decode(encode(map)).size, 3);
assert(decode(encode(map)).get('a'), 1);
assert(decode(encode(map)).get('b'), 2);
assert(decode(encode(map)).get('c'), 3);

let set = new Set;
set.add(1);
set.add(2);
set.add(3);

assert(decode(encode(set)).size, 3);
assert(decode(encode(set)).has(1), true);
assert(decode(encode(set)).has(2), true);
assert(decode(encode(set)).has(3), true);

assert(decode(encode([1,2])).join(','), [1,2].join(','));

let error = new Error('test');
error = decode(encode(error));

assert(error.name, 'Error');
assert(error.message, 'test');
assert(error.stack, error.stack);

let regexp = /test/g;
regexp = decode(encode(regexp));

assert(regexp.source, 'test');
assert(regexp.flags, 'g');
