export default (expected, actual) => {
  if (expected !== actual) {
    console.error('Expected', expected, 'but got', actual);
    throw new Error('Assertion failed');
  }
};
