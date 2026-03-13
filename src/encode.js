// @ts-check

import { FALSE, TRUE, NULL, NUMBER, STRING, ARRAY, OBJECT, RECURSION, CUSTOM } from './constants.js';
import { I8, I16, I32, F64, U8, U16, U32, LEN, BI, BUI } from './constants.js';

import { isArray, item, options, dv, v8 } from './utils.js';

/**
 * @callback custom
 * @param {unknown} value
 * @returns {unknown | View}
 */

/** @typedef {import('./shared.js').default} Shared */

/** @typedef {number[] | Shared} Output */

/** @typedef {{ output?: Output, custom?: custom, set?: boolean }} Options */

const MAX_U8  = 2 ** 8;
const MAX_U16 = 2 ** 16;
const MAX_U32 = 2 ** 32;

const MAX_I8  = MAX_U8 / 2;
const MAX_I16 = MAX_U16 / 2;
const MAX_I32 = MAX_U32 / 2;

const { isInteger } = Number;
const { keys } = Object;

let valueOf;

class View {
  static {
    /**
     * @param {View} self
     * @returns
     */
    valueOf = self => self.#value;
  }

  #value;

  /**
   * @param {number[] | Uint8Array} value 
   */
  constructor(value) {
    this.#value = /** @type {number[] | Uint8Array} */ (value);
  }
}

const encoder = new TextEncoder;

/**
 * @param {Output} output
 * @param {number} type
 */
const gr8 = (output, type) => {
  output.push(type, ...v8);
};

/**
 * @param {Output} output
 * @param {unknown} value
 * @param {boolean} set
 */
const augment = (output, value, set) => {
  let type = CUSTOM;
  if (value instanceof View) {
    value = valueOf(value);
    if (isArray(value)) value = new Uint8Array(value);
  }
  else {
    type |= I8;
    value = new Uint8Array(encode(value));
  }
  output.push(type);
  const length = /** @type {Uint8Array} */ (value).length;
  uint(output, NUMBER, length);
  push(output, /** @type {Uint8Array} */ (value), length, set);
};

/**
 * @param {Output} output
 * @param {bigint} value
 */
const bigint = (output, value) => {
  if (value < 0n) {
    dv.setBigInt64(0, value, true);
    gr8(output, NUMBER | BI);
  }
  else {
    dv.setBigUint64(0, value, true);
    gr8(output, NUMBER | BUI);
  }
};

/**
 * @param {Output} output
 * @param {number} value
 */
const floating = (output, value) => {
  dv.setFloat64(0, value, true);
  gr8(output, NUMBER | F64);
};

/**
 * @param {Output} output
 * @param {number} value
 */
const number = (output, value) => {
  if (isInteger(value)) {
    if (value < 0) {
      if (-MAX_I8 <= value) {
        dv.setInt8(0, value);
        output.push(NUMBER | I8, v8[0]);
      }
      else if (-MAX_I16 <= value) {
        dv.setInt16(0, value, true);
        output.push(NUMBER | I16, v8[0], v8[1]);
      }
      else if (-MAX_I32 <= value) {
        dv.setInt32(0, value, true);
        output.push(NUMBER | I32, v8[0], v8[1], v8[2], v8[3]);
      }
      else floating(output, value);
    }
    else uint(output, NUMBER, value);
  }
  else floating(output, value);
};

/**
 * @param {Output} output
 * @param {Uint8Array} bytes
 * @param {number} length
 * @param {boolean} set
 */
const push = (output, bytes, length, set) => {
  if (set) {
    (/** @type {Shared} */ (output)).set(bytes, output.length);
  }
  else {
    for (let i = 0; i < length; i += I16)
      output.push.apply(output, bytes.subarray(i, i + I16));
  }
};

/**
 * @param {Output} output
 * @param {Map<unknown, number>} cache
 * @param {string} data
 * @param {boolean} set
 */
const string = (output, cache, data, set) => {
  if (data === '')
    output.push(STRING);
  else if (cache.has(data))
    uint(output, RECURSION, cache.get(data));
  else {
    const bytes = encoder.encode(data);
    const length = bytes.length;
    cache.set(data, output.length);
    uint(output, STRING, length);
    push(output, bytes, length, set);
  }
};

/**
 * @param {Output} output
 * @param {number} type
 * @param {number} length
 */
const uint = (output, type, length) => {
  if (length === 0)
    output.push(type);
  else if (length < MAX_U8)
    output.push(type | U8, length);
  else if (length < MAX_U16) {
    dv.setUint16(0, length, true);
    output.push(type | U16, v8[0], v8[1]);
  }
  else if (length < MAX_U32) {
    dv.setUint32(0, length, true);
    output.push(type | U32, v8[0], v8[1], v8[2], v8[3]);
  }
  else {
    /* c8 ignore next */
    dv.setFloat64(0, length, true);
    /* c8 ignore next */
    gr8(output, type | LEN);
  }
};

/**
 * Encodes data as uint8 values
 * @param {unknown} data
 * @param {Options} options
 * @returns
 */
export const encode = (data, { output = [], custom = options.custom, set = false } = options) => {
  const cache = new Map;
  const stack = [item(null, data)];
  while (stack.length) {
    const { k, v } = stack.pop();
    if (k !== null) string(output, cache, k, set);
    switch (typeof v) {
      case 'bigint':
        bigint(output, v);
        continue;
      case 'boolean':
        output.push(v ? TRUE : FALSE);
        continue;
      case 'number':
        number(output, v);
        continue;
      case 'string':
        string(output, cache, v, set);
        continue;
      case 'object':
        if (v) {
          if (cache.has(v)) {
            uint(output, RECURSION, cache.get(v));
            continue;
          }

          cache.set(v, output.length);
          if ('toJSON' in v && typeof v.toJSON === 'function') {
            const value = v.toJSON();
            if (value === v) output.push(NULL);
            else stack.push(item(null, value));
            continue;
          }

          const value = custom(v);
          if (value !== v) {
            augment(output, value, set);
            continue;
          }

          if (isArray(v)) {
            let length = v.length;
            uint(output, ARRAY, length);
            while (length--)
              stack.push(item(null, v[length]));
            continue;
          }

          if (v instanceof Uint8Array) {
            let length = v.length;
            uint(output, ARRAY | NUMBER, length);
            push(output, v, length, set);
            continue;
          }

          const own = keys(v).filter(compatible, v);
          let length = own.length;
          uint(output, OBJECT, length);
          while (length--) {
            const key = own[length];
            stack.push(item(key, v[key]));
          }
          continue;
        }
      case 'undefined':
        output.push(NULL);
        continue;
      default: {
        const value = custom(v);
        if (value !== v) augment(output, value, set);
        else output.push(NULL);
        continue;
      }
    }
  }
  return output;
};

/**
 * @this {Record<string, unknown>}
 * @param {string} key
 * @returns
 */
function compatible(key) {
  switch (typeof this[key]) {
    case 'bigint':
    case 'boolean':
    case 'number':
    case 'string':
    case 'object':
      return true;
    default:
      return false;
  }
}

/**
 * @param {number[] | Uint8Array} value
 * @returns
 */
export const view = value => new View(value);

export default encode;
