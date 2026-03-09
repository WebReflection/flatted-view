import { FALSE, TRUE, NULL, NUMBER, STRING, ARRAY, OBJECT, RECURSION } from './constants.js';
import { L8, L16, L32, L64 } from './constants.js';
import { get, getNumber, set, setNumber } from './length.js';

const { isArray } = Array;
const { keys } = Object;

export const encode = data => {
  const array = [];
  push(array, new Map, data, typeof data);
  return new Uint8Array(array);
};

const encoder = new TextEncoder;
const decoder = new TextDecoder;

const push = (o, k, v, t) => {
  switch (t) {
    case 'boolean':
      o.push(v ? TRUE : FALSE);
      break;
    case 'string':
      string(o, k, v);
      break;
    case 'number':
      setNumber(o, v);
      break;
    case 'object':
      if (!v)
        o.push(NULL);
      else if (k.has(v))
        set(o, RECURSION, k.get(v));
      else if (isArray(v)) {
        k.set(v, o.length);
        const length = v.length;
        set(o, ARRAY, length);
        for (let i = 0; i < length; i++) {
          const value = v[i];
          const type = typeof value;
          if (valid(type))
            push(o, k, value, type);
          else
            o.push(NULL);
        }
      }
      else {
        k.set(v, o.length);
        const items = keys(v).filter(fields, v);
        const length = items.length;
        set(o, OBJECT, length);
        for (let i = 0; i < length; i++) {
          const key = items[i];
          const value = v[key];
          const type = typeof value;
          string(o, k, key);
          push(o, k, value, type);
        }
      }
      break;
  }
}

const string = (o, k, value) => {
  if (k.has(value))
    set(o, RECURSION, k.get(value));
  else {
    k.set(value, o.length);
    const bytes = encoder.encode(value);
    set(o, STRING, bytes.length);
    o.push(...bytes);
  }
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

function fields(key) {
  return valid(typeof this[key]);
}

export const decode = view => loop(view, new Map, { i: 0 });

const loop = (view, k, index) => {
  const type = view[index.i++];
  switch (type) {
    case RECURSION:
      return k.get(view[index.i++]);
    case FALSE:
    case TRUE:
      return !!type;
    case NULL:
      return null;
    default: {
      if (type & NUMBER)
        return getNumber(view, type, index);
      else if (type & STRING) {
        const i = index.i - 1;
        const length = get(view, type, index);
        const string = decoder.decode(view.subarray(index.i, index.i + length));
        index.i += length;
        k.set(i, string);
        return string;
      }
      else if (type & ARRAY) {
        const array = [];
        k.set(index.i - 1, array);
        let length = get(view, type, index);
        while (length--)
          array.push(loop(view, k, index));
        return array;
      }
      else {
        const object = {};
        k.set(index.i - 1, object);
        let length = get(view, type, index);
        while (length--) {
          const key = loop(view, k, index);
          const value = loop(view, k, index);
          object[key] = value;
        }
        return object;
      }
    }
  }
};
