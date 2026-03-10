export function decode(view: number[] | Uint8Array, { custom }?: Options): unknown;
export default decode;
export type Options = {
    custom?: (value: unknown) => unknown;
};
