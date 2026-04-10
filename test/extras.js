import Shared from '../src/shared.js';
import { decode, encode, view } from '../src/extras/index.js';

const blob = new Blob([JSON.stringify({ a: 1 })], { type: 'application/json' });

console.assert(JSON.stringify({}) === JSON.stringify(decode(encode({}))));

console.log(decode(await encode(blob)));
console.log(decode(await encode(blob, { set: true, output: new Shared(1024, 24) })));

const file = decode(await encode(new File([blob], 'test.json', { type: blob.type })));
file.text().then(console.log);

decode(await encode(new File([blob], 'test.json', { type: blob.type }), { set: true, output: new Shared(1024, 24) })).text().then(console.log);
