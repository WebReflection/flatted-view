/**
 * Encodes data as uint8 values
 * @param {unknown} data
 * @param {import('../encode.js').Options} options
 * @returns
 */
export function encode(data: unknown, { fn, json, output, set }?: import("../encode.js").Options): import("../encode.js").Output | Promise<number[] | import("../shared.js").default>;
import { view } from '../encode.js';
export { view };
