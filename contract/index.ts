/**
 * The call base makes, spelled here rather than imported: this module is shared
 * by packages that each carry their own `node_modules`, so it resolves nothing
 * of its own - no types, no test runner.
 */
type Parse = (value: any, params: any, locale: string, key: string) => unknown;

/**
 * The parser under test, with messages written in its own format. Everything
 * below exercises base's calling convention rather than what a message means,
 * so a format supplies the text and the checks stay format-agnostic.
 */
export type Subject = {
  parser: { parse: Parse };
  messages: {
    /** Text naming no parameter. */
    plain: string;
    /** Text naming exactly one parameter, keyed `value`. */
    parameterized: string;
    /** Text the parser cannot compile. */
    malformed: string;
  };
};

/** One requirement base places on every parser. Throws when the subject breaks it. */
export type Check = {
  name: string;
  run: (subject: Subject) => void;
};

const LOCALE = 'en';
const KEY = 'contract.check';

const assert = (held: boolean, message: string) => {
  if (!held) throw new Error(message);
};

const call = ({ parser }: Subject, value: unknown, params: readonly unknown[] = []) => parser.parse(value, params, LOCALE, KEY);

/**
 * What base guarantees a parser and requires back, as a set of checks each
 * shipped parser runs against itself. A format's own conformance set certifies
 * what its messages MEAN; this one certifies that a parser can be called the
 * way base calls it.
 *
 * Every check states a requirement the base docs' parser contract spells out.
 * Breaking one throws out of `t()`, which is a render - except where a check
 * notes that base makes no such call.
 */
export const CONTRACT_CHECKS: readonly Check[] = [
  {
    name: 'exposes parse as a function',
    run: ({ parser }) => {
      assert(typeof parser.parse === 'function', 'parse is not a function');
    },
  },
  {
    name: 'answers an undefined message rather than throwing',
    run: (subject) => {
      // Base answers a key resolving to no translation itself and never hands
      // one over, so this is the direct call: a parser is a public function
      // too. What it answers WITH is the format's to decide.
      assert(call(subject, undefined) !== undefined, 'an undefined message yielded nothing to render');
    },
  },
  {
    name: 'accepts an argumentless call',
    run: (subject) => {
      call(subject, subject.messages.plain, []);
    },
  },
  {
    name: 'accepts params the message does not name',
    run: (subject) => {
      call(subject, subject.messages.plain, [{ unnamed: 'surplus' }, { alsoUnnamed: true }, 'trailing']);
    },
  },
  {
    name: 'accepts a message naming a parameter the payload omits',
    run: (subject) => {
      call(subject, subject.messages.parameterized, [{}]);
      call(subject, subject.messages.parameterized, []);
    },
  },
  {
    name: 'accepts a catalogue leaf that is not text',
    run: (subject) => {
      [42, true, null, ['a', 'b'], { nested: 'object' }].forEach((leaf) => call(subject, leaf, [{ value: 'x' }]));
    },
  },
  {
    name: 'contains a catalogue leaf that cannot become text',
    run: (subject) => {
      // A null-prototype object has no `toString` to call, and one that throws
      // is the other way `String()` can fail.
      [Object.create(null), { toString: () => { throw new Error('unprintable'); } }].forEach((leaf) => call(subject, leaf, [{ value: 'x' }]));
    },
  },
  {
    name: 'contains the failure of a message it cannot compile',
    run: (subject) => {
      assert(call(subject, subject.messages.malformed, [{ value: 'x' }]) !== undefined, 'a malformed message yielded nothing to render');
    },
  },
  {
    name: 'accepts a locale it knows nothing about',
    run: ({ parser, messages }) => {
      parser.parse(messages.parameterized, [{ value: 'x' }], 'zz-ZZ', KEY);
    },
  },
  {
    name: 'treats a prototype-named payload key as data',
    run: (subject) => {
      // Built by `JSON.parse`: a `__proto__` key in an object literal routes
      // through the prototype setter instead of becoming an own property.
      const payload: unknown = JSON.parse('{ "__proto__": { "polluted": true }, "constructor": "c", "toString": "t", "value": "x" }');

      call(subject, subject.messages.parameterized, [payload]);

      assert((({}) as Record<string, unknown>)['polluted'] === undefined, 'a payload key reached Object.prototype');
    },
  },
  {
    name: 'answers the same call the same way twice',
    run: (subject) => {
      const params = [{ value: 'x' }];
      const first = call(subject, subject.messages.parameterized, params);
      const second = call(subject, subject.messages.parameterized, params);

      assert(JSON.stringify(first) === JSON.stringify(second), 'two identical calls answered differently');
    },
  },
];
