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
/**
 * Decode `custom`: second arg is **`fromView`**. When `true`, `value` is the CUSTOM payload from a
 * `view(...)` encode (opaque bytes / nested encoding) and usually needs revival; when `false`, the
 * value was already resolved by the stack decoder and can often be returned as-is.
 */
export type Options = {
    custom?: (value: unknown, fromView: boolean) => unknown;
};
