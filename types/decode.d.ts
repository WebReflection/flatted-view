export function decode(view: Input, { custom }?: Options): unknown | null;
export default decode;
export type Index = {
    i: number;
};
export type Input = number[] | Uint8Array | import("./shared.js").default;
/**
 * Stack payload while finishing a CUSTOM value: chunk buffers and finalized values.
 */
export type CustomDecodeValue = [unknown[], {
    k: number;
    v: unknown;
}];
export type Options = {
    custom?: (value: unknown, encoded: boolean) => unknown;
};
