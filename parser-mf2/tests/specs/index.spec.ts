import { describe, expect, it, vi } from 'vitest';
import { MessageDataModelError, MessageResolutionError, MessageSyntaxError } from 'messageformat';
import type { MessageFunction } from 'messageformat/functions';
import parser, { Parser } from '../../src';
import { TRANSLATIONS } from '../data';

const initLocale = 'en';
const altLocale = 'cs';

// FIRST STRONG ISOLATE and POP DIRECTIONAL ISOLATE: what the default bidi
// isolation wraps a placeholder of unknown direction in.
const FSI = '\u2068';
const PDI = '\u2069';

const message = (locale: string, key: string) => {
  const [namespace, ...path] = key.split('.');

  return TRANSLATIONS[locale]?.[namespace]?.[path.join('.')];
};

const defaultParser = parser({ onReport: null });

const localize = <P extends Parser.PayloadDefault = Parser.PayloadDefault>(locale: string, { parse }: Parser.T = defaultParser) => (key: string, ...params: Parser.Params<P>): string => parse(message(locale, key), params, locale, key);

describe('parser', () => {
  it('formats a message that does not exist as the empty string', () => {
    const $t = localize(initLocale);

    // Nothing to format, and the key is not read: what a missing translation
    // renders as is base's `fallbackValue`, not this parser's business.
    expect($t('common.undefined')).toBe('');
  });
  it('formats plain text as it is', () => {
    const { parse } = defaultParser;

    expect(parse('Hello!', [], initLocale, 'greeting')).toBe('Hello!');
  });
  it('substitutes a variable from the payload slot', () => {
    const $t = localize<{ name?: string }>(initLocale);

    expect($t('common.greeting', { name: 'Alice' })).toBe(`Hi ${FSI}Alice${PDI}!`);
  });
  it('forwards the locale to `:number` and `:integer`', () => {
    const value = 1234.5;
    const { parse } = defaultParser;
    const format = (key: string, locale: string) => parse(message(initLocale, key), [{ value }], locale, key);
    const number = (locale: string) => new Intl.NumberFormat(locale).format(value);
    const integer = (locale: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);

    expect(format('common.number', initLocale)).toBe(number(initLocale));
    expect(format('common.number', altLocale)).toBe(number(altLocale));
    expect(number(initLocale)).not.toBe(number(altLocale));

    expect(format('common.integer', initLocale)).toBe(integer(initLocale));
    expect(format('common.integer', altLocale)).toBe(integer(altLocale));
    expect(integer(initLocale)).not.toBe(integer(altLocale));
  });
  it('selects a variant by an exact key and by a plural category', () => {
    const $t = localize<{ count?: number }>(initLocale);

    expect($t('common.plural', { count: 0 })).toBe('No photos.');
    expect($t('common.plural', { count: 1 })).toBe('One photo.');
    expect($t('common.plural', { count: 1000 })).toBe('1,000 photos.');
  });
  it('selects a variant on a `:string` selector', () => {
    const $t = localize<{ gender?: string }>(initLocale);

    expect($t('common.select', { gender: 'female' })).toBe('She will respond shortly.');
    expect($t('common.select', { gender: 'unknown' })).toBe('They will respond shortly.');
  });
  it('registers the draft functions by default', () => {
    const value = new Date(Date.UTC(2024, 0, 15, 12));
    const $t = localize<{ value?: Date | number }>(initLocale);
    const date = new Intl.DateTimeFormat(initLocale, { year: 'numeric', month: 'long', day: 'numeric' }).format(value);

    expect($t('common.date', { value })).toBe(`Today is ${date}`);
    expect($t('common.currency', { value: 99.99 })).toBe('Total: $99.99');
  });
  it('takes `functions` over the draft ones', () => {
    const upper: MessageFunction<string> = (_context, _options, input) => ({ type: 'string', toString: () => String(input).toUpperCase() });
    const { parse } = parser({ onReport: null, functions: { upper, currency: upper } });
    const $t = localize<{ value?: string }>(initLocale, { parse });

    expect(parse('{$name :upper}', [{ name: 'alice' }], initLocale, 'shout')).toBe(`${FSI}ALICE${PDI}`);
    expect($t('common.currency', { value: 'x' })).toBe(`Total: ${FSI}X${PDI}`);
  });
  it('isolates a placeholder unless told not to', () => {
    const $t = localize<{ name?: string }>(initLocale);
    const $tNone = localize<{ name?: string }>(initLocale, parser({ onReport: null, bidiIsolation: 'none' }));

    expect($t('common.greeting', { name: 'Alice' })).toBe(`Hi ${FSI}Alice${PDI}!`);
    expect($tNone('common.greeting', { name: 'Alice' })).toBe('Hi Alice!');
  });
  it('returns the raw message for a syntax error, and reports it', () => {
    const reports: Parser.Report[] = [];
    const $t = localize<{ name?: string }>(initLocale, parser({ onReport: (report) => reports.push(report) }));

    expect($t('common.malformed', { name: 'Alice' })).toBe('Hi {$name');
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'common.malformed', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(MessageSyntaxError);
  });
  it('returns the raw message for a data model error, and reports it', () => {
    const reports: Parser.Report[] = [];
    const $t = localize<{ gender?: string }>(initLocale, parser({ onReport: (report) => reports.push(report) }));

    expect($t('common.unannotated', { gender: 'male' })).toBe(message(initLocale, 'common.unannotated'));
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'common.unannotated', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(MessageDataModelError);
  });
  it('renders a variable the payload lacks as its fallback, and reports it', () => {
    const reports: Parser.Report[] = [];
    const $t = localize(initLocale, parser({ onReport: (report) => reports.push(report) }));

    expect($t('common.greeting')).toBe(`Hi ${FSI}{$name}${PDI}!`);
    expect(reports).toMatchObject([{ code: 'fallback-value', key: 'common.greeting', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(MessageResolutionError);
    expect(reports[0]?.error).toMatchObject({ type: 'unresolved-variable' });
  });
  it('renders an expression naming a function nobody registered as its fallback, and reports it', () => {
    const reports: Parser.Report[] = [];
    const $t = localize<{ value?: number }>(initLocale, parser({ onReport: (report) => reports.push(report) }));

    expect($t('common.unknown_function', { value: 1 })).toBe(`${FSI}{$value}${PDI}`);
    expect(reports).toMatchObject([{ code: 'fallback-value', key: 'common.unknown_function', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(MessageResolutionError);
    expect(reports[0]?.error).toMatchObject({ type: 'unknown-function' });
  });
  it('repeated reads of one message stay correct', () => {
    const $t = localize<{ count?: number }>(initLocale);

    expect($t('common.plural', { count: 1 })).toBe('One photo.');
    expect($t('common.plural', { count: 1000 })).toBe('1,000 photos.');
    expect($t('common.plural', { count: 0 })).toBe('No photos.');
  });
  it('renders an object value as text, and reports nothing', () => {
    const reports: Parser.Report[] = [];
    const $t = localize<{ name?: unknown }>(initLocale, parser({ onReport: (report) => reports.push(report) }));

    expect($t('common.greeting', { name: { rich: 'value' } })).toBe(`Hi ${FSI}[object Object]${PDI}!`);
    expect(reports).toEqual([]);
  });
  it('treats a prototype-named payload key as data', () => {
    // Built by `JSON.parse`: a `__proto__` key in an object literal routes
    // through the prototype setter instead of becoming an own property.
    const payload: Parser.PayloadDefault = JSON.parse('{ "__proto__": { "polluted": true }, "constructor": "c", "toString": "t" }');
    const $t = localize(initLocale, parser({ onReport: null, bidiIsolation: 'none' }));

    expect($t('common.inherited', payload)).toBe('c t [object Object]');
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
  it('writes to no channel of its own', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warning = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined);

    try {
      const $t = localize<{ name?: string }>(initLocale);

      expect($t('common.greeting')).toBe(`Hi ${FSI}{$name}${PDI}!`);
      expect($t('common.malformed', { name: 'Alice' })).toBe('Hi {$name');
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
      expect(warning).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      error.mockRestore();
      warning.mockRestore();
    }
  });
  it('survives a report channel that throws', () => {
    const $t = localize<{ name?: string }>(initLocale, parser({ onReport: () => { throw new Error('channel down'); } }));

    expect($t('common.malformed', { name: 'Alice' })).toBe('Hi {$name');
    expect($t('common.greeting')).toBe(`Hi ${FSI}{$name}${PDI}!`);
  });
  it('accepts a locale it knows nothing about', () => {
    const { parse } = parser({ onReport: null, bidiIsolation: 'none' });

    expect(parse('Hi {$value}! {$n :number}', [{ value: 'x', n: 1234.5 }], 'zz-ZZ', 'greeting')).toBe('Hi x! 1,234.5');
  });
  it('returns a leaf that is no message as text, whatever it is', () => {
    const reports: Parser.Report[] = [];
    const { parse } = parser({ onReport: (report) => reports.push(report) });

    // The one primitive no concatenation can spell.
    expect(parse(Symbol('leaf'), [], initLocale, 'leaf')).toBe('Symbol(leaf)');
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'leaf', locale: initLocale }]);
  });
  it('renders a catalogue leaf that cannot become text as the empty string, and reports it', () => {
    const reports: Parser.Report[] = [];
    const { parse } = parser({ onReport: (report) => reports.push(report) });

    expect(parse(Object.create(null), [], initLocale, 'k')).toBe('');
    expect(parse({ toString: () => { throw new Error('unprintable'); } }, [], initLocale, 'k')).toBe('');
    expect(reports).toMatchObject([
      { code: 'failed-message', key: 'k', locale: initLocale },
      { code: 'failed-message', key: 'k', locale: initLocale },
    ]);
  });
});
