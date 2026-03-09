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
const { isView } = ArrayBuffer;
const { isInteger } = Number;
const { keys } = Object;

const encoder = new TextEncoder;

const crawl = (o, k, data, type) => {
  switch (type) {
    case 'boolean':
      o.push(data ? TRUE : FALSE);
      break;
    case 'string':
      string(o, k, data);
      break;
    case 'number':
      number(o, data);
      break;
    case 'object':
      if (!data)
        o.push(NULL);
      else if (k.has(data))
        o.push(...uint(RECURSION, k.get(data)));
      else {
        k.set(data, o.length);
        if (isArray(data)) {
          const length = data.length;
          o.push(...uint(ARRAY, length));
          for (let index = 0; index < length; index++) {
            const value = data[index];
            const type = typeof value;
            if (valid(type)) crawl(o, k, value, type);
            else o.push(NULL);
          }
        }
        else {
          const own = keys(data).filter(compatible, data);
          const length = own.length;
          o.push(...uint(OBJECT, length));
          for (let index = 0; index < length; index++) {
            const key = own[index];
            string(o, k, key);
            const value = data[key];
            crawl(o, k, value, typeof value);
          }
        }
      }
      break;
  }
};

const floating = (o, value) => {
  dv.setFloat64(0, value, true);
  o.push(NUMBER | L64, ...v8);
};

const number = (o, value) => {
  if (isInteger(value)) {
    if (value < I8 && -I8 <= value) {
      dv.setInt8(0, value, true);
      o.push(NUMBER | L8, v8[0]);
    }
    else if (value < I16 && -I16 <= value) {
      dv.setInt16(0, value, true);
      o.push(NUMBER | L16, v8[0], v8[1]);
    }
    else if (value < I32 && -I32 <= value) {
      dv.setInt32(0, value, true);
      o.push(NUMBER | L32, v8[0], v8[1], v8[2], v8[3]);
    }
    else floating(o, value);
  }
  else floating(o, value);
};

const string = (o, k, data) => {
  if (k.has(data))
    o.push(...uint(RECURSION, k.get(data)));
  else {
    const bytes = encoder.encode(data);
    const length = bytes.length;
    k.set(data, o.length);
    o.push(...uint(STRING, length));
    for (let i = 0; i < length; i += I16)
      o.push(...bytes.subarray(i, i + I16));
  }
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

export const encode = (data, array = []) => {
  crawl(array, new Map, data, typeof data);
  return isView(array) ? array : new Uint8Array(array);
};

function compatible(key) {
  return valid(typeof this[key]);
}
