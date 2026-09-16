import { describe, expect, it, vi } from 'vitest';
import parser, { Parser } from '../../src';
import { TRANSLATIONS } from '../data';

const initLocale = 'en';

const message = (locale: string, key: string) => {
  const [namespace, ...path] = key.split('.');

  return TRANSLATIONS[locale]?.[namespace]?.[path.join('.')];
};

const defaultParser = parser({ onReport: null });

const localize = <P extends Parser.PayloadDefault = Parser.PayloadDefault>(locale: string, { parse }: Parser.T = defaultParser) => (key: string, ...params: Parser.Params<P>): string => parse(message(locale, key), params, locale, key);

// A payload value the engine cannot turn into text is the one way to make
// `interpolate` throw, so it is how the failure path is reached below.
const unprintable = { toString: () => { throw new Error('unprintable'); } };

// Local time both ways, so the expectation does not depend on the zone the
// suite runs in.
const date = new Date(2024, 2, 5);

describe('parser', () => {
  it('formats a message that does not exist as the empty string', () => {
    const $t = localize(initLocale);

    // Nothing to format, and the key is not read: what a missing translation
    // renders as is base's `fallbackValue`, not this parser's business.
    expect($t('common.undefined')).toBe('');
  });
  it('renders a catalogue leaf that is not text as its string', () => {
    const { parse } = defaultParser;

    expect(parse(42, [], initLocale, 'k')).toBe('42');
    expect(parse(true, [], initLocale, 'k')).toBe('true');
    expect(parse(null, [], initLocale, 'k')).toBe('null');
    expect(parse(['a', 'b'], [], initLocale, 'k')).toBe('a,b');
  });
  it('renders a catalogue leaf that cannot become text as the empty string, and reports it', () => {
    const reports: Parser.Report[] = [];
    const { parse } = parser({ onReport: (report) => reports.push(report) });

    expect(parse(Object.create(null), [], initLocale, 'k')).toBe('');
    expect(parse(unprintable, [], initLocale, 'k')).toBe('');
    expect(reports).toMatchObject([
      { code: 'failed-message', key: 'k', locale: initLocale },
      { code: 'failed-message', key: 'k', locale: initLocale },
    ]);
    expect(reports[1]?.error).toBeInstanceOf(Error);
  });
  it('interpolates variables', () => {
    const $t = localize<{ name?: string }>(initLocale);

    expect($t('common.greeting', { name: 'Alice' })).toBe('Hi Alice!');
  });
  it('keeps the placeholder of a value the payload lacks', () => {
    const $t = localize<{ name?: string }>(initLocale);

    expect($t('common.greeting')).toBe('Hi {{name}}!');
    expect($t('common.greeting', {})).toBe('Hi {{name}}!');
  });
  it('honours `missingInterpolationHandler`', () => {
    const $t = localize<{ name?: string }>(initLocale, parser({ onReport: null, missingInterpolationHandler: (_text, match: RegExpExecArray) => `[${match[1]}?]` }));

    expect($t('common.greeting', {})).toBe('Hi [name?]!');
    expect($t('common.greeting', { name: 'Alice' })).toBe('Hi Alice!');
  });
  it('escapes nothing by default, and escapes when `escapeValue` is set', () => {
    const html = { html: '<b>&' };
    const $t = localize<{ html?: string }>(initLocale);
    const $escaping = localize<{ html?: string }>(initLocale, parser({ onReport: null, interpolation: { escapeValue: true } }));

    expect($t('common.unescaped', html)).toBe('<b>&');
    expect(defaultParser.parse('{{html}}', [html], initLocale, 'k')).toBe('<b>&');
    expect($escaping('common.unescaped', html)).toBe('<b>&');
    expect(parser({ onReport: null, interpolation: { escapeValue: true } }).parse('{{html}}', [html], initLocale, 'k')).toBe('&lt;b&gt;&amp;');
    // Only a stated `true` turns escaping on: i18next reads an undefined as
    // its own default, which is the one this parser sets differently.
    expect(parser({ onReport: null, interpolation: { escapeValue: undefined } }).parse('{{html}}', [html], initLocale, 'k')).toBe('<b>&');
  });
  it('reads a dotted path into the payload', () => {
    const $t = localize<{ user?: { name: string } }>(initLocale);

    expect($t('common.dotted', { user: { name: 'Bob' } })).toBe('Hello Bob!');
  });
  it('formats with the built-in formats, in the locale of the call', () => {
    const $en = localize(initLocale);
    const $cs = localize('cs');

    expect($en('common.number', { n: 1234.5 })).toBe('1,234.5');
    expect($cs('common.number', { n: 1234.5 })).toBe('1 234,5');
    expect($en('common.currency', { n: 1234.5 })).toBe('$1,234.50');
    expect($en('common.date', { d: date })).toBe('3/5/2024');
    expect($cs('common.date', { d: date })).toBe('5. 3. 2024');
    expect($en('common.ago', { d: -3 })).toBe('3 days ago');
    expect($cs('common.ago', { d: -3 })).toBe('před 3 dny');
    expect($en('common.list', { l: ['a', 'b', 'c'] })).toBe('a, b, and c');
    expect($cs('common.list', { l: ['a', 'b', 'c'] })).toBe('a, b a c');
  });
  it('reads the arguments a format spells out', () => {
    const $en = localize(initLocale);
    const $de = localize('de');

    expect($en('common.fraction', { n: 5 })).toBe('5.00');
    expect($de('common.euro', { n: 1234.5 })).toBe('1.234,5 €');
    expect($en('common.long', { d: date })).toBe('March 5, 2024');
    expect($en('common.hours', { d: 3 })).toBe('in 3 hours');
  });
  it('applies per-call `formatParams` from the second argument', () => {
    const $t = localize(initLocale);

    expect($t('common.date', { d: date }, { formatParams: { d: { dateStyle: 'long' } } })).toBe('March 5, 2024');
    expect($t('common.number', { n: 1234.5 }, { formatParams: { n: { maximumFractionDigits: 0 } } })).toBe('1,235');
    expect($t('common.date', { d: date })).toBe('3/5/2024');
  });
  it('builds an `Intl` formatter per render rather than keeping one per payload', () => {
    // i18next's cache of its built-in formatters is keyed by the whole payload,
    // so a payload that differs per request would grow it for the life of the
    // process.
    const $t = localize(initLocale, parser({ onReport: null }));
    const { NumberFormat } = Intl;
    // Returned rather than constructed in place: the spy constructs with itself
    // as `new.target`, which leaves the instance without the real prototype.
    const built = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (locales, options) {
      return new NumberFormat(locales, options);
    });

    expect($t('common.number', { n: 1234.5 })).toBe('1,234.5');
    expect($t('common.number', { n: 1234.5 })).toBe('1,234.5');
    expect(built).toHaveBeenCalledTimes(2);

    built.mockRestore();
  });
  it('registers custom `formats`, per parser instance', () => {
    const $t = localize(initLocale, parser({ onReport: null, formats: { upper: (value) => String(value).toUpperCase() } }));
    const $other = localize(initLocale);

    expect($t('common.custom', { v: 'abc' })).toBe('ABC');
    expect($other('common.custom', { v: 'abc' })).toBe('abc');
  });
  it('renders a value under a format nobody registered as its string', () => {
    const $t = localize(initLocale);

    expect($t('common.unknown', { n: 1234.5 })).toBe('1234.5');
  });
  it('renders nesting as the text it is written as', () => {
    const $t = localize(initLocale);

    expect($t('common.nested', { v: 'x' })).toBe('$t(greeting) and x');
  });
  it('treats a prototype-named payload key as data', () => {
    const { parse } = defaultParser;

    expect(parse('{{toString}}', [{}], initLocale, 'k')).toBe('{{toString}}');
    expect(parse('{{constructor}}', [{}], initLocale, 'k')).toBe('{{constructor}}');
    expect(parse('{{constructor}}', [{ constructor: 'c' }], initLocale, 'k')).toBe('c');
    expect(parse('{{value}}', [JSON.parse('{ "__proto__": { "polluted": true }, "value": "x" }')], initLocale, 'k')).toBe('x');
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
  it('accepts a locale it knows nothing about', () => {
    const { parse } = defaultParser;

    expect(parse(message(initLocale, 'common.number'), [{ n: 1234.5 }], 'zz-ZZ', 'k')).toBe('1,234.5');
    expect(parse(message(initLocale, 'common.number'), [{ n: 1234.5 }], '!!', 'k')).toBe('1234.5');
  });
  it('returns the raw message when the engine throws, and reports it', () => {
    const reports: Parser.Report[] = [];
    const $t = localize(initLocale, parser({ onReport: (report) => reports.push(report) }));

    expect($t('common.greeting', { name: unprintable })).toBe('Hi {{name}}!');
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'common.greeting', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(Error);
  });
  it('writes to no channel of its own', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const $t = localize(initLocale, parser({ onReport: null, formats: { upper: (value) => String(value).toUpperCase() } }));

    expect($t('common.greeting')).toBe('Hi {{name}}!');
    expect($t('common.unknown', { n: 1 })).toBe('1');
    expect($t('common.nested', {})).toBe('$t(greeting) and {{v}}');
    expect(defaultParser.parse('$t(greeting, {"v": "{{v}}"})', [{ v: 'x' }], initLocale, 'k')).toBe('$t(greeting, {"v": "x"})');
    expect($t('common.greeting', { name: unprintable })).toBe('Hi {{name}}!');
    expect(log).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();

    log.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });
  it('survives a report channel that throws', () => {
    const $t = localize(initLocale, parser({ onReport: () => { throw new Error('channel down'); } }));

    expect($t('common.greeting', { name: unprintable })).toBe('Hi {{name}}!');
  });
});
