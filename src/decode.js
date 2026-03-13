// @ts-check

import { FALSE, TRUE, NULL, NUMBER, STRING, ARRAY, OBJECT, RECURSION, CUSTOM } from './constants.js';
import { I8, I16, I32, U8, U16, U32, LEN, BI, BUI } from './constants.js';

import { isArray, item, options, dv, v8 } from './utils.js';

const NUMBER_IGNORE = ~(RECURSION | NUMBER);
const CUSTOM_REVIVE = CUSTOM | I8;

const decoder = new TextDecoder;
const ignore = item(NULL, null);

/** @typedef {{ i: number }} Index */

/** @typedef {number[] | Uint8Array | import('./shared.js').default} Input */

/** @typedef {{ custom?: (value: unknown, encoded: boolean) => unknown }} Options */

/**
 * @param {Uint8Array} input
 * @param {Index} index
 * @param {boolean} isBigUint
 * @returns {bigint}
 */
const bigint = (input, index, isBigUint) => {
  for (let i = 0; i < 8; i++) v8[i] = input[index.i++];
  return isBigUint ? dv.getBigUint64(0, true) : dv.getBigInt64(0, true);
};

/**
 * @param {Uint8Array} input
 * @param {Index} index
 * @returns
 */
const floating = (input, index) => {
  for (let j = 4; j < 8; j++) v8[j] = input[index.i++];
  return dv.getFloat64(0, true);
};

/**
 * @param {Uint8Array} input
 * @param {Map<number, unknown>} cache
 * @param {Index} index
 * @returns
 */
const key = (input, cache, index) => {
  const type = input[index.i++];
  return (type & ~LEN) === RECURSION ?
    /** @type {string} */ (cache.get(number(input, type, index))) :
    string(input, cache, type, index);
};

/**
 * @param {Uint8Array} input
 * @param {number} type
 * @param {Index} index
 * @returns
 */
const number = (input, type, index) => {
  type &= NUMBER_IGNORE;

  if (type === 0) return type;

  v8[0] = input[index.i++];

  if (type === U8) return dv.getUint8(0);
  if (type === I8) return dv.getInt8(0);

  v8[1] = input[index.i++];
  if (type === U16) return dv.getUint16(0, true);
  if (type === I16) return dv.getInt16(0, true);

  v8[2] = input[index.i++];
  v8[3] = input[index.i++];
  if (type === U32) return dv.getUint32(0, true);
  if (type === I32) return dv.getInt32(0, true);

  return floating(input, index);
};

/**
 * @param {Uint8Array} input
 * @param {number} length
 * @param {Index} index
 * @returns
 */
const slice = (input, length, index) => {
  const i = index.i;
  index.i += length;
  return input.slice(i, i + length);
};

/**
 * @param {Uint8Array} input
 * @param {Map<number, unknown>} cache
 * @param {number} type
 * @param {Index} index
 * @returns {string}
 */
const string = (input, cache, type, index) => {
  if (type === STRING) return '';
  const known = index.i - 1;
  const length = number(input, type, index);
  const i = index.i;
  index.i += length;
  const str = decoder.decode(input.subarray(i, i + length));
  cache.set(known, str);
  return str;
};

/**
 * @param {Input} view
 * @param {Options} [options] 
 * @returns {unknown?}
 */
export const decode = (view, { custom = options.custom } = options) => {
  const input = isArray(view) ? new Uint8Array(view) : view;

  /** @type {Map<number, unknown>} */
  const cache = new Map;

  /** @type {Index} */
  const index = { i: 0 };

  /** @type {{ k: number, v: unknown }[]} */
  const stack = input.length ? [ignore] : [];

  let first = true, result, entry, prop;

  while (stack.length) {
    const { k, v } = stack.pop();

    if (k === OBJECT) prop = key(input, cache, index);

    const type = input[index.i++];

    if (type === FALSE) entry = false;
    else if (type === TRUE) entry = true;
    else if (type === NULL) entry = null;

    else if (CUSTOM <= type) {
      const length = number(input, input[index.i++], index);
      const view = slice(input, length, index);
      const revive = type === CUSTOM_REVIVE;
      entry = custom(revive ? decode(view) : view, !revive);
    }

    else if (type & NUMBER) {
      if (type & ARRAY) {
        const length = number(input, type & ~ARRAY, index);
        entry = slice(input, length, index);
      }
      else {
        const t = type & ~NUMBER;
        const isBigUint = t === BUI;
        if (isBigUint || t === BI) entry = bigint(input, index, isBigUint);
        else entry = number(input, type, index);
      }
    }

    else {
      const kind = type & ~LEN;
      if (kind === RECURSION) entry = cache.get(number(input, type, index));

      else if (kind === STRING) entry = string(input, cache, type, index);

      else {
        const known = index.i - 1;
        const length = number(input, type, index);

        if (kind === ARRAY) {
          entry = [];
          cache.set(known, entry);
          for (let next = item(ARRAY, entry), i = 0; i < length; i++)
            stack.push(next);
        }

        else if (kind === OBJECT) {
          entry = {};
          cache.set(known, entry);
          for (let next = item(OBJECT, entry), i = 0; i < length; i++)
            stack.push(next);
        }
      }
    }

    if (first) {
      first = false;
      result = entry;
    }
    else if (k === OBJECT) v[prop] = entry;
    else if (k === ARRAY) (/** @type {Array<unknown>} */ (v)).push(entry);
  }

  return result;
};

export default decode;
