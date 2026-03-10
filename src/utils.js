const b8 = new ArrayBuffer(8);
export const dv = new DataView(b8);
export const v8 = new Uint8Array(b8);

const { isArray } = Array;
export { isArray };


export const options = { custom: value => value };

export const item = (k, v) => ({ k, v });
