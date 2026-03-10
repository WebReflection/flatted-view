import { FALSE, TRUE, NULL, NUMBER, STRING, ARRAY, OBJECT, RECURSION, CUSTOM } from './constants.js';
import { L8, L16, L32, LEN } from './constants.js';

import { isArray, item, dv, v8 } from './utils.js';

const decoder = new TextDecoder;
const ignore = item(NULL, null);

const floating = (input, index) => {
  for (let j = 4; j < 8; j++) v8[j] = input[index.i++];
  return dv.getFloat64(0, true);
};

const key = (input, cache, index) => {
  const type = input[index.i++];
  return (type & ~LEN) === RECURSION ?
    cache.get(uint(input, type, index)) :
    string(input, cache, type, index);
};

const number = (input, type, index) => {
  v8[0] = input[index.i++];
  if (type & L8) return dv.getInt8(0, true);

  v8[1] = input[index.i++];
  if (type & L16) return dv.getInt16(0, true);

  v8[2] = input[index.i++];
  v8[3] = input[index.i++];
  if (type & L32) return dv.getInt32(0, true);

  return floating(input, index);
};

const string = (input, cache, type, index) => {
  const known = index.i - 1;
  const length = uint(input, type, index);
  const i = index.i;
  index.i += length;
  const str = decoder.decode(input.subarray(i, i + length));
  cache.set(known, str);
  return str;
};

const uint = (input, type, index) => {
  v8[0] = input[index.i++];
  if (type & L8) return dv.getUint8(0, true);

  v8[1] = input[index.i++];
  if (type & L16) return dv.getUint16(0, true);

  v8[2] = input[index.i++];
  v8[3] = input[index.i++];
  if (type & L32) return dv.getUint32(0, true);

  return floating(input, index);
};

export const decode = view => {
  const input = isArray(view) ? new Uint8Array(view) : view;
  const cache = new Map;
  const index = { i: 0 };
  const stack = input.length ? [ignore] : [];

  let first = true, result, entry, prop;

  while (stack.length) {
    const { k, v } = stack.pop();

    if (k === OBJECT) prop = key(input, cache, index);

    const type = input[index.i++];

    if (type === FALSE) entry = false;
    else if (type === TRUE) entry = true;
    else if (type === NULL) entry = null;

    else if (type === CUSTOM) {
      // TODO: implement custom decoding
      throw new Error('not implemented');
    }

    else if (type & NUMBER) entry = number(input, type, index);

    else {
      const kind = type & ~LEN;
      if (kind === RECURSION) entry = cache.get(uint(input, type, index));

      else if (kind === STRING) entry = string(input, cache, type, index);

      else {
        const known = index.i - 1;
        const length = uint(input, type, index);

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

    if (k === OBJECT) v[prop] = entry;
    else if (k === ARRAY) v.push(entry);
    else if (first) {
      first = false;
      result = entry;
    }
  }

  return result;
};
