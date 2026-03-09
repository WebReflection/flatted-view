import { FALSE, TRUE, NULL, NUMBER, STRING, ARRAY, OBJECT, RECURSION } from './constants.js';
import { L8, L16, L32, L64, LEN } from './constants.js';

import { dv, v8 } from './utils.js';

const decoder = new TextDecoder;

export const decode = view => loop(view, new Map, { i: 0 });

const floating = (o, index) => {
  for (let j = 4; j < 8; j++) v8[j] = o[index.i++];
  return dv.getFloat64(0, true);
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

const loop = (o, k, index) => {
  const type = o[index.i++];
  if (type === FALSE) return false;
  if (type === TRUE) return true;
  if (type === NULL) return null;
  if (type & NUMBER) return number(o, type, index);

  const kind = type & ~LEN;
  if (kind === RECURSION) return k.get(uint(o, type, index));

  const known = index.i - 1;

  if (kind === STRING) {
    const length = uint(o, type, index);
    const i = index.i;
    index.i += length;
    const string = decoder.decode(o.subarray(i, i + length));
    k.set(known, string);
    return string;
  }

  if (kind === ARRAY) {
    const length = uint(o, type, index);
    const array = [];
    k.set(known, array);
    for (let i = 0; i < length; i++)
      array.push(loop(o, k, index));
    return array;
  }

  if (kind === OBJECT) {
    const length = uint(o, type, index);
    const object = {};
    k.set(known, object);
    for (let i = 0; i < length; i++) {
      const key = loop(o, k, index);
      const value = loop(o, k, index);
      object[key] = value;
    }
    return object;
  }

  return null;
};
