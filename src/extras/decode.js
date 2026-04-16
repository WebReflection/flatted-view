import { decode as _decode } from '../decode.js';

import { BUFFER, VIEW, BLOB, FILE, ERROR, REGEXP, DATE, MAP, SET, IMAGE_DATA } from './types.js';

const { defineProperty } = Object;

const decode = (view, options) => {
  return _decode(view, { ...options, custom(value) {
    const v = _decode(value);
    switch (v[0]) {
      case BUFFER:
        return v[1].buffer;
      case VIEW: {
        const buffer = v[2].buffer;
        const byteOffset = v[3];
        const length = v[4];
        const Class = globalThis[v[1]];
        return length ? new Class(buffer, byteOffset, length) : new Class(buffer, byteOffset);
      }
      case DATE:
        return new Date(v[1]);
      case MAP: {
        const map = new Map;
        for (let i = 2, l = 2 + (v[1] * 2); i < l; i += 2) map.set(v[i], v[i + 1]);
        return map;
      }
      case SET:
        return new Set(v.slice(2, 2 + v[1]));
      case ERROR: {
        const Class = globalThis[v[1]];
        return defineProperty(new Class(v[2]), 'stack', { value: v[3] });
      }
      case REGEXP:
        return new RegExp(v[1], v[2]);
      case FILE:
        return new File([v[5]], v[1], { lastModified: v[2], type: v[4] });
      case BLOB:
        return new Blob([v[2]], { type: v[1] });
      /* c8 ignore start */
      case IMAGE_DATA: {
        const colorSpace = v[4];
        const pixelFormat = v[5];
        const Class = pixelFormat === 'rgba-float16' ? Float16Array : Uint8ClampedArray;
        return new ImageData(new Class(v[1].buffer), v[2], v[3], { colorSpace, pixelFormat });
      }
      default:
        return value;
      /* c8 ignore stop */
    }
  }});
};

export { decode };
