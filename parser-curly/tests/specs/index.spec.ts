import { describe, expect, it, vi } from 'vitest';
import parser, { Modifier, Parser, Report } from '../../src';
import { TRANSLATIONS } from '../data';

const initLocale = 'en';
const altLocale = 'cs';

const message = (locale: string, key: string) => {
  const [namespace, ...path] = key.split('.');

  return TRANSLATIONS[locale]?.[namespace]?.[path.join('.')];
};

const defaultParser = parser({ onReport: null });

const localize = <P = Parser.PayloadDefault, M = Modifier.DefaultProps>(locale: string, { parse }: Parser.T = defaultParser) => (key: string, ...params: Parser.Params<P, M>): string => parse(message(locale, key), params, locale, key);

// The format itself is pinned by the conformance set (conformance.spec.ts);
// these tests cover what the adapter adds: base's calling convention unpacked
// into the neutral parser's, and a report channel the host has to state.
describe('parser', () => {
  it('echoes the key of a message that does not exist', () => {
    const $t = localize(initLocale);

    expect($t('common.undefined')).toBe('common.undefined');
  });
  it('resolves placeholders from the payload slot', () => {
    const $t = localize<{ name?: string }>(initLocale);

    expect($t('common.greeting', { name: 'Alice' })).toBe('Hello, Alice!');
    expect($t('common.greeting')).toBe('Hello, Guest!');
  });
  it('hands the props slot to a formatting modifier, layered over `modifierDefaults`', () => {
    const value = 1234.56789;
    const $t = localize<{ value?: number }>(initLocale);
    const $tDefaults = localize<{ value?: number }>(initLocale, parser({ onReport: null, modifierDefaults: { number: { maximumFractionDigits: 4, useGrouping: false } } }));

    expect($t('common.number', { value })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 2 }).format(value));
    expect($t('common.number', { value }, { number: { maximumFractionDigits: 1 } })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 1 }).format(value));
    expect($tDefaults('common.number', { value })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 4, useGrouping: false }).format(value));
    expect($tDefaults('common.number', { value }, { number: { useGrouping: true } })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 4, useGrouping: true }).format(value));
  });
  it('forwards the locale', () => {
    const value = 1234567.891;
    const stamp = Date.UTC(2024, 2, 5, 10);
    const $t = localize<{ value?: number }>(initLocale);
    const $tAlt = localize<{ value?: number }>(altLocale);
    const number = (locale: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value);
    const date = (locale: string) => new Intl.DateTimeFormat(locale).format(stamp);

    expect($t('common.number', { value })).toBe(number(initLocale));
    expect($tAlt('common.number', { value })).toBe(number(altLocale));
    expect(number(initLocale)).not.toBe(number(altLocale));

    expect($t('common.date', { value: stamp })).toBe(date(initLocale));
    expect($tAlt('common.date', { value: stamp })).toBe(date(altLocale));
    expect(date(initLocale)).not.toBe(date(altLocale));
  });
  it('forwards the key into reports', () => {
    const reports: Report[] = [];
    const $t = localize<{ value?: string }>(initLocale, parser({ onReport: (report) => { reports.push(report); } }));

    expect($t('common.unknown_modifier', { value: 'V' })).toBe('FALLBACK');
    expect(reports.map(({ key }) => key)).toEqual(['common.unknown_modifier']);
  });
  it('hands `customModifiers` the value, the locale and their own props', () => {
    const seen: unknown[] = [];
    const $t = localize<{ value?: string }, { test?: { unit?: string } }>(initLocale, parser<{ value?: string }, { test?: { unit?: string } }>({
      onReport: null,
      customModifiers: {
        test: ({ value, locale, props }) => { seen.push({ value, locale, props }); return `${value.toUpperCase()}!`; },
      },
    }));

    expect($t('common.custom', { value: 'hit' }, { test: { unit: 'kg' }, number: { useGrouping: false } })).toBe('HIT!');
    expect($t('common.custom', { value: 'hit' })).toBe('HIT!');
    expect(seen).toEqual([
      { value: 'hit', locale: initLocale, props: { unit: 'kg' } },
      { value: 'hit', locale: initLocale, props: {} },
    ]);
  });
  it('reads a wrapper entry through the tuple', () => {
    const $t = localize<{ value?: number | string }>(initLocale);

    expect($t('common.number', { value: { value: 1234.56, props: { number: { maximumFractionDigits: 1 } } } })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 1 }).format(1234.56));
    expect($t('common.placeholder', { value: { default: 'WRAPPED' } })).toBe('WRAPPED');
  });
  it('writes nowhere under `onReport: null`', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      const $t = localize<{ value?: string }>(initLocale);

      expect($t('common.unknown_modifier', { value: 'V' })).toBe('FALLBACK');
      expect($t('common.placeholder', { value: '{{value}}' })).toBe('{{value}}');
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
      error.mockRestore();
    }
  });
  it('hands reports to the host `onReport`', () => {
    const reports: Report[] = [];
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    try {
      const $t = localize<{ value?: string }>(initLocale, parser({ onReport: (report) => { reports.push(report); } }));

      expect($t('common.unknown_modifier', { value: 'V' })).toBe('FALLBACK');
      expect(reports).toEqual([{
        code: 'unknown-modifier',
        origin: 'message',
        message: expect.any(String),
        key: 'common.unknown_modifier',
        text: '{{value:nosuch; default:FALLBACK;}}',
      }]);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
  it('works with `onReport` alone, and without it at runtime', () => {
    const { parse } = parser({ onReport: null });
    // @ts-expect-error `onReport` is required; a caller past the types is silent
    const { parse: untyped } = parser();

    expect(parse('Hello, {{name}}!', [{ name: 'Alice' }], initLocale, 'greeting')).toBe('Hello, Alice!');
    expect(parse(undefined, [], initLocale, 'greeting')).toBe('greeting');
    expect(untyped('Hello, {{name:nosuch; default:D}}!', [{ name: 'Alice' }], initLocale, 'greeting')).toBe('Hello, D!');
  });
  it('resolves nothing from a payload\'s prototype', () => {
    const $t = localize<{ [key: string]: any }>(initLocale);

    expect($t('common.inherited', {})).toBe('VALUES: , , ');
    expect($t('common.inherited', { constructor: 'OWN' })).toBe('VALUES: OWN, , ');
    expect($t('common.placeholder', Object.create({ value: 'INHERITED', default: 'INHERITED' }))).toBe('');
    expect($t('common.undefined', Object.create({ default: 'INHERITED' }))).toBe('common.undefined');
  });
});
