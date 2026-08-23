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
});
