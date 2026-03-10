import { FALSE, TRUE, NULL, NUMBER, STRING, ARRAY, OBJECT, RECURSION, CUSTOM } from './constants.js';
import { L8, L16, L32, L64 } from './constants.js';

import { isArray, item, dv, v8 } from './utils.js';

const U8  = 2 ** 8;
const U16 = 2 ** 16;
const U32 = 2 ** 32;

const I8  = U8 / 2;
const I16 = U16 / 2;
const I32 = U32 / 2;

const { isInteger } = Number;
const { keys } = Object;

const encoder = new TextEncoder;

const augment = (output, value) => {
  const length = value.length;
  output.push(CUSTOM);
  number(output, length);
  push(output, isArray(value) ? new Uint8Array(value) : value, length);
};

const floating = (output, value) => {
  dv.setFloat64(0, value, true);
  output.push(NUMBER | L64, ...v8);
};

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

const push = (output, bytes, length) => {
  for (let i = 0; i < length; i += I16)
    output.push(...bytes.subarray(i, i + I16));
};

const string = (output, cache, data) => {
  if (cache.has(data))
    output.push(...uint(RECURSION, cache.get(data)));
  else {
    const bytes = encoder.encode(data);
    const length = bytes.length;
    cache.set(data, output.length);
    output.push(...uint(STRING, length));
    push(output, bytes, length);
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

/**
 * @template T
 * @callback custom
 * @param {T} value
 * @returns {T | number[] | Uint8Array}
 */

/**
 * @typedef {{ output?: number[], custom?: custom }} Options
 */

/**
 * Encodes data as uint8 values
 * @param {any} data
 * @param {Options} options
 * @returns
 */
export const encode = (data, { output = [], custom = v => v } = {}) => {
  const cache = new Map;
  const stack = [item(null, data)];
  while (stack.length) {
    const { k, v } = stack.pop();
    if (k !== null) string(output, cache, k);
    switch (typeof v) {
      case 'boolean':
        output.push(v ? TRUE : FALSE);
        break;
      case 'number':
        number(output, v);
        break;
      case 'string':
        string(output, cache, v);
        break;
      case 'object':
        if (v) {
          if (cache.has(v)) output.push(...uint(RECURSION, cache.get(v)));
          else {
            cache.set(v, output.length);
            if ('toJSON' in v) {
              const value = v.toJSON();
              stack.push(item(null, value === v ? null : value));
            }
            else {
              const value = custom(v);
              if (value !== v) augment(output, value);
              else if (isArray(v)) {
                let length = v.length;
                output.push(...uint(ARRAY, length));
                while (length--)
                  stack.push(item(null, v[length]));
              }
              else {
                const own = keys(v).filter(compatible, v);
                let length = own.length;
                output.push(...uint(OBJECT, length));
                while (length--) {
                  const key = own[length];
                  stack.push(item(key, v[key]));
                }
              }
            }
          }
          break;
        }
      case 'undefined':
        output.push(NULL);
        break;
      default: {
        const value = custom(v);
        if (value !== v) augment(output, value);
        else output.push(NULL);
        break;
      }
    }
  }
  return output;
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
