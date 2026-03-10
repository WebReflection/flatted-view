import { FALSE, TRUE, NULL, NUMBER, STRING, ARRAY, OBJECT, RECURSION, CUSTOM } from './constants.js';
import { L8, L16, L32, LEN } from './constants.js';

import { isArray, dv, v8 } from './utils.js';

const decoder = new TextDecoder;

export const decode = view => loop(isArray(view) ? new Uint8Array(view) : view, new Map, { i: 0 });

const floating = (o, index) => {
  for (let j = 4; j < 8; j++) v8[j] = o[index.i++];
  return dv.getFloat64(0, true);
};

const key = (o, k, type, index) => {
  return ((type & ~LEN) === RECURSION) ?
    k.get(uint(o, type, index)) :
    string(o, k, type, index);
};

const number = (o, type, index) => {
  v8[0] = o[index.i++];
  if (type & L8) return dv.getInt8(0, true);

  v8[1] = o[index.i++];
  if (type & L16) return dv.getInt16(0, true);

  v8[2] = o[index.i++];
  v8[3] = o[index.i++];
  if (type & L32) return dv.getInt32(0, true);

  return floating(o, index);
};

const string = (o, k, type, index) => {
  const known = index.i - 1;
  const length = uint(o, type, index);
  const i = index.i;
  index.i += length;
  const str = decoder.decode(o.subarray(i, i + length));
  k.set(known, str);
  return str;
};

const uint = (o, type, index) => {
  v8[0] = o[index.i++];
  if (type & L8) return dv.getUint8(0, true);

  v8[1] = o[index.i++];
  if (type & L16) return dv.getUint16(0, true);

  v8[2] = o[index.i++];
  v8[3] = o[index.i++];
  if (type & L32) return dv.getUint32(0, true);

  return floating(o, index);
};

const loop = (input, cache, index) => {
  const type = input[index.i++];
  if (type === FALSE) return false;
  if (type === TRUE) return true;
  if (type === NULL) return null;
  if (type === CUSTOM) {
    // TODO: implement custom decoding
    throw new Error('not implemented');
  }

  if (type & NUMBER) return number(input, type, index);

  const kind = type & ~LEN;
  if (kind === RECURSION) return cache.get(uint(input, type, index));

  if (kind === STRING) return string(input, cache, type, index);

  const known = index.i - 1;

  if (kind === ARRAY) {
    const length = uint(input, type, index);
    const array = [];
    cache.set(known, array);
    for (let i = 0; i < length; i++)
      array.push(loop(input, cache, index));
    return array;
  }

  if (kind === OBJECT) {
    const length = uint(input, type, index);
    const object = {};
    cache.set(known, object);
    for (let i = 0; i < length; i++) {
      const name = key(input, cache, input[index.i++], index);
      object[name] = loop(input, cache, index);
    }
    return object;
  }

  return null;
};
