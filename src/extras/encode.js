// @ts-check

import viewName from './view.js';
import { ImageData } from './web.js';
import { encode as _encode, view } from '../encode.js';
import { isArray, item, options } from '../utils.js';

import { BUFFER, VIEW, BLOB, FILE, ERROR, REGEXP, DATE, MAP, SET, IMAGE_DATA } from './types.js';

const { isView } = ArrayBuffer;

const direct = value => view(_encode(value));

/**
 * @param {{ k: number, v: unknown }} i
 * @returns
 */
const values = i => i.v;

/**
 * Encodes data as uint8 values
 * @param {unknown} data
 * @param {import('../encode.js').Options} options
 * @returns
 */
const encode = (data, {
  fn = false,
  json = true,
  output = [],
  set = false
} = options) => {
  const files = [];

  const result = _encode(data, { fn, json, output, set, custom(value) {
    /** @type {unknown[]} */
    let outcome;
    switch (true) {
      case isArray(value): return value;
      case isView(value): {
        if (value instanceof Uint8Array) return value;
        const name = viewName(value);
        const view = /** @type {ArrayBufferView & { BYTES_PER_ELEMENT: number, length: number }} */ (value);
        const { BYTES_PER_ELEMENT, byteOffset, buffer, length } = view;
        return [
          VIEW,
          name,
          new Uint8Array(buffer),
          byteOffset,
          length !== ((buffer.byteLength - byteOffset) / BYTES_PER_ELEMENT) ? length : 0,
        ];
      }
      case value instanceof ArrayBuffer:
        return direct([BUFFER, new Uint8Array(value)]);
      case value instanceof Date:
        return direct([DATE, value.toISOString()]);
      case value instanceof Map: {
        outcome = [MAP, value.size];
        for (const [k, v] of value) outcome.push(k, v);
        return outcome;
      }
      case value instanceof Set:
        return [SET, value.size, ...value];
      case value instanceof Error:
        return direct([ERROR, value.name, value.message, value.stack]);
      case value instanceof RegExp:
        return direct([REGEXP, value.source, value.flags]);
      case value instanceof File:
        outcome = [FILE, value.name, value.lastModified];
      case value instanceof Blob: {
        outcome ??= [];
        const size = value.size;
        outcome.push(BLOB, value.type, new Uint8Array(size));
        const encoded = _encode(outcome);
        const length = encoded.length;
        files.push(item(1 + output.length + length + _encode(length).length - size, value.arrayBuffer()));
        return view(encoded);
      }
      /* c8 ignore start */
      case value instanceof ImageData: {
        const im = /** @type {ImageData & { colorSpace?: string, pixelFormat?: string }} */ (value);
        return direct([IMAGE_DATA, new Uint8Array(im.data.buffer), im.width, im.height, im.colorSpace, im.pixelFormat]);
      }
      default:
        return value;
      /* c8 ignore stop */
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
