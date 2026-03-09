import { NUMBER, L8, L16, L32, L64 } from './constants.js';

const b8 = new ArrayBuffer(8);
const v8 = new Uint8Array(b8);
const dv = new DataView(b8);

export const get = (o, type, index) => {
  let length = 0;
  if (type & L8)
    length = o[index.i++];
  else if (type & L16) {
    v8[0] = o[index.i++];
    v8[1] = o[index.i++];
    length = dv.getUint16(0, true);
  }
  else if (type & L32) {
    v8[0] = o[index.i++];
    v8[1] = o[index.i++];
    v8[2] = o[index.i++];
    v8[3] = o[index.i++];
    length = dv.getUint32(0, true);
  }
  else {
    for (let j = 0; j < 8; j++)
      v8[j] = o[index.i++];
    length = dv.getFloat64(0, true);
  }
  return length;
};

export const getNumber = (o, type, index) => {
  let value = 0;
  v8[0] = o[index.i++];
  if (type & L8)
    value = dv.getInt8(0, true);
  else if (type & L16) {
    v8[1] = o[index.i++];
    value = dv.getInt16(0, true);
  }
  else if (type & L32) {
    v8[1] = o[index.i++];
    v8[2] = o[index.i++];
    v8[3] = o[index.i++];
    value = dv.getInt32(0, true);
  }
  else {
    for (let j = 1; j < 8; j++)
      v8[j] = o[index.i++];
    value = dv.getFloat64(0, true);
  }
  return value;
};

export const set = (o, type, length) => {
  if (length < 256)
    o.push(type | L8, length);
  else if (length < 65536) {
    dv.setUint16(0, length, true);
    o.push(type | L16, v8[0], v8[1]);
  }
  else if (length < 4294967296) {
    dv.setUint32(0, length, true);
    o.push(type | L32, v8[0], v8[1], v8[2], v8[3]);
  }
  else {
    dv.setFloat64(0, length, true);
    o.push(type | L64, ...v8);
  }
};

const I8 = 128;
const I16 = 32768;
const I32 = 2147483648;
const { isInteger } = Number;

export const setNumber = (o, value) => {
  const asInteger = isInteger(value);
  if (asInteger && value < I8 && -I8 <= value) {
    dv.setInt8(0, value, true);
    o.push(NUMBER | L8, v8[0]);
  }
  else if (asInteger && value < I16 && -I16 <= value) {
    dv.setInt16(0, value, true);
    o.push(NUMBER | L16, v8[0], v8[1]);
  }
  else if (asInteger && value < I32 && -I32 <= value) {
    dv.setInt32(0, value, true);
    o.push(NUMBER | L32, v8[0], v8[1], v8[2], v8[3]);
  }
  else {
    dv.setFloat64(0, value, true);
    o.push(NUMBER | L64, ...v8);
  }
}
