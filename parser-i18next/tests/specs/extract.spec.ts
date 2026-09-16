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
    expect(extractParams(message(initLocale, 'common.greeting'))).toEqual([{ name: 'name', kind: 'unknown', optional: false }]);
    expect(extractParams(message(initLocale, 'common.number'))).toEqual([{ name: 'n', kind: 'number', optional: false }]);
    expect(extractParams(message(initLocale, 'common.currency'))).toEqual([{ name: 'n', kind: 'number', optional: false }]);
    expect(extractParams(message(initLocale, 'common.ago'))).toEqual([{ name: 'd', kind: 'number', optional: false }]);
    expect(extractParams(message(initLocale, 'common.date'))).toEqual([{ name: 'd', kind: 'date', optional: false }]);
    // An array is what `list` takes, and no kind names one.
    expect(extractParams(message(initLocale, 'common.list'))).toEqual([{ name: 'l', kind: 'unknown', optional: false }]);
    expect(extractParams(message(initLocale, 'common.custom'))).toEqual([{ name: 'v', kind: 'unknown', optional: false }]);
  });

  it('reads the arguments a format spells out, and the first format of a chain', () => {
    expect(extractParams(message(initLocale, 'common.fraction'))).toEqual([{ name: 'n', kind: 'number', optional: false }]);
    expect(extractParams(message(initLocale, 'common.euro'))).toEqual([{ name: 'n', kind: 'number', optional: false }]);
    expect(extractParams(message(initLocale, 'common.long'))).toEqual([{ name: 'd', kind: 'date', optional: false }]);
    expect(extractParams(message(initLocale, 'common.hours'))).toEqual([{ name: 'd', kind: 'number', optional: false }]);
    expect(extractParams('{{ v , DateTime(dateStyle: long) , upper }}')).toEqual([{ name: 'v', kind: 'date', optional: false }]);
  });

  it('keeps a dotted path as spelled', () => {
    expect(extractParams(message(initLocale, 'common.dotted'))).toEqual([{ name: 'user.name', kind: 'unknown', optional: false }]);
  });

  it('strips the unescape marker', () => {
    expect(extractParams(message(initLocale, 'common.unescaped'))).toEqual([{ name: 'html', kind: 'unknown', optional: false }]);
    expect(extractParams('{{-html}} {{name}}')).toEqual([
      { name: 'html', kind: 'unknown', optional: false },
      { name: 'name', kind: 'unknown', optional: false },
    ]);
  });

  it('is built from the options the parser beside it is built from', () => {
    const options = { interpolation: { prefix: '${', suffix: '}', formatSeparator: '|', unescapePrefix: '+' } };
    const custom = '${n|number} ${+html} ${d|datetime}';

    expect(parser({ ...options, onReport: null }).parse(custom, [{ n: 1234.5, html: '<b>', d: new Date(2024, 2, 5) }], initLocale, 'k')).toBe('1,234.5 <b> 3/5/2024');
    expect(extractParamsFactory(options)(custom)).toEqual([
      { name: 'n', kind: 'number', optional: false },
      { name: 'html', kind: 'unknown', optional: false },
      { name: 'd', kind: 'date', optional: false },
    ]);
    expect(extractParamsFactory({ interpolation: { unescapeSuffix: '-' } })('{{html-}} {{name}}')).toEqual([
      { name: 'html', kind: 'unknown', optional: false },
      { name: 'name', kind: 'unknown', optional: false },
    ]);
  });

  it('reports a parameter once, saying what every mention of it says together', () => {
    expect(extractParams('{{v}} and {{v, number}}')).toEqual([{ name: 'v', kind: 'number', optional: false }]);
    expect(extractParams('{{v, datetime}} and {{v, number}}')).toEqual([{ name: 'v', kind: ['date', 'number'], optional: false }]);
    expect(extractParams('{{a}} {{b}} {{a}}')).toEqual([
      { name: 'a', kind: 'unknown', optional: false },
      { name: 'b', kind: 'unknown', optional: false },
    ]);
  });

  it('scans the text of a nesting like any other text', () => {
    expect(extractParams('$t(other, {"count": {{count}}}) and {{name}}')).toEqual([
      { name: 'count', kind: 'unknown', optional: false },
      { name: 'name', kind: 'unknown', optional: false },
    ]);
  });

  it('names nothing for a catalogue leaf that is no message', () => {
    expect(extractParams(message(initLocale, 'common.malformed'))).toEqual([]);
    expect(extractParams('{{name')).toEqual([]);
    expect(extractParams(message(initLocale, 'common.undefined'))).toEqual([]);
    expect(extractParams(42)).toEqual([]);
    expect(extractParams({ nested: 'object' })).toEqual([]);
  });

  it('takes the diagnostic context the contract declares, and reads the message without it', () => {
    const greeting = message(initLocale, 'common.greeting');

    expect(extractParams(greeting, { key: 'common.greeting', locale: initLocale })).toEqual(extractParams(greeting));
  });
});
