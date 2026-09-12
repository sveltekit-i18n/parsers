import { describe, expect, it } from 'vitest';
import parser, { extractParamsFactory } from '../../src';
import { TRANSLATIONS } from '../data';

const initLocale = 'en';

const message = (locale: string, key: string) => {
  const [namespace, ...path] = key.split('.');

  return TRANSLATIONS[locale]?.[namespace]?.[path.join('.')];
};

const extractParams = extractParamsFactory();

// The build-time half of the base parser contract, reached through the same
// entry point as the parser and built from the same options.
describe('extractParamsFactory', () => {
  it('names what a message expects of its payload', () => {
    expect(extractParams(message(initLocale, 'common.missing'))).toEqual([{ name: 'name', kind: 'unknown', optional: false }]);
    expect(extractParams(message(initLocale, 'common.number'))).toEqual([{ name: 'value', kind: 'number', optional: false }]);
    expect(extractParams(message(initLocale, 'common.date'))).toEqual([{ name: 'value', kind: 'date', optional: false }]);
    expect(extractParams(message(initLocale, 'common.selectordinal'))).toEqual([{ name: 'value', kind: 'number', optional: false }]);
    expect(extractParams('At {value, time, short}')).toEqual([{ name: 'value', kind: 'date', optional: false }]);
  });

  it('names the values a selector lists, and only where they are values', () => {
    // A plural's exact matches are values; `one`/`few`/`other` are categories
    // the locale decides for a number the caller does not choose.
    expect(extractParams(message(initLocale, 'common.plural'))).toEqual([
      { name: 'value', kind: 'number', values: ['0', '1'], optional: false },
    ]);
    expect(extractParams(message(initLocale, 'common.select'))).toEqual([
      { name: 'value', kind: 'string', values: ['male', 'female'], optional: false },
    ]);
  });

  it('reads a tag as the callback the payload carries', () => {
    expect(extractParams('Hi <b>{name}</b>')).toEqual([
      { name: 'b', kind: 'function', optional: false },
      { name: 'name', kind: 'unknown', optional: false },
    ]);
  });

  it('is built from the options the parser beside it is built from', () => {
    const options = { ignoreTag: true };
    const tagged = 'Hi <b>{name}</b>';

    expect(parser(options).parse(tagged, [{ name: 'Jarda' }], initLocale, 'k')).toBe('Hi <b>Jarda</b>');
    expect(extractParamsFactory(options)(tagged)).toEqual([{ name: 'name', kind: 'unknown', optional: false }]);
  });

  it('reports a parameter only some branches use as optional, under the branches it sits in', () => {
    expect(extractParams('{count, plural, one {{name} has one} other {{name} has #}}')).toEqual([
      { name: 'count', kind: 'number', optional: false },
      { name: 'name', kind: 'unknown', optional: true, when: [{ param: 'count', branch: 'one' }] },
    ]);
    expect(extractParams('{a, select, x {{b, select, y {{c}} other {}}} other {}}')).toEqual([
      { name: 'a', kind: 'string', values: ['x'], optional: false },
      { name: 'b', kind: 'string', values: ['y'], optional: true, when: [{ param: 'a', branch: 'x' }] },
      { name: 'c', kind: 'unknown', optional: true, when: [{ param: 'a', branch: 'x' }, { param: 'b', branch: 'y' }] },
    ]);
  });

  it('reports a parameter once, saying what every mention of it says together', () => {
    expect(extractParams('{v} and {v, number}')).toEqual([{ name: 'v', kind: 'number', optional: false }]);
    expect(extractParams('{v, date, short} and {v, number}')).toEqual([{ name: 'v', kind: ['date', 'number'], optional: false }]);
    // Named outside every branch once, it is expected outright.
    expect(extractParams('{name} and {count, plural, other {{name}}}')).toEqual([
      { name: 'name', kind: 'unknown', optional: false },
      { name: 'count', kind: 'number', optional: false },
    ]);
  });

  it('names nothing for a catalogue leaf that is no message', () => {
    expect(extractParams(message(initLocale, 'common.malformed'))).toEqual([]);
    expect(extractParams(message(initLocale, 'common.undefined'))).toEqual([]);
    expect(extractParams(42)).toEqual([]);
    expect(extractParams({ nested: 'object' })).toEqual([]);
  });

  it('takes the diagnostic context the contract declares, and reads the message without it', () => {
    const missing = message(initLocale, 'common.missing');

    expect(extractParams(missing, { key: 'common.missing', locale: initLocale })).toEqual(extractParams(missing));
  });
});
