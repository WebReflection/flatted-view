export function encode(data: unknown, { output, custom }?: Options): Output;
export function view(value: number[] | Uint8Array): View;
export default encode;
export type custom = (value: unknown) => unknown | View;
export type Output = number[] | import("./shared.js").default;
export type Options = {
    output?: Output;
    custom?: custom;
};
declare class View {
    /**
     * @param {number[] | Uint8Array} value
     */
    constructor(value: number[] | Uint8Array);
    #private;
}
