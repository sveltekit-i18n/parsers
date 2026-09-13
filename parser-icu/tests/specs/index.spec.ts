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

describe('parser', () => {
  it('formats a message that does not exist as the empty string', () => {
    const $t = localize(initLocale);

    // Nothing to format, and the key is not read: what a missing translation
    // renders as is base's `fallbackValue`, not this parser's business.
    expect($t('common.undefined')).toBe('');
  });
  it('`plural` formatter works', () => {
    const $t = localize<{ value?: number }>(initLocale);

    expect($t('common.plural', { value: 1000 })).toBe('You have 1,000 photos.');
  });
  it('`select` formatter works', () => {
    const $t = localize<{ value?: string }>(initLocale);

    expect($t('common.select', { value: 'female' })).toBe('She will respond shortly.');
  });
  it('`selectordinal` formatter works', () => {
    const $t = localize<{ value?: number }>(initLocale);

    expect($t('common.selectordinal', { value: 3 })).toBe("It's my cat's 3rd birthday");
  });
  it('`number` formatter works', () => {
    const $t = localize<{ value?: number }>(initLocale);

    expect($t('common.number', { value: 1000 })).toBe('The price is: €1,000.00');
  });
  it('`date` formatter works', () => {
    const $t = localize<{ value?: number }>(initLocale);

    const date = new Date();

    expect($t('common.date', { value: +date })).toBe(`Today is: ${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`);
  });
  it('repeated reads of one message stay correct', () => {
    const $t = localize<{ value?: number }>(initLocale);

    expect($t('common.plural', { value: 1 })).toBe('You have one photo.');
    expect($t('common.plural', { value: 1000 })).toBe('You have 1,000 photos.');
    expect($t('common.plural', { value: 0 })).toBe('You have no photos.');
  });
  it('`formats` apply per call and do not stick to the message', () => {
    const $t = localize<{ value?: number }>(initLocale);
    const money = { number: { money: { style: 'currency', currency: 'USD' } as const } };

    expect($t('common.price', { value: 10 }, money)).toBe('Price: $10.00');
    expect($t('common.price', { value: 10 })).toBe('Price: 10');
  });
  it('returns the raw message for malformed ICU syntax', () => {
    const reports: Parser.Report[] = [];
    const $t = localize<{ name?: string }>(initLocale, parser({ onReport: (report) => reports.push(report) }));

    expect($t('common.malformed', { name: 'Alice' })).toBe('Hello {name');
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'common.malformed', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(Error);
  });
  it('returns the raw message when the payload lacks a variable', () => {
    const reports: Parser.Report[] = [];
    const $t = localize(initLocale, parser({ onReport: (report) => reports.push(report) }));

    expect($t('common.missing')).toBe('Hi {name}!');
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'common.missing' }]);
  });
  it('joins a message it cannot render as text, and reports the loss', () => {
    const reports: Parser.Report[] = [];
    const $t = localize<{ value?: unknown }>(initLocale, parser({ onReport: (report) => reports.push(report) }));

    expect($t('common.missing', { name: { rich: 'value' } } as never)).toBe('Hi [object Object]!');
    expect(reports).toMatchObject([{ code: 'unserializable-output', key: 'common.missing', locale: initLocale }]);
  });
  it('writes to no channel of its own', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const $t = localize<{ name?: string }>(initLocale);

    expect($t('common.malformed', { name: 'Alice' })).toBe('Hello {name');
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();

    warn.mockRestore();
    error.mockRestore();
  });
  it('survives a report channel that throws', () => {
    const $t = localize<{ name?: string }>(initLocale, parser({ onReport: () => { throw new Error('channel down'); } }));

    expect($t('common.malformed', { name: 'Alice' })).toBe('Hello {name');
  });
});
