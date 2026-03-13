// @ts-check

const PAGE = 2 ** 16;

const { min } = Math;

/**
 * @extends {Uint8Array<SharedArrayBuffer>}
 */
export default class Shared extends Uint8Array {
  static [Symbol.species] = Uint8Array;

  /**
   * @param {number[] | Uint8Array} values
   * @param {number} targetOffset
   */
  #set(values, targetOffset) {
    const slength = values.length;
    const tlength = super.length;

    if ((targetOffset + slength) > tlength && this.buffer.growable) {
      let next = tlength + targetOffset + slength + this.byteOffset;
      next += PAGE - (next % PAGE);
      this.buffer.grow(min(next, this.buffer.maxByteLength));
    }

    // let it throw if the buffer is not growable
    super.set(values, targetOffset);
    this._ += slength;
  }

  /**
   * @param {SharedArrayBuffer} sab
   * @param {number} byteOffset
   */
  constructor(sab, byteOffset = 0) {
    super(sab, byteOffset);

    /** @private */
    this._ = 0;
  }

  /**
   * @param  {...number} args
   * @returns
   */
  push(...args) {
    this.#set(args, this._);
    return this._;
  }

  /**
   * @param {number[] | Uint8Array} values
   * @param {number} targetOffset
   */
  set(values, targetOffset = 0) {
    this.#set(values, targetOffset);
  }

  get length() {
    return this._;
  }

  set length(length) {
    this._ = length;
  }
}
