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

const floating = (output, value) => {
  dv.setFloat64(0, value, true);
  output.push(NUMBER | L64, ...v8);
};

const item = (k, v, t) => ({ k, v, t });

const number = (output, value) => {
  if (isInteger(value)) {
    if (value < I8 && -I8 <= value) {
      dv.setInt8(0, value, true);
      output.push(NUMBER | L8, v8[0]);
    }
    else if (value < I16 && -I16 <= value) {
      dv.setInt16(0, value, true);
      output.push(NUMBER | L16, v8[0], v8[1]);
    }
    else if (value < I32 && -I32 <= value) {
      dv.setInt32(0, value, true);
      output.push(NUMBER | L32, v8[0], v8[1], v8[2], v8[3]);
    }
    else floating(output, value);
  }
  else floating(output, value);
};

const string = (output, cache, data) => {
  if (cache.has(data))
    output.push(...uint(RECURSION, cache.get(data)));
  else {
    const bytes = encoder.encode(data);
    const length = bytes.length;
    cache.set(data, output.length);
    output.push(...uint(STRING, length));
    for (let i = 0; i < length; i += I16)
      output.push(...bytes.subarray(i, i + I16));
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

export const encode = (data, output = []) => {
  const cache = new Map;
  const stack = [item(null, data, typeof data)];
  let i = 0;
  while (i < stack.length) {
    const { k, v, t } = stack[i++];
    if (k !== null) string(output, cache, k);
    switch (t) {
      case 'boolean':
        output.push(v ? TRUE : FALSE);
        break;
      case 'string':
        string(output, cache, v);
        break;
      case 'number':
        number(output, v);
        break;
      case 'object':
        if (v) {
          if (cache.has(v)) output.push(...uint(RECURSION, cache.get(v)));
          else {
            cache.set(v, output.length);
            if (isArray(v)) {
              const length = v.length;
              output.push(...uint(ARRAY, length));
              for (let index = 0; index < length; index++) {
                const value = v[index];
                const type = typeof value;
                stack.push(item(null, value, type));
              }
            }
            else {
              const own = keys(v).filter(compatible, v);
              const length = own.length;
              output.push(...uint(OBJECT, length));
              for (let index = 0; index < length; index++) {
                const key = own[index];
                const value = v[key];
                stack.push(item(key, value, typeof value));
              }
            }
          }
          break;
        }
      default:
        output.push(NULL);
        break;
    }
  }
  return isView(output) ? output : new Uint8Array(output);
};

function compatible(key) {
  switch (typeof this[key]) {
    case 'boolean':
    case 'string':
    case 'number':
    case 'object':
      return true;
    default:
      return false;
  }
}
