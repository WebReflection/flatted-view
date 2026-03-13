export function encode(data: unknown, { output, custom, set }?: Options): Output;
export function view(value: number[] | Uint8Array): View;
export default encode;
export type custom = (value: unknown) => unknown | View;
export type Shared = import("./shared.js").default;
export type Output = number[] | Shared;
export type Options = {
    output?: Output;
    custom?: custom;
    set?: boolean;
};
declare class View {
    /**
     * @param {number[] | Uint8Array} value
     */
    constructor(value: number[] | Uint8Array);
    #private;
}
