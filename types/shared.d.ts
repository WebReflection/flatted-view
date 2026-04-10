/**
 * @extends {Uint8Array<SharedArrayBuffer>}
 */
export default class Shared extends Uint8Array<SharedArrayBuffer> {
    static [Symbol.species]: Uint8ArrayConstructor;
    /**
     * @param {SharedArrayBuffer} sab
     * @param {number} byteOffset
     */
    constructor(sab: SharedArrayBuffer, byteOffset?: number);
    /** @private */
    private _;
    /**
     * @param  {...number} args
     * @returns
     */
    push(...args: number[]): number;
    /**
     * @param {number[] | Uint8Array} values
     * @param {number} targetOffset
     */
    set(values: number[] | Uint8Array, targetOffset?: number): void;
    set length(length: number);
    get length(): number;
    #private;
}
