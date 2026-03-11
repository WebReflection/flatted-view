import { Shared, encode, decode, view } from '../src/index.js';
import { ASCII } from './utils.js';

const assert = (expected, actual) => {
  if (expected !== actual) {
    console.error('Expected', expected, 'but got', actual);
    throw new Error('Assertion failed');
  }
};

let v = new Uint8Array([1, 2, 3]);

const data = {
  a: true,
  b: 'hello',
  c: 123,
  d: [1, 2, 3],
  e: { f: 456, g: 'world' },
  v
};

let encoded = encode(data);
let decoded = decode(encoded);

assert(decoded.a, true);
assert(decoded.b, 'hello');
assert(decoded.c, 123);
assert([1, 2, 3].join(','), decoded.d.join(','));
assert(decoded.e.f, 456);
assert(decoded.e.g, 'world');
assert(v.join(','), decoded.v.join(','));

encoded = encode(['a', 'b', 'a']);
decoded = decode(encoded);

assert(['a', 'b', 'a'].join(','), decoded.join(','));

encoded = encode(v);
decoded = decode(encoded);

assert(v.join(','), decoded.join(','));

encoded = encode(123n, {
  custom(value) {
    if (typeof value === 'bigint')
      return ASCII.encode(value.toString());
    return value;
  }
});

decoded = decode(encoded, {
  custom(value) {
    return BigInt(ASCII.decode(value));
  }
});

assert(123n, decoded);

encoded = encode({
  bi: 123n,
  i: 123
});

decoded = decode(encoded);

assert(123n, decoded.bi);
assert(123, decoded.i);

data.data = data;

encoded = encode(data);
decoded = decode(encoded);

assert(decoded, decoded.data);

const AMOUNT = 5000;

let chain = ['leaf'];

for (let i = 0; i < AMOUNT; i++) chain = [chain];

console.time(`encode ${AMOUNT} [ recursion ]`);
chain = encode(chain);
console.timeEnd(`encode ${AMOUNT} [ recursion ]`);

console.time(`decode ${AMOUNT} [ recursion ]`);
chain = decode(chain);
console.timeEnd(`decode ${AMOUNT} [ recursion ]`);

for (let i = 0; i < AMOUNT; i++) chain = chain[0];

assert(JSON.stringify(chain), JSON.stringify(['leaf']));

chain = { next: 'root' };

for (let i = 0; i < AMOUNT; i++) chain = { next: chain };

console.time(`encode ${AMOUNT} { recursion }`);
chain = encode(chain);
console.timeEnd(`encode ${AMOUNT} { recursion }`);

console.time(`decode ${AMOUNT} { recursion }`);
chain = decode(chain);
console.timeEnd(`decode ${AMOUNT} { recursion }`);

for (let i = 0; i < AMOUNT; i++) chain = chain.next

assert(chain.next, 'root');

encoded = encode(Number.MAX_SAFE_INTEGER);
decoded = decode(encoded);

assert(Number.MAX_SAFE_INTEGER, decoded);

encoded = encode(Number.MAX_SAFE_INTEGER - 1);
decoded = decode(encoded);

assert(Number.MAX_SAFE_INTEGER - 1, decoded);

encoded = encode(-Number.MAX_SAFE_INTEGER);
decoded = decode(encoded);

assert(-Number.MAX_SAFE_INTEGER, decoded);

encoded = encode(2 ** 32 - 1);
decoded = decode(encoded);

assert(2 ** 32 - 1, decoded);

encoded = encode(2 ** 16 - 1);
decoded = decode(encoded);

assert(2 ** 16 - 1, decoded);

encoded = encode(1.23);
decoded = decode(encoded);

assert(1.23, decoded);

encoded = encode(new Uint8Array(2 ** 16 - 1));
decoded = decode(encoded);

assert(2 ** 16 - 1, decoded.length);

encoded = encode(new Uint8Array(2 ** 16));
decoded = decode(encoded);

assert(2 ** 16, decoded.length);

encoded = encode(new Uint8Array(2 ** 20));
decoded = decode(encoded);

assert(2 ** 20, decoded.length);

encoded = encode({ toJSON() { return this } });
decoded = decode(encoded);

assert(null, decoded);

encoded = encode({ toJSON() {} });
decoded = decode(encoded);

assert(null, decoded);

encoded = encode({ a: 'ok', toJSON: null });
decoded = decode(encoded);

assert('ok', decoded.a);

encoded = encode({ toJSON() { return [1, 2, 3] } });
decoded = decode(encoded);

assert([1, 2, 3].join(','), decoded.join(','));

encoded = encode(Symbol('nope'));
decoded = decode(encoded);

assert(null, decoded);

encoded = encode([1, 2, 3], {
  custom: value => view(value)
});

decoded = decode(encoded);

assert([1, 2, 3].join(','), decoded.join(','));

encoded = encode(true);
decoded = decode(encoded);

assert(true, decoded);

encoded = encode(false);
decoded = decode(encoded);

assert(false, decoded);

encoded = encode(null);
decoded = decode(encoded);

assert(null, decoded);

encoded = encode(undefined);
decoded = decode(encoded);

assert(null, decoded);

encoded = new Uint8Array(encode([1, 2, 3]));
decoded = decode(encoded);

assert([1, 2, 3].join(','), decoded.join(','));

assert(undefined, decode([]));

encoded = encode(-1n);
decoded = decode(encoded);

assert(-1n, decoded);

encoded = encode({ method() {} });
decoded = decode(encoded);

assert(Object.keys(decoded).length, 0);

encoded = encode({}, {
  custom: () => 1,
});
decoded = decode(encoded, {
  custom: value => value,
});

assert(1, decoded);

encoded = encode({}, {
  custom: () => 123,
});
decoded = decode(encoded);

assert(123, decoded);

encoded = encode(Symbol('nope'), {
  custom: value => value.description,
});
decoded = decode(encoded);

assert('nope', decoded);

encoded = encode(new Float32Array([1.23]), {
  custom(value) {
    if (value instanceof Float32Array)
      return { typed: 'Float32Array', view: new Uint8Array(value.buffer) }
    return value;
  }
});

decoded = decode(encoded, {
  custom(value) {
    if (typeof value === 'object' && typeof value?.typed === 'string')
      value = new globalThis[value.typed](value.view.buffer);
    return value;
  }
});

assert(true, decoded instanceof Float32Array);
assert('1.23', decoded[0].toFixed(2));


encoded = encode([-(2 ** 4), -(2 ** 8), -(2 ** 16), -(2 ** 32)]);
decoded = decode(encoded);

assert([-(2 ** 4), -(2 ** 8), -(2 ** 16), -(2 ** 32)].join(','), decoded.join(','));

encoded = encode([2 ** 4, 2 ** 8, 2 ** 16, 2 ** 32]);
decoded = decode(encoded);

assert([2 ** 4, 2 ** 8, 2 ** 16, 2 ** 32].join(','), decoded.join(','));

encoded = encode([2 ** 4, 2 ** 8, 2 ** 16, 2 ** 32]);
decoded = decode(encoded);

assert([2 ** 4, 2 ** 8, 2 ** 16, 2 ** 32].join(','), decoded.join(','));

const shared = new Shared(new SharedArrayBuffer(8, { maxByteLength: 2 ** 8 }), 4);

encoded = encode([1, 2, 3, 4, 5, 6, 7, 8], { output: shared });
decoded = decode(encoded);

assert([1, 2, 3, 4, 5, 6, 7, 8].join(','), decoded.join(','));

encoded = encode([1, 2, 3, 4], { output: shared.reset() });
decoded = decode(encoded);

assert([1, 2, 3, 4].join(','), decoded.join(','));
