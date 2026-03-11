export function decode(view: Input, { custom }?: Options): unknown | null;
export default decode;
export type Index = {
    i: number;
};
export type Input = number[] | Uint8Array | import("./shared.js").default;
export type Options = {
    custom?: (value: unknown) => unknown;
};
