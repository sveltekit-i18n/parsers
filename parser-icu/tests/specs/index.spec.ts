import i18n from '@sveltekit-i18n/base';
import { Parser } from '../../src';
import { CONFIG } from '../data';

describe('parser', () => {
  it('`plural` formatter works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: number }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.plural', { value: 1000 })).toBe('You have 1,000 photos.');
  });
  it('`select` formatter works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: string }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.select', { value: 'female' })).toBe('She will respond shortly.');
  });
  it('`selectordinal` formatter works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: number }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.selectordinal', { value: 3 })).toBe("It's my cat's 3rd birthday");
  });
  it('`number` formatter works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: number }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.number', { value: 1000 })).toBe('The price is: €1,000.00');
  });
  it('`date` formatter works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: number }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    const date = new Date();

    expect($t('common.date', { value: +date })).toBe(`Today is: ${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`);
  });
});