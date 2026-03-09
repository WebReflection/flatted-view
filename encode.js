import { FALSE, TRUE, NULL, NUMBER, STRING, ARRAY, OBJECT, RECURSION } from './constants.js';
import { L8, L16, L32, L64 } from './constants.js';

import { dv, v8 } from './utils.js';

const U8  = 2 ** 8;
const U16 = 2 ** 16;
const U32 = 2 ** 32;

const I8  = U8 / 2;
const I16 = U16 / 2;
const I32 = U32 / 2;

const { isArray } = Array;
const { isInteger } = Number;
const { keys } = Object;

const encoder = new TextEncoder;
const placeholder = [];

const crawl = ({ o, k, r }, data, type) => {
  switch (type) {
    case 'boolean':
      o.push([data ? TRUE : FALSE]);
      break;
    case 'string':
      if (k.has(data))
        o.push(uint(RECURSION, k.get(data)));
      else {
        k.set(data, index(o));
        const bytes = encoder.encode(data);
        o.push(uint(STRING, bytes.length), bytes);
      }
      break;
    case 'number':
      o.push(number(data));
      break;
    case 'object':
      if (!data)
        o.push([NULL]);
      else if (k.has(data))
        o.push(uint(RECURSION, k.get(data)));
      else {
        r.push({ i: o.length, data });
        k.set(data, index(o));
        o.push(placeholder);
      }
      break;
  }
};

const r = (i, array) => i + array.length;
const index = array => array.reduce(r, 0);

const number = value => {
  const asInteger = isInteger(value);
  if (asInteger && value < I8 && -I8 <= value) {
    dv.setInt8(0, value, true);
    return [NUMBER | L8, v8[0]];
  }
  if (asInteger && value < I16 && -I16 <= value) {
    dv.setInt16(0, value, true);
    return [NUMBER | L16, v8[0], v8[1]];
  }
  if (asInteger && value < I32 && -I32 <= value) {
    dv.setInt32(0, value, true);
    return [NUMBER | L32, v8[0], v8[1], v8[2], v8[3]];
  }
  dv.setFloat64(0, value, true);
  return [NUMBER | L64, ...v8];
};

const uint = (type, length) => {
  if (length < U8)
    return [type | L8, length];
  if (length < U16) {
    dv.setUint16(0, length, true);
    return [type | L16, v8[0], v8[1]];
  }
  if (length < U32) {
    dv.setUint32(0, length, true);
    return [type | L32, v8[0], v8[1], v8[2], v8[3]];
  }
  dv.setFloat64(0, length, true);
  return [type | L64, ...v8];
};

const valid = type => {
  switch (type) {
    case 'boolean':
    case 'string':
    case 'number':
    case 'object':
      return true;
    default:
      return false;
  }
};

export const encode = data => {
  let next = 0;
  const o = [];
  const r = [];
  const okr = { o, k: new Map, r };
  crawl(okr, data, typeof data);
  while (next < r.length) {
    const { i, data } = r[next++];
    if (isArray(data)) {
      const length = data.length;
      o[i] = uint(ARRAY, length);
      for (let index = 0; index < length; index++) {
        const value = data[index];
        const type = typeof value;
        if (valid(type))
          crawl(okr, value, type);
        else
          o.push([NULL]);
      }
    }
    else {
      const own = keys(data).filter(compatible, data);
      const length = own.length;
      o[i] = uint(OBJECT, length);
      for (let index = 0; index < length; index++) {
        const key = own[index];
        crawl(okr, key, 'string');
        const value = data[key];
        crawl(okr, value, typeof value);
      }
    }
  }
  return Uint8Array.from(flatten(o));
};

function compatible(key) {
  return valid(typeof this[key]);
}

function* flatten(array) {
  for (let i = 0; i < array.length; i++)
    yield* array[i];
}
