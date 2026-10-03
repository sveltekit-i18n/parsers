// What `npm run bench` measures of this parser: one message per kind, in
// i18next's syntax. `n` makes each message distinct, and `output` is what the
// parser must render, checked before anything is timed. i18next selects a
// plural by key suffix, outside the message, so there is no plural label. The
// parser keeps no compiled message, so a message parsed again costs what it did
// the first time, less what the engine keeps of the string.
export default {
  options: {},
  labels: {
    'plain text': {
      message: (n) => `Welcome back, visitor ${n}.`,
      params: [],
      output: (n) => `Welcome back, visitor ${n}.`,
      names: [],
    },
    'one placeholder': {
      message: (n) => `Hello, {{name}}, visitor ${n}.`,
      params: [{ name: 'Ada' }],
      output: (n) => `Hello, Ada, visitor ${n}.`,
      names: ['name'],
    },
    number: {
      message: (n) => `Order ${n} totals {{amount, number}}.`,
      params: [{ amount: 1234.5 }],
      output: (n) => `Order ${n} totals 1,234.5.`,
      names: ['amount'],
    },
    date: {
      message: (n) => `Event ${n} starts {{at, datetime}}.`,
      params: [{ at: 0 }],
      output: (n) => `Event ${n} starts 1/1/1970.`,
      names: ['at'],
    },
  },
};
