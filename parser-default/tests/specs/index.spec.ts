import i18n from '@sveltekit-i18n/base';
import parser, { Parser } from '../../src';
import { CONFIG } from '../data';

const { initLocale = '' } = CONFIG;

describe('parser', () => {
  it('returns a key string if not defined', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.undefined')).toBe('common.undefined');
  });
  it('key returns proper value', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.no_placeholder')).toBe('NO_PLACEHOLDER');
  });
  it('placeholders work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder', { value: 'TEST_VALUE' })).toBe('VALUES: TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE');
  });
  it('placeholders in payload work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any, another: string }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder', { value: 'TEST_{{another}}', another: 'VALUE' })).toBe('VALUES: TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE');
  });
  it('default value works for placeholders', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_default')).toBe('VALUES: DEFAULT_VALUE, DEFAULT_VALUE, DEFAULT_VALUE , DEFAULT_VALUE');
  });
  it('dynamic default works for placeholders', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_unknown', { default: 'DYNAMIC_DEFAULT_VALUE' })).toBe('DYNAMIC_DEFAULT_VALUE');
  });
  it('placeholders containing escaped values work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ 'pl:ace;holder'?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_escaped', { 'pl:ace;holder': 'TEST \\{\\{VALUE\\}\\}' })).toBe('TEST {{VALUE}}');
  });
  it('`eq` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_eq', { value: 'option9' })).toBe('VALUES: DEFAULT VALUE, DEFAULT VALUE , DEFAULT VALUE, DEFAULT VALUE  ');
    expect($t('common.modifier_eq', { value: 'option2' })).toBe('VALUES: VALUE2, VALUE2 , VALUE2, VALUE2  ');
    expect($t('common.modifier_eq')).toBe('VALUES: DEFAULT VALUE, DEFAULT VALUE , DEFAULT VALUE, DEFAULT VALUE  ');
  });
  it('`ne` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_ne', { value: 10 })).toBe('DEFAULT VALUE');
    expect($t('common.modifier_ne', { value: 5 })).toBe('VALUE2');
    expect($t('common.modifier_ne', { value: 15 })).toBe('VALUE2');
    expect($t('common.modifier_ne')).toBe('VALUE2');
  });
  it('`lt` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_lt', { value: 10 })).toBe('DEFAULT VALUE');
    expect($t('common.modifier_lt', { value: 5 })).toBe('VALUE2');
    expect($t('common.modifier_lt')).toBe('DEFAULT VALUE');
  });
  it('`lte` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_lte', { value: 10 })).toBe('VALUE2');
    expect($t('common.modifier_lte', { value: 5 })).toBe('VALUE2');
    expect($t('common.modifier_lte')).toBe('DEFAULT VALUE');
  });
  it('`gt` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_gt', { value: 10 })).toBe('VALUE1');
    expect($t('common.modifier_gt', { value: 15 })).toBe('VALUE2');
    expect($t('common.modifier_gt')).toBe('DEFAULT VALUE');
  });
  it('`gte` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_gte', { value: 10 })).toBe('VALUE2');
    expect($t('common.modifier_gte', { value: 15 })).toBe('VALUE2');
    expect($t('common.modifier_gte')).toBe('DEFAULT VALUE');
  });
  it('`number` modifier works', async () => {
    const { t, locales, locale, loadConfig, loadTranslations } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const value = 123456.789;
    const altLocale = locales.get().find((l) => l !== initLocale) || '';

    expect(t.get('common.modifier_number', { value })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 2 }).format(value));

    locale.set(altLocale);
    await loadTranslations(altLocale);

    expect(t.get('common.modifier_number', { value })).toBe(new Intl.NumberFormat(altLocale, { maximumFractionDigits: 2 }).format(value));
  });
  it('`number` props work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);

    const value = 123456.78987686643;

    expect(t.get('common.modifier_number', { value }, { number: { maximumFractionDigits: 4 } })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 4 }).format(value));
  });
  it('`number` defaults work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig({ ...CONFIG, parser: parser({ modifierDefaults: { number: { maximumFractionDigits: 4 } } }) });
    const value = 123456.78987686643;

    expect(t.get('common.modifier_number', { value })).toBe(new Intl.NumberFormat(initLocale, { maximumFractionDigits: 4 }).format(value));
  });
  it('`date` modifier works', async () => {
    const { t, loadConfig, loadTranslations, locale, locales } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const value = Date.now();
    const altLocale = locales.get().find((l) => l !== initLocale) || '';

    expect(t.get('common.modifier_date', { value })).toBe(new Intl.DateTimeFormat(initLocale, {}).format(value));

    locale.set(altLocale);
    await loadTranslations(altLocale);

    expect(t.get('common.modifier_date', { value })).toBe(new Intl.DateTimeFormat(altLocale, {}).format(value));
  });
  it('`date` props work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const value = Date.now();

    expect(t.get('common.modifier_date', { value }, { date: { year: '2-digit', month: 'numeric', day: 'numeric' } })).toBe(new Intl.DateTimeFormat(initLocale, { year: '2-digit', month: 'numeric', day: 'numeric' }).format(value));
  });
  it('`date` defaults work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig({ ...CONFIG, parser: parser({ modifierDefaults: { date: { timeStyle: 'full' } } }) });
    const value = Date.now();

    expect(t.get('common.modifier_date', { value })).toBe(new Intl.DateTimeFormat(initLocale, { timeStyle: 'full' }).format(value));
  });
  it('`ago` modifier works', async () => {
    const { t, loadConfig, loadTranslations, locale, locales } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const value = -1000 * 60 * 30;
    const altLocale = locales.get().find((l) => l !== initLocale) || '';

    expect(t.get('common.modifier_ago', { value })).toBe(new Intl.RelativeTimeFormat(initLocale).format(-30, 'minute'));

    locale.set(altLocale);
    await loadTranslations(altLocale);

    expect(t.get('common.modifier_ago', { value })).toBe(new Intl.RelativeTimeFormat(altLocale).format(-30, 'minute'));
  });
  it('`ago` props work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const value = -1000 * 60 * 60 * 24 * 7;

    expect(t.get('common.modifier_ago', { value }, { ago: { format: 'day' } })).toBe(new Intl.RelativeTimeFormat(initLocale).format(-7, 'day'));
    expect(t.get('common.modifier_ago', { value }, { ago: { format: 'week' } })).not.toBe(new Intl.RelativeTimeFormat(initLocale).format(-7, 'day'));
  });
  it('`ago` defaults work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    const value = -1000 * 60 * 60 * 24 * 7;

    await loadConfig({ ...CONFIG, parser: parser({ modifierDefaults: { ago: { format: 'days' } } }) });
    expect(t.get('common.modifier_ago', { value })).toBe(new Intl.RelativeTimeFormat(initLocale).format(-7, 'day'));

    await loadConfig({ ...CONFIG, parser: parser({ modifierDefaults: { ago: { format: 'week' } } }) });
    expect(t.get('common.modifier_ago', { value })).not.toBe(new Intl.RelativeTimeFormat(initLocale).format(-7, 'day'));
  });
  it('`currency` modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: number }>>();

    await loadConfig(CONFIG);
    const value = 10;
    const ratio = 21.4;

    expect(t.get('common.modifier_currency', { value }, { currency: { currency: 'USD', ratio: 1 } })).toBe(new Intl.NumberFormat(initLocale, { style: 'currency', currency: 'USD' }).format(value));

    expect(t.get('common.modifier_currency', { value }, { currency: { currency: 'CZK', ratio } })).toBe(new Intl.NumberFormat(initLocale, { style: 'currency', currency: 'CZK' }).format(value * ratio));
  });
  it('`currency` defaults work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: number }>>();

    const value = 10;
    const ratio = 21.4;

    await loadConfig({ ...CONFIG, parser: parser({ modifierDefaults: { currency: { currency: 'USD', ratio: 1 } } }) });
    expect(t.get('common.modifier_currency', { value })).toBe(new Intl.NumberFormat(initLocale, { style: 'currency', currency: 'USD' }).format(value));

    await loadConfig({ ...CONFIG, parser: parser({ modifierDefaults: { currency: { currency: 'CZK', ratio } } }) });
    expect(t.get('common.modifier_currency', { value })).toBe(new Intl.NumberFormat(initLocale, { style: 'currency', currency: 'CZK' }).format(value * ratio));
  });
  it('custom modifier works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ data?: any }>>();

    await loadConfig({
      ...CONFIG, parser: parser({
        customModifiers: {
          test: ({ value }) => value,
        },
      }),
    });
    const $t = t.get;

    expect($t('common.modifier_custom', { data: 'TEST_STRING' })).toBe('TEST_STRING');
  });
  it('modifiers containing escaped values work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ 'va:lue'?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_escaped', { 'va:lue': 'option:1' })).toBe('VA;{{LUE}}:1');
    expect($t('common.modifier_escaped', { 'va:lue': 'option:2' })).toBe('VA;{{LUE}}:2');
    expect($t('common.modifier_escaped')).toBe('DEFAULT {{VALUE}};');
  });
  it('single character default value works', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ age?: number, value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_default_single_char', { age: 7 })).toBe('as a 7-year-old');
    expect($t('common.modifier_default_single_char', { age: 18 })).toBe('as an 18-year-old');
    expect($t('common.placeholder_default_single_char')).toBe('VALUES: a, a, a , a');
    expect($t('common.placeholder_default_single_char', { value: 'TEST_VALUE' })).toBe('VALUES: TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE');
  });
  it('escaped semicolons in default values work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_default_escaped')).toBe('VALUES: ;SEMI, SEMI;, ;');
    expect($t('common.placeholder_default_escaped', { value: 'TEST_VALUE' })).toBe('VALUES: TEST_VALUE, TEST_VALUE, TEST_VALUE');
  });
  it('short keys work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ n?: any, nn?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_short_key', { n: 'TEST_VALUE', nn: 'TEST_VALUE' })).toBe('VALUES: TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE');
    expect($t('common.modifier_short_key', { n: 1, nn: 1 })).toBe('VALUES: VALUE1, VALUE1, DEFAULT VALUE');
    expect($t('common.modifier_short_key', { n: 15, nn: 10 })).toBe('VALUES: DEFAULT VALUE, VALUE2, VALUE2');
    expect($t('common.modifier_short_key')).toBe('VALUES: DEFAULT VALUE, DEFAULT VALUE, DEFAULT VALUE');
  });
  it('short option segments work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.modifier_short_option')).toBe('VALUES: DEF, DEF, z');
    expect($t('common.modifier_short_option', { value: 'x' })).toBe('VALUES: x, DEF, z');
    expect($t('common.modifier_short_option', { value: 5 })).toBe('VALUES: FIVE, 1, z');
    expect($t('common.modifier_short_option', { value: 2 })).toBe('VALUES: DEF, 1, z');
  });
  it('keys starting with an escaped semicolon work', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ ';value'?: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_escaped_leading', { ';value': 'TEST_VALUE' })).toBe('VALUES: TEST_VALUE, DEFAULT VALUE');
    expect($t('common.placeholder_escaped_leading', { ';value': 1 })).toBe('VALUES: 1, VALUE1');
    expect($t('common.placeholder_escaped_leading')).toBe('VALUES: , DEFAULT VALUE');
  });
  it('unparsable placeholders do not resolve a payload key', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ [key: string]: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_unparsable', { null: 'LEAKED_VALUE' })).toBe('VALUES: , , ');
    expect($t('common.placeholder_unparsable', { undefined: 'LEAKED_VALUE' })).toBe('VALUES: , , ');
    expect($t('common.placeholder_unparsable', { '': 'LEAKED_VALUE' })).toBe('VALUES: , , ');
    expect($t('common.placeholder_unparsable', { null: 'LEAKED_VALUE', default: 'DEFAULT VALUE' })).toBe('VALUES: DEFAULT VALUE, DEFAULT VALUE, DEFAULT VALUE');
  });
  it('inherited payload members are not resolved', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ [key: string]: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder_inherited')).toBe('VALUES: , , , INLINE DEFAULT');
    expect($t('common.placeholder_inherited', { default: 'DEFAULT VALUE' })).toBe('VALUES: DEFAULT VALUE, DEFAULT VALUE, DEFAULT VALUE, INLINE DEFAULT');
    expect($t('common.placeholder_inherited', { constructor: 'OWN VALUE' })).toBe('VALUES: OWN VALUE, , , INLINE DEFAULT');

    const inherited = Object.create({ default: 'INHERITED DEFAULT' });

    expect($t('common.placeholder', inherited)).toBe('VALUES: , , , ');
    expect($t('common.undefined', inherited)).toBe('common.undefined');
  });
  it('self-referential payload values do not overflow', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ value?: any, first?: string, second?: string }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    expect($t('common.placeholder', { value: '{{value}}' })).toBe('VALUES: {{value}}, {{value}}, {{value}}, {{value}}');
    expect($t('common.placeholder', { value: '{{first}}', first: '{{second}}', second: 'TEST_VALUE' })).toBe('VALUES: TEST_VALUE, TEST_VALUE, TEST_VALUE, TEST_VALUE');
  });
  it('reaching the interpolation cap reports a bounded excerpt', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ [key: string]: any }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    const chain = (length: number) => Array.from({ length }, (_, i) => [`v${i + 1}`, i + 1 === length ? 'END' : `{{v${i + 2}}}`])
      .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {} as Record<string, any>);

    const { warn } = console;
    const warnings: string[] = [];

    console.warn = (message: string) => { warnings.push(message); };

    try {
      expect($t('common.placeholder_chain', chain(10))).toBe('END');
      expect($t('common.placeholder_chain', chain(11))).toBe('{{v11}}');
      expect($t('common.placeholder_chain', { v1: `{{v1}}\n[i18n]: FORGED${'x'.repeat(1000)}` })).toContain('[i18n]: FORGED');
    } finally {
      console.warn = warn;
    }

    expect(warnings).toHaveLength(2);
    expect(warnings[0]).toContain('"{{v11}}"');
    expect(warnings[1].length).toBeLessThan(300);
    expect(warnings[1]).not.toContain('\n');
  });
  it('exceeding the output budget stops interpolation and reports it', async () => {
    const { t, loadConfig } = new i18n<Parser.Params<{ v1?: string }>>();

    await loadConfig(CONFIG);
    const $t = t.get;

    const { warn } = console;
    const warnings: string[] = [];

    console.warn = (message: string) => { warnings.push(message); };

    try {
      const output = $t('common.placeholder_chain', { v1: `${'{{v1}}'.repeat(4)}${'x'.repeat(64)}` });

      expect(output.length).toBeLessThanOrEqual(100000);
      expect(output.length).toBe(27968);
    } finally {
      console.warn = warn;
    }

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('stopped before exceeding');
    expect(warnings[0].length).toBeLessThan(300);
    expect(warnings[0]).not.toContain('\n');
  });
  it('with user-defined locale works', async () => {
    const { t, l, loadConfig } = new i18n<Parser.Params<{ value?: any }>>();

    await loadConfig(CONFIG);
    const $l = l.get;
    const $t = t.get;

    const tests: Array<[string, any]> = [
      ['common.undefined', undefined],
      ['common.no_placeholder', undefined],
      ['common.placeholder', { value: 'TEST_VALUE' }],
      ['common.modifier_gte', { value: 10 }],
      ['common.modifier_custom', { data: 'TEST_STRING' }],
      ['common.modifier_escaped', { 'va:lue': 'option:2' }],
    ];

    tests.forEach((options) => {
      expect($l(initLocale, ...options)).toBe($t(...options));
    });
  });
});