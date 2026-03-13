import { decode, encode, view } from '../src/extras/index.js';

const blob = new Blob([JSON.stringify({ a: 1 })], { type: 'application/json' });

console.log(decode(await encode(blob)));

debugger;
const file = decode(await encode(new File([blob], 'test.json', { type: blob.type })));
file.text().then(console.log);
