// @ts-check

const PAGE = 2 ** 16;

const { min } = Math;

/**
 * @extends {Uint8Array<SharedArrayBuffer>}
 */
export default class Shared extends Uint8Array {
  static [Symbol.species] = Uint8Array;

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
   */
  push(...args) {
    const length = args.length;
    const l = super.length;
    const i = this._;

    if ((i + length) > l && this.buffer.growable) {
      let next = l + i + length + this.byteOffset;
      next += PAGE - (next % PAGE);
      this.buffer.grow(min(next, this.buffer.maxByteLength));
    }

    // let it throw if the buffer is not growable
    this.set(args, i);
    this._ += length;
    return this._;
  }

  /**
   * @param {number} length
   * @returns {this}
   */
  sized(length) {
    this._ = length;
    return this;
  }

  get length() {
    return this._;
  }
}
