import { describe, expect, it, vi } from 'vitest';
import parser, { Parser } from '../../src';
import { TRANSLATIONS } from '../data';

const initLocale = 'en';

const message = (locale: string, key: string) => {
  const [namespace, ...path] = key.split('.');

  return TRANSLATIONS[locale]?.[namespace]?.[path.join('.')];
};

const defaultParser = parser();

const localize = <P extends Parser.PayloadDefault = Parser.PayloadDefault>(locale: string, { parse }: Parser.T = defaultParser) => (key: string, ...params: Parser.Params<P>): string => parse(message(locale, key), params, locale, key);

describe('parser', () => {
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
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const $t = localize<{ name?: string }>(initLocale);

    expect($t('common.malformed', { name: 'Alice' })).toBe('Hello {name');
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
  it('returns the raw message when the payload lacks a variable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const $t = localize(initLocale);

    expect($t('common.missing')).toBe('Hi {name}!');
    expect(warn).toHaveBeenCalled();

    warn.mockRestore();
  });
});
