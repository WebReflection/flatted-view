// @ts-check

import { encode as _encode, view } from '../encode.js';
import { isArray, item, options as _options } from '../utils.js';

import { FILE, BLOB, ERROR, REGEXP, DATE, MAP, SET, SYMBOL, IMAGE_DATA } from './types.js';

/**
 * @param {{ k: number, v: unknown }} i
 * @returns
 */
const values = i => i.v;

const encode = (data, { output = [], set = false } = _options) => {
  const files = [];
  const result = _encode(data, { output, set, custom(value) {
    const outcome = [];
    switch (true) {
      case value instanceof File:
        outcome.push(FILE, value.name, value.lastModified);
      case value instanceof Blob: {
        const size = value.size;
        outcome.push(BLOB, value.type, new Uint8Array(size));
        const encoded = _encode(outcome);
        const length = encoded.length;
        files.push(item(1 + output.length + length + _encode(length).length - size, value.arrayBuffer()));
        return view(encoded);
      }
      default:
        return value;
    }
  }});
  return files.length ?
    Promise.all(/** @type {ArrayBuffer[]} */ (files.map(values))).then(results => {
      for (let l = result.length, i = 0; i < results.length; i++) {
        const { k } = files[i];
        const v = new Uint8Array(results[i]);
        if (set) {
          /** @type {import('../shared.js').default} */ (output).set(v, k);
          result.length = l;
        }
        else {
          for (let j = k, l = k + v.length; j < l; j++) result[j] = v[j - k];
        }
      }
      return result;
    }) :
    result;
};

export { encode, view };
