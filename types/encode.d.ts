export function encode(data: any, { output, custom }?: Options): number[];
export type custom<T> = (value: T) => T | number[] | Uint8Array;
export type Options = {
    output?: number[];
    custom?: custom;
};
