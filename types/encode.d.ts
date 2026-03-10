export function encode(data: unknown, { output, custom }?: Options): number[];
export function view(value: number[] | Uint8Array): View;
export default encode;
export type custom = (value: unknown) => unknown | View;
export type Options = {
    output?: number[];
    custom?: custom;
};
declare class View {
    constructor(value: any);
    #private;
}
