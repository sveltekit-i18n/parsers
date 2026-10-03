// What `npm run bench` measures of this parser: one message per kind, in the
// Curly Message Format. `n` makes each message distinct, and `output` is what
// the parser must render, checked before anything is timed. The parser keeps
// no compiled message, so a message parsed again costs what it did the first
// time, less what the engine keeps of the string.
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
    plural: {
      message: (n) => `Cart ${n} holds {{count}} {{count:plural; one:item; other:items;}}.`,
      params: [{ count: 3 }],
      output: (n) => `Cart ${n} holds 3 items.`,
      names: ['count'],
    },
    select: {
      message: (n) => `{{gender; female:She; male:He; default:They;}} replied to thread ${n}.`,
      params: [{ gender: 'female' }],
      output: (n) => `She replied to thread ${n}.`,
      names: ['gender'],
    },
    number: {
      message: (n) => `Order ${n} totals {{amount:number;}}.`,
      params: [{ amount: 1234.5 }],
      output: (n) => `Order ${n} totals 1,234.5.`,
      names: ['amount'],
    },
    date: {
      message: (n) => `Event ${n} starts {{at:date;}}.`,
      params: [{ at: 0 }],
      output: (n) => `Event ${n} starts 1/1/1970.`,
      names: ['at'],
    },
  },
};
