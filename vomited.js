import { FALSE, TRUE, NULL, NUMBER, STRING, ARRAY, OBJECT, RECURSION } from './constants.js';
import { L8, L16, L32, L64, LEN } from './constants.js';

import { dv, v8 } from './utils.js';

const decoder = new TextDecoder;
const FRAME = Symbol('frame');

export const decode = view => loop(view, new Map, { i: 0 });

const floating = (o, index) => {
  for (let j = 4; j < 8; j++) v8[j] = o[index.i++];
  return dv.getFloat64(0, true);
};

const number = (o, type, index) => {
  v8[0] = o[index.i++];
  if (type & L8) return dv.getInt8(0, true);

  v8[1] = o[index.i++];
  if (type & L16) return dv.getInt16(0, true);

  v8[2] = o[index.i++];
  v8[3] = o[index.i++];
  if (type & L32) return dv.getInt32(0, true);

  return floating(o, index);
};

const uint = (o, type, index) => {
  v8[0] = o[index.i++];
  if (type & L8) return dv.getUint8(0, true);

  v8[1] = o[index.i++];
  if (type & L16) return dv.getUint16(0, true);

  v8[2] = o[index.i++];
  v8[3] = o[index.i++];
  if (type & L32) return dv.getUint32(0, true);

  return floating(o, index);
};

const readOne = (o, k, index) => {
  const type = o[index.i++];
  if (type === FALSE) return false;
  if (type === TRUE) return true;
  if (type === NULL) return null;
  if (type & NUMBER) return number(o, type, index);

  const kind = type & ~LEN;
  if (kind === RECURSION) return k.get(uint(o, type, index));

  const known = index.i - 1;

  if (kind === STRING) {
    const length = uint(o, type, index);
    const i = index.i;
    index.i += length;
    const string = decoder.decode(o.subarray(i, i + length));
    k.set(known, string);
    return string;
  }

  if (kind === ARRAY) {
    const length = uint(o, type, index);
    const array = [];
    k.set(known, array);
    return { container: array, kind: 'array', count: length, index: 0, [FRAME]: true };
  }

  if (kind === OBJECT) {
    const length = uint(o, type, index);
    const object = {};
    k.set(known, object);
    return { container: object, kind: 'object', count: length, index: 0, key: null, [FRAME]: true };
  }

  return null;
};

const loop = (o, k, index) => {
  const stack = [];
  let result = readOne(o, k, index);

  while (true) {
    if (!result?.[FRAME]) {
      if (stack.length === 0) return result;
      const frame = stack.pop();
      if (frame.kind === 'array') {
        frame.container[frame.index++] = result;
        if (frame.index < frame.count) {
          stack.push(frame);
          result = readOne(o, k, index);
          continue;
        }
        result = frame.container;
      } else {
        if (frame.key === null) {
          frame.key = result;
          stack.push(frame);
          result = readOne(o, k, index);
          continue;
        }
        frame.container[frame.key] = result;
        frame.index++;
        frame.key = null;
        if (frame.index < frame.count) {
          stack.push(frame);
          result = readOne(o, k, index);
          continue;
        }
        result = frame.container;
      }
      continue;
    }

    const frame = result;
    stack.push(frame);
    result = readOne(o, k, index);
  }
};
