import { describe, expect, it } from 'vitest';
import parser, { extractParamsFactory } from '../../src';
import { TRANSLATIONS } from '../data';

const message = (locale: string, key: string) => {
  const [namespace, ...path] = key.split('.');

  return TRANSLATIONS[locale]?.[namespace]?.[path.join('.')];
};

const initLocale = 'en';

// What a message names is pinned by the reference implementation; these tests
// cover what the adapter adds: the build-time half of the base parser
// contract, reached through its own entry point and built from the options
// `parser()` is built from.
describe('extractParamsFactory', () => {
  it('names what a message expects of its payload', () => {
    const extractParams = extractParamsFactory();

    expect(extractParams(message(initLocale, 'common.greeting'))).toEqual([{ name: 'name', kind: 'unknown', optional: true }]);
    expect(extractParams(message(initLocale, 'common.number'))).toEqual([{ name: 'value', kind: 'number', optional: false }]);
    expect(extractParams(message(initLocale, 'common.date'))).toEqual([{ name: 'value', kind: ['date', 'string'], optional: false }]);
    expect(extractParams(message(initLocale, 'common.inherited'))).toEqual([
      { name: 'constructor', kind: 'unknown', optional: false },
      { name: 'toString', kind: 'unknown', optional: false },
      { name: '__proto__', kind: 'unknown', optional: false },
    ]);
  });

  it('names nothing for a catalogue leaf that is no message', () => {
    const extractParams = extractParamsFactory();

    expect(extractParams(message(initLocale, 'common.undefined'))).toEqual([]);
    expect(extractParams(42)).toEqual([]);
  });

  it('takes the diagnostic context the contract declares, and reads the message without it', () => {
    const extractParams = extractParamsFactory();
    const greeting = message(initLocale, 'common.greeting');

    expect(extractParams(greeting, { key: 'common.greeting', locale: initLocale })).toEqual(extractParams(greeting));
  });

  it('is built from the options the parser beside it is built from', () => {
    const customModifiers = { test: ({ value }: { value: string }) => value };
    const custom = message(initLocale, 'common.custom');
    const { parse } = parser({ customModifiers, onReport: null });

    expect(parse(custom, [{ value: 'X' }], initLocale, 'common.custom')).toBe('X');
    expect(extractParamsFactory({ customModifiers })(custom)).toEqual([{ name: 'value', kind: 'unknown', optional: false }]);
  });

  it('reads a modifier the message names but nobody registered as narrowing nothing', () => {
    expect(extractParamsFactory()(message(initLocale, 'common.unknown_modifier'))).toEqual([{ name: 'value', kind: 'unknown', optional: true }]);
  });

  it('names the placeholder holding a nested one beside it', () => {
    expect(extractParamsFactory()('{{a:eq; x:{{b}}; default:-;}}')).toEqual([
      { name: 'a', kind: 'unknown', values: ['x'], optional: true },
      { name: 'b', kind: 'unknown', optional: false },
    ]);
  });
});
