import { decode as _decode } from '../decode.js';

import { FILE, BLOB, ERROR, REGEXP, DATE, MAP, SET, SYMBOL, IMAGE_DATA } from './types.js';

const decode = (view, options) => {
  return _decode(view, { ...options, custom(value) {
    const v = _decode(value);
    switch (v[0]) {
      case FILE:
        return new File([v[5]], v[1], { lastModified: v[2], type: v[4] });
      case BLOB:
        return new Blob([v[2]], { type: v[1] });
      default:
        return value;
    }
  }});
};

export { decode };
