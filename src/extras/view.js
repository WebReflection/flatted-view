const { getPrototypeOf } = Object;
const { construct } = Reflect;
const { toStringTag } = Symbol;

const view = (ref, name = ref[toStringTag]) => (
  name in globalThis ?
    name :
    view(construct(getPrototypeOf(ref.constructor), [0]))
);

export default view;
