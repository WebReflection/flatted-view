export const ASCII = {
  encode(value) {
    const output = [];
    for (let i = 0; i < value.length; i++)
      output.push(value.charCodeAt(i));
    return output;
  },
  decode: value => String.fromCharCode(...value),
};
