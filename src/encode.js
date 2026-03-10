import { FALSE, TRUE, NULL, NUMBER, STRING, ARRAY, OBJECT, RECURSION, CUSTOM } from './constants.js';
import { I8, I16, I32, I64, U8, U16, U32, LEN } from './constants.js';

import { isArray, item, options, dv, v8 } from './utils.js';

const MAX_U8  = 2 ** 8;
const MAX_U16 = 2 ** 16;
const MAX_U32 = 2 ** 32;

const MAX_I8  = MAX_U8 / 2;
const MAX_I16 = MAX_U16 / 2;
const MAX_I32 = MAX_U32 / 2;

const { isInteger } = Number;
const { keys } = Object;

const encoder = new TextEncoder;

const augment = (output, value) => {
  const length = value.length;
  output.push(CUSTOM, ...uint(NUMBER, length));
  push(output, isArray(value) ? new Uint8Array(value) : value, length);
};

const floating = (output, value) => {
  dv.setFloat64(0, value, true);
  output.push(NUMBER | I64, ...v8);
};

const number = (output, value) => {
  if (isInteger(value)) {
    if (value < MAX_I8 && -MAX_I8 <= value) {
      dv.setInt8(0, value, true);
      output.push(NUMBER | I8, v8[0]);
    }
    else if (value < MAX_I16 && -MAX_I16 <= value) {
      dv.setInt16(0, value, true);
      output.push(NUMBER | I16, v8[0], v8[1]);
    }
    else if (value < MAX_I32 && -MAX_I32 <= value) {
      dv.setInt32(0, value, true);
      output.push(NUMBER | I32, v8[0], v8[1], v8[2], v8[3]);
    }
    else if (value < 0) floating(output, value);
    else output.push(...uint(NUMBER, value));
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
  if (length < MAX_U8)
    return [type | U8, length];
  if (length < MAX_U16) {
    dv.setUint16(0, length, true);
    return [type | U16, v8[0], v8[1]];
  }
  if (length < MAX_U32) {
    dv.setUint32(0, length, true);
    return [type | U32, v8[0], v8[1], v8[2], v8[3]];
  }
  /* c8 ignore next */
  dv.setFloat64(0, length, true);
  /* c8 ignore next */
  return [type | LEN, ...v8];
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
export const encode = (data, { output = [], custom = options.custom } = options) => {
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
            if ('toJSON' in v && typeof v.toJSON === 'function') {
              const value = v.toJSON();
              if (value === v) output.push(NULL);
              else stack.push(item(null, value));
            }
            else {
              const value = custom(v);
              if (value !== v) augment(output, value);
              else if (v instanceof Uint8Array) {
                let length = v.length;
                output.push(...uint(ARRAY | NUMBER, length));
                push(output, v, length);
              }
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
