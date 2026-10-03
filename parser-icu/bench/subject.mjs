// What `npm run bench` measures of this parser: one message per kind, in ICU
// MessageFormat. `n` makes each message distinct, and `output` is what the
// parser must render, checked before anything is timed. The parser keeps up to
// 10,000 compiled messages, so a message parsed again skips the compilation.
export default {
  options: {},
  cached: 10_000,
  labels: {
    'plain text': {
      message: (n) => `Welcome back, visitor ${n}.`,
      params: [],
      output: (n) => `Welcome back, visitor ${n}.`,
      names: [],
    },
    'one placeholder': {
      message: (n) => `Hello, {name}, visitor ${n}.`,
      params: [{ name: 'Ada' }],
      output: (n) => `Hello, Ada, visitor ${n}.`,
      names: ['name'],
    },
    plural: {
      message: (n) => `Cart ${n} holds {count, plural, one {# item} other {# items}}.`,
      params: [{ count: 3 }],
      output: (n) => `Cart ${n} holds 3 items.`,
      names: ['count'],
    },
    select: {
      message: (n) => `{gender, select, female {She} male {He} other {They}} replied to thread ${n}.`,
      params: [{ gender: 'female' }],
      output: (n) => `She replied to thread ${n}.`,
      names: ['gender'],
    },
    number: {
      message: (n) => `Order ${n} totals {amount, number}.`,
      params: [{ amount: 1234.5 }],
      output: (n) => `Order ${n} totals 1,234.5.`,
      names: ['amount'],
    },
    date: {
      message: (n) => `Event ${n} starts {at, date}.`,
      params: [{ at: 0 }],
      output: (n) => `Event ${n} starts 1/1/1970.`,
      names: ['at'],
    },
  },
};
