/** @type {Map<symbol, string>} */
const symbols = new Map(
  Reflect.ownKeys(Symbol).map(
    key => [Symbol[key], `@${String(key)}`]
  )
);
  
/**
 * @param {symbol} value
 * @param {string} description
 * @returns {string}
 */
const asSymbol = (value, description) => (
  description == null ? '?' :
  (Symbol.keyFor(value) == null ? `!${description}` : `#${description}`)
);

/**
 * @param {string} name
 * @returns {symbol}
 */
export const fromSymbol = name => {
  switch (name[0]) {
    case '@': return Symbol[name.slice(1)];
    case '#': return Symbol.for(name.slice(1));
    case '!': return Symbol(name.slice(1));
    default: return Symbol();
  }
};

/**
 * @param {symbol} value
 * @returns {string}
 */
export const toSymbol = value => symbols.get(value) || asSymbol(value, value.description);
