import { FluentResource } from '@fluent/bundle';
import type { Message } from '@fluent/bundle';

/** What a message compiles to: its pattern, `null` for an empty one. */
export type Pattern = Message['value'];

// `@fluent/bundle` reads a run of spaces with regexes whose time grows with
// the square of its length: 10,000 of them take about 0.1 s, 40,000 two.
const SPACES = ' '.repeat(1001);

// `@fluent/bundle` looks for the next entry from where the last one's id
// ended, not from where its value did, so every `name =` after a line
// separator in the value starts an entry that reads the rest of the value
// again.
const ENTRY_START = /[\u2028\u2029]-?[a-zA-Z][\w-]* *=/;

// Fluent indents with spaces alone, and ends no line at a lone carriage
// return. Outside a placeable, a line after the first whose indent holds
// another blank ends the pattern, or keeps the spaces every line is indented
// with here, and a lone carriage return drops the spaces after it or ends the
// pattern; inside one, the syntax allows no such blank either.
const LINE_START = /\r(?!\n)|\n *[^\S\r\n ]/;

// The id the value is compiled under, and the name of the attribute that
// proves the value compiled whole: a name the value does not hold, so no
// attribute it writes is the sentinel. A suffix one digit longer than any the
// value spells after `fluent-` names nothing in it.
const tokenFor = (value: string): string => {
  if (!value.includes('fluent')) return 'fluent';

  let digits = 0;

  for (const [, run] of value.matchAll(/fluent-(\d*)/g)) digits = Math.max(digits, run.length);

  return `fluent-${'1'.repeat(digits + 1)}`;
};

/**
 * Compiles a value as the pattern of one Fluent message - what follows
 * `id =` in a Fluent file. Every line after the first is indented, so the
 * value stays inside the one entry, and an attribute after it proves the
 * value was read to its end: `@fluent/bundle` skips what it cannot read
 * without a word, and a line starting with `[`, `*`, `.` or `}` ends a
 * pattern. Throws when the value is not one pattern.
 */
export const compile = (value: string): Pattern => {
  if (value.includes(SPACES)) {
    throw new RangeError('The message holds a run of more than 1,000 spaces, which Fluent reads in quadratic time.');
  }

  if (ENTRY_START.test(value)) {
    throw new RangeError('The message holds a line separator followed by `name =`, which Fluent reads as another entry, and reads the rest of the message for it again.');
  }

  if (LINE_START.test(value)) {
    throw new SyntaxError('The message is not one Fluent pattern: the indent of a line after the first holds a blank other than a space, or a carriage return stands without a line feed.');
  }

  const token = tokenFor(value);
  const source = `${token} = ${value.replace(/\r?\n/g, '\n    ')}\n    .${token} = x\n`;
  // A message nested deeply enough overflows the stack of the reader.
  const message = new FluentResource(source).body.find(({ id }) => id === token);
  const attributes = message === undefined ? [] : Object.keys(message.attributes);

  if (message === undefined || attributes.length !== 1 || attributes[0] !== token) {
    throw new SyntaxError('The message is not one Fluent pattern: a placeable may be left open, or a line may start with `[`, `*`, `.` or `}`.');
  }

  return message.value;
};
