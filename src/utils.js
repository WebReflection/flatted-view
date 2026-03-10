const { isArray } = Array;

const b8 = new ArrayBuffer(8);
export const dv = new DataView(b8);
export const v8 = new Uint8Array(b8);

export const item = (k, v) => ({ k, v });

export const options = { custom: value => value };

export { isArray };
