import { beforeEach, describe, expect, it, vi } from 'vitest';
import parser, { FluentDateTime, FluentNone, FluentNumber, FluentType, Parser } from '../../src';
import type { FluentFunction } from '../../src';
import { TRANSLATIONS } from '../data';

// What the parser compiles, and the bundles it builds with the `Intl` memo
// each started with.
const { compiled, bundles } = vi.hoisted(() => ({
  compiled: [] as string[],
  bundles: [] as { bundle: { locales: string[]; _intls: unknown }; initial: Map<unknown, unknown> }[],
}));

vi.mock('../../src/compile', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../src/compile')>();

  return {
    ...original,
    compile: (value: string) => {
      compiled.push(value);

      return original.compile(value);
    },
  };
});

vi.mock('@fluent/bundle', async (importOriginal) => {
  const original = await importOriginal<typeof import('@fluent/bundle')>();

  class FluentBundle extends original.FluentBundle {
    constructor(...args: ConstructorParameters<typeof original.FluentBundle>) {
      super(...args);
      bundles.push({ bundle: this, initial: this._intls });
    }
  }

  return { ...original, FluentBundle };
});

const initLocale = 'en';
const altLocale = 'cs';

// FIRST STRONG ISOLATE and POP DIRECTIONAL ISOLATE: what Fluent wraps a
// placeable in, in a message holding more than the placeable.
const FSI = '\u2068';
const PDI = '\u2069';

const message = (locale: string, key: string) => {
  const [namespace, ...path] = key.split('.');

  return TRANSLATIONS[locale]?.[namespace]?.[path.join('.')];
};

const defaultParser = parser({ onReport: null });

const localize = <P extends Parser.PayloadDefault = Parser.PayloadDefault>(locale: string, { parse }: Parser.T = defaultParser) => (key: string, ...params: Parser.Params<P>): string => parse(message(locale, key), params, locale, key);

const reporting = (options: Omit<Parser.Options, 'onReport'> = {}) => {
  const reports: Parser.Report[] = [];
  const { parse } = parser({ ...options, onReport: (report) => reports.push(report) });

  return { parse, reports };
};

const TERMS = {
  en: '-brand = Firefox\n    .gender = masculine',
  cs: '-brand = { $case ->\n   *[nominative] Firefox\n    [locative] Firefoxu\n}\n    .gender = masculine',
};

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
  it('formats an empty message, and one of blanks alone, as the empty string', () => {
    const { parse, reports } = reporting();

    expect(parse('', [], initLocale, 'k')).toBe('');
    expect(parse('   ', [], initLocale, 'k')).toBe('');
    expect(reports).toEqual([]);
  });
  it('substitutes a variable from the payload slot', () => {
    const $t = localize<{ name?: string }>(initLocale);

    expect($t('common.greeting', { name: 'Alice' })).toBe(`Hi ${FSI}Alice${PDI}!`);
  });
  it('leaves a message that is one placeable unisolated', () => {
    const { parse } = defaultParser;

    expect(parse('{ $name }', [{ name: 'Alice' }], initLocale, 'k')).toBe('Alice');
  });
  it('formats a number by the locale, with and without `NUMBER`', () => {
    const value = 1234.5;
    const { parse } = defaultParser;
    const number = (locale: string) => new Intl.NumberFormat(locale).format(value);

    expect(parse(message(initLocale, 'common.number'), [{ value }], initLocale, 'k')).toBe(number(initLocale));
    expect(parse(message(initLocale, 'common.number'), [{ value }], altLocale, 'k')).toBe(number(altLocale));
    expect(parse('{ $value }', [{ value }], altLocale, 'k')).toBe(number(altLocale));
    expect(number(initLocale)).not.toBe(number(altLocale));
    expect(parse(message(initLocale, 'common.fraction'), [{ value: 2 }], initLocale, 'k')).toBe('2.00');
  });
  it('selects a variant by an exact number and by a plural category', () => {
    const $t = localize<{ count?: number | string }>(initLocale);

    expect($t('common.plural', { count: 0 })).toBe('No photos.');
    expect($t('common.plural', { count: 1 })).toBe('One photo.');
    expect($t('common.plural', { count: 1000 })).toBe(`${FSI}1,000${PDI} photos.`);
    // A string is matched against the keys as text: neither `0` nor `one` is.
    expect($t('common.plural', { count: '1' })).toBe(`${FSI}1${PDI} photos.`);
  });
  it('selects a variant by a string', () => {
    const $t = localize<{ gender?: string }>(initLocale);

    expect($t('common.select', { gender: 'female' })).toBe('She will respond shortly.');
    expect($t('common.select', { gender: 'unknown' })).toBe('They will respond shortly.');
  });
  it('formats a date with `DATETIME`', () => {
    const value = new Date(Date.UTC(2024, 0, 15, 12));
    const $t = localize<{ value?: Date }>(initLocale);
    const date = new Intl.DateTimeFormat(initLocale, { dateStyle: 'long' }).format(value);

    expect($t('common.date', { value })).toBe(`Today is ${FSI}${date}${PDI}`);
  });
  it('formats a Fluent value the app builds with what a message cannot set', () => {
    const { parse } = parser({ onReport: null, useIsolating: false });
    // `@fluent/bundle` types the options as `Intl.NumberFormatOptions` and
    // hands them to `Intl.PluralRules` as well.
    const ordinal: Intl.NumberFormatOptions & Intl.PluralRulesOptions = { type: 'ordinal' };
    const place = '{ NUMBER($position) ->\n    [one] { $position }st\n    [two] { $position }nd\n    [few] { $position }rd\n   *[other] { $position }th\n}';

    expect(parse('{ NUMBER($amount, currencyDisplay: "code") }', [{ amount: new FluentNumber(99.99, { style: 'currency', currency: 'USD' }) }], initLocale, 'k'))
      .toBe(new Intl.NumberFormat(initLocale, { style: 'currency', currency: 'USD', currencyDisplay: 'code' }).format(99.99));
    expect(parse(place, [{ position: new FluentNumber(3, ordinal) }], initLocale, 'k')).toBe('3rd');
    expect(parse(place, [{ position: 3 }], initLocale, 'k')).toBe('3th');
    expect(parse('{ DATETIME($at, hour: "numeric") }', [{ at: new FluentDateTime(0, { timeZone: 'Asia/Tokyo' }) }], initLocale, 'k')).toBe('9 AM');
    // A message cannot set them: Fluent leaves such an option to the app.
    expect(parse('{ NUMBER($amount, style: "currency", currency: "USD") }', [{ amount: 99.99 }], initLocale, 'k')).toBe('99.99');
  });
  it('keeps the lines of a message, and strips their common indent and the blanks around it', () => {
    const { parse } = defaultParser;

    expect(parse(message(initLocale, 'common.multiline'), [], initLocale, 'k')).toBe('Line one\nLine two');
    expect(parse('Line one\r\nLine two', [], initLocale, 'k')).toBe('Line one\nLine two');
    expect(parse('a\n  b\n    c', [], initLocale, 'k')).toBe('a\nb\n  c');
    expect(parse('a\n  \nb', [], initLocale, 'k')).toBe('a\n\nb');
    expect(parse('   spaced   ', [], initLocale, 'k')).toBe('spaced');
    expect(parse('a\r\n  \r\nb', [], initLocale, 'k')).toBe('a\n\nb');
  });
  it('reads a message that names the id it compiles under as text', () => {
    const { parse, reports } = reporting();

    expect(parse('fluent = fluent-1', [], initLocale, 'k')).toBe('fluent = fluent-1');
    expect(parse('A\nfluent-11 = b', [], initLocale, 'k')).toBe('A\nfluent-11 = b');
    expect(reports).toEqual([]);
  });
  it('picks the id it compiles under in one pass over the message', () => {
    const { parse } = defaultParser;
    const source = Array.from({ length: 1000 }, (_, index) => `fluent-${index}`).join(' ');
    const includes = vi.spyOn(String.prototype, 'includes');
    let scans: number;

    try {
      expect(parse(source, [], initLocale, 'k')).toBe(source);
      scans = includes.mock.contexts.filter((context) => String(context) === source).length;
    } finally {
      includes.mockRestore();
    }

    // One scan for a run of spaces, one for the id.
    expect(scans).toBe(2);
  });
  it('takes `functions` beside the builtins, and over them', () => {
    const upper: FluentFunction = ([value]) => String(value).toUpperCase();
    const { parse } = parser({ onReport: null, functions: { UPPER: upper, NUMBER: upper } });

    expect(parse('Hi { UPPER($name) }!', [{ name: 'alice' }], initLocale, 'k')).toBe(`Hi ${FSI}ALICE${PDI}!`);
    expect(parse('{ NUMBER($n) }', [{ n: 'x' }], initLocale, 'k')).toBe('X');
  });
  it('hands a custom function the value types it re-exports', () => {
    const seen: unknown[] = [];
    const inspect: FluentFunction = ([value]) => {
      seen.push(value);

      return new FluentNumber(42, { minimumFractionDigits: 1 });
    };
    const { parse } = parser({ onReport: null, functions: { INSPECT: inspect } });

    expect(parse('{ INSPECT($n) } { INSPECT($d) }', [{ n: 1, d: new Date(0) }], initLocale, 'k')).toBe(`${FSI}42.0${PDI} ${FSI}42.0${PDI}`);
    expect(seen[0]).toBeInstanceOf(FluentNumber);
    expect(seen[1]).toBeInstanceOf(FluentDateTime);
    expect(seen[0]).toBeInstanceOf(FluentType);
    expect(String(new FluentNone('x'))).toBe('{x}');
  });
  it('isolates a placeable unless told not to', () => {
    const $tNone = localize<{ name?: string }>(initLocale, parser({ onReport: null, useIsolating: false }));

    expect($tNone('common.greeting', { name: 'Alice' })).toBe('Hi Alice!');
  });
  it('applies `transform` to the text of a message, never to a placeable', () => {
    const { parse } = parser({ onReport: null, useIsolating: false, transform: (text) => text.toUpperCase() });

    expect(parse('Hi { $name }!', [{ name: 'alice' }], initLocale, 'k')).toBe('HI alice!');
    expect(parse('plain', [], initLocale, 'k')).toBe('PLAIN');
  });
  it('treats a prototype-named payload key as data', () => {
    // Built by `JSON.parse`: a `__proto__` key in an object literal routes
    // through the prototype setter instead of becoming an own property.
    const payload: Parser.PayloadDefault = JSON.parse('{ "__proto__": { "polluted": true }, "constructor": "c", "toString": "t" }');
    const $t = localize(initLocale, parser({ onReport: null, useIsolating: false }));

    expect($t('common.inherited', payload)).toBe('c t');
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
  it('reads no variable off a payload that is no object', () => {
    const { parse, reports } = reporting({ useIsolating: false });

    expect(parse('{ $length } { $toString }', ['text' as never], initLocale, 'k')).toBe('{$length} {$toString}');
    expect(parse('{ $toString }', [{}], initLocale, 'k')).toBe('{$toString}');
    expect(reports.map(({ code }) => code)).toEqual(['fallback-value', 'fallback-value', 'fallback-value']);
  });
  it('accepts a locale it knows nothing about', () => {
    const { parse } = parser({ onReport: null, useIsolating: false });

    expect(parse('Hi { $value }! { NUMBER($n) }', [{ value: 'x', n: 1234.5 }], 'zz-ZZ', 'k')).toBe('Hi x! 1,234.5');
  });
});

describe('terms', () => {
  it('lets every message of a locale reference its terms', () => {
    const { parse } = parser({ onReport: null, useIsolating: false, terms: TERMS });

    expect(parse(message(initLocale, 'common.brand'), [], initLocale, 'k')).toBe('Welcome to Firefox!');
    expect(parse(message(initLocale, 'common.inflected'), [], altLocale, 'k')).toBe('About Firefoxu');
    expect(parse(message(initLocale, 'common.gendered'), [], initLocale, 'k')).toBe('Firefox is here, too.');
  });
  it('matches a locale whatever its case, and reads no other locale\'s terms', () => {
    const { parse, reports } = reporting({ useIsolating: false, terms: { 'EN-us': '-brand = Firefox' } });

    expect(parse('{ -brand }', [], 'en-US', 'k')).toBe('Firefox');
    expect(parse('{ -brand }', [], 'en', 'k')).toBe('{-brand}');
    expect(reports).toMatchObject([{ code: 'fallback-value', key: 'k', locale: 'en' }]);
    expect(reports[0]?.error).toBeInstanceOf(ReferenceError);
  });
  it('takes the last of two keys that differ by case alone', () => {
    const { parse } = parser({ onReport: null, terms: { en: '-brand = A', EN: '-brand = B' } });

    expect(parse('{ -brand }', [], 'en', 'k')).toBe('B');
  });
  it('keeps the first of two terms of one name, as Fluent does', () => {
    const { parse } = parser({ onReport: null, terms: { en: '-brand = A\n-brand = B' } });

    expect(parse('{ -brand }', [], 'en', 'k')).toBe('A');
  });
  it('reads only the terms of a source, never its messages', () => {
    const { parse, reports } = reporting({ useIsolating: false, terms: { en: 'other = Hidden\n-brand = Firefox' } });

    expect(parse('{ other } { -brand }', [], 'en', 'k')).toBe('{other} Firefox');
    expect(reports).toMatchObject([{ code: 'fallback-value' }]);
  });
  it('leaves out a term without a value, which Fluent cannot resolve', () => {
    const { parse, reports } = reporting({ useIsolating: false, terms: { en: '-brand =\n    .gender = masculine' } });

    expect(parse('Hi { -brand }', [], 'en', 'k')).toBe('Hi {-brand}');
    expect(reports).toMatchObject([{ code: 'fallback-value', key: 'k', locale: 'en' }]);
    expect(reports[0]?.error).toBeInstanceOf(ReferenceError);
  });
  it('skips a source that is no text, or that Fluent cannot read', () => {
    const terms = { en: 42, cs: `-deep = ${'{ '.repeat(200000)}` } as unknown as Record<string, string>;
    const { parse } = parser({ onReport: null, terms });

    expect(parse('Hi', [], 'en', 'k')).toBe('Hi');
    expect(parse('Hi', [], 'cs', 'k')).toBe('Hi');
  });
});

describe('reports', () => {
  it('returns the raw message for a syntax error, and reports it', () => {
    const { parse, reports } = reporting();
    const $t = localize<{ name?: string }>(initLocale, { parse });

    expect($t('common.malformed', { name: 'Alice' })).toBe('Hi { $name');
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'common.malformed', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(SyntaxError);
  });
  it.each([
    ['an attribute', message(initLocale, 'common.attribute')],
    ['a line starting with `[`', 'Hello\n[x] y'],
    ['a line starting with `*`', 'Hello\n*[x] y'],
    ['a line starting with `}`', 'Hello\n} y'],
    ['a line starting with a tab', 'Hello\n\ty'],
    ['a line starting with a no-break space', 'Hello\n\u00a0y'],
    ['a line of a tab alone', 'Hello\n\t\ny'],
    ['a line of blanks alone, one of them a no-break space', 'Hello\n \u00a0\n y'],
    ['a line of an ideographic space alone', 'Hello\n\u3000\n y'],
    ['a line of a vertical tab alone', 'Hello\n\v\n y'],
    ['a line of a tab alone at the end', 'Hello\n\t'],
    ['a line indented with spaces and a tab', 'Hello\n  \ty'],
    ['a line of a variant of a tab alone', '{ $x ->\n *[a] one\n\t\n    two\n}'],
    ['a line of a variant of a tab alone, in a function\'s argument', '{ NUMBER({ $x ->\n *[a] one\n\t\n    two\n}) }'],
    ['the first line of a variant after a line of a tab alone', '{ $x ->\n *[a]\n\t\n    two\n}'],
    ['variant keys indented with a tab', '{ $x ->\n\t[a] A\n\t*[b] B\n}'],
    ['a lone carriage return', 'Hello\rother = y'],
    ['a lone carriage return followed by a space', 'Hello\r world'],
    ['a lone carriage return before a placeable', 'a\r{ $x }\nb'],
    ['a lone carriage return before a line feed with a carriage return', 'a\r\r\nb'],
    ['an attribute named as the id would be', 'a\n.fluent = x'],
    ['an attribute named as the id would be with a suffix', 'a\n.fluent-1 = x'],
    ['an attribute named as the id would be with a longer suffix', 'a\n.fluent-11 = x'],
  ])('returns the raw message for %s, which is no Fluent pattern as written, and reports it', (_, source) => {
    const { parse, reports } = reporting();

    expect(parse(source, [], initLocale, 'k')).toBe(source);
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'k', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(SyntaxError);
  });
  it('returns the raw message for a nesting too deep to read, and reports it', () => {
    const { parse, reports } = reporting();
    const source = '{ '.repeat(200000);

    expect(parse(source, [], initLocale, 'k')).toBe(source);
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'k', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(RangeError);
  });
  it('returns the raw message for a run of more than 1,000 spaces, and reports it', () => {
    const { parse, reports } = reporting();
    const long = `a${' '.repeat(1001)}b`;
    const short = `a${' '.repeat(1000)}b`;

    expect(parse(long, [], initLocale, 'k')).toBe(long);
    expect(parse(short, [], initLocale, 'k')).toBe(short);
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'k', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(RangeError);
  });
  it.each([
    ['a message', 'x\u2028a = b'],
    ['a term', 'x\u2029-a= b'],
  ])('returns the raw message for a line separator followed by what starts %s, and reports it', (_, source) => {
    const { parse, reports } = reporting();

    expect(parse(source, [], initLocale, 'k')).toBe(source);
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'k', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(RangeError);
  });
  it('reads a line separator followed by anything else, and one written as an escape, as text', () => {
    const { parse, reports } = reporting({ useIsolating: false });

    expect(parse('x\u2028a b\u2029{ $a }', [{ a: '=' }], initLocale, 'k')).toBe('x\u2028a b\u2029=');
    expect(parse('x{ "\\u2028" }a = b', [], initLocale, 'k')).toBe('x\u2028a = b');
    expect(reports).toEqual([]);
  });
  it('returns the raw message when nothing of it could be formatted, and reports what ended it', () => {
    const { parse, reports } = reporting();
    const source = 'Today { $missing } { DATETIME($d) }';

    expect(parse(source, [{ d: new Date(NaN) }], initLocale, 'k')).toBe(source);
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'k', locale: initLocale }]);
    expect(reports[0]?.error).toBeInstanceOf(RangeError);
  });
  it('renders what spells Fluent\'s fallback for a whole message as it is', () => {
    const { parse, reports } = reporting();

    expect(parse('{ "{???}" }', [], initLocale, 'k')).toBe('{???}');
    expect(parse('{ $x }', [{ x: '{???}' }], initLocale, 'k')).toBe('{???}');
    expect(reports).toEqual([]);
  });
  it('returns the raw message when a function throws what is no error, and reports it', () => {
    // What Fluent rethrows, as it catches an error alone.
    /* eslint-disable @typescript-eslint/only-throw-error */
    const { parse, reports } = reporting({ functions: { BAD: () => { throw 'bad'; } }, transform: (text) => { if (text === 'boom') throw 'boom'; return text; } });
    /* eslint-enable @typescript-eslint/only-throw-error */

    expect(parse('A { BAD() }', [], initLocale, 'k')).toBe('A { BAD() }');
    expect(parse('boom', [], initLocale, 'k')).toBe('boom');
    expect(reports).toMatchObject([
      { code: 'failed-message', key: 'k', error: 'bad' },
      { code: 'failed-message', key: 'k', error: 'boom' },
    ]);
  });
  it('renders a placeable that cannot be resolved as its fallback, and reports each', () => {
    const { parse, reports } = reporting({ useIsolating: false, functions: { FAIL: () => { throw new Error('failed'); } } });

    expect(parse('{ $name } { other } { -brand } { FOO() } { FAIL() } { $flag }', [{ flag: true }], initLocale, 'k'))
      .toBe('{$name} {other} {-brand} {FOO()} {FAIL()} {$flag}');
    expect(reports.map(({ code }) => code)).toEqual(Array(6).fill('fallback-value'));
    expect(reports.map(({ error }) => (error as Error).constructor)).toEqual([ReferenceError, ReferenceError, ReferenceError, ReferenceError, Error, TypeError]);
  });
  it('writes to no channel of its own', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warning = vi.spyOn(process, 'emitWarning').mockImplementation(() => undefined);

    try {
      const $t = localize<{ name?: string }>(initLocale);

      expect($t('common.greeting')).toBe(`Hi ${FSI}{$name}${PDI}!`);
      expect($t('common.malformed', { name: 'Alice' })).toBe('Hi { $name');
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

    expect($t('common.malformed', { name: 'Alice' })).toBe('Hi { $name');
    expect($t('common.greeting')).toBe(`Hi ${FSI}{$name}${PDI}!`);
  });
  it('returns a leaf that is no message as text, whatever it is', () => {
    const { parse, reports } = reporting();

    // The one primitive no concatenation can spell.
    expect(parse(Symbol('leaf'), [], initLocale, 'leaf')).toBe('Symbol(leaf)');
    expect(reports).toMatchObject([{ code: 'failed-message', key: 'leaf', locale: initLocale }]);
  });
  it('renders a catalogue leaf that cannot become text as the empty string, and reports it', () => {
    const { parse, reports } = reporting();

    expect(parse(Object.create(null), [], initLocale, 'k')).toBe('');
    expect(parse({ toString: () => { throw new Error('unprintable'); } }, [], initLocale, 'k')).toBe('');
    expect(reports).toMatchObject([
      { code: 'failed-message', key: 'k', locale: initLocale },
      { code: 'failed-message', key: 'k', locale: initLocale },
    ]);
  });
});

describe('cache', () => {
  beforeEach(() => {
    compiled.length = 0;
    bundles.length = 0;
  });

  it('compiles a message once for every locale', () => {
    const { parse } = parser({ onReport: null });

    for (const locale of ['en', 'cs', 'cs', 'en']) parse('a', [], locale, 'k');
    expect(compiled).toEqual(['a']);
  });
  it('keeps messages named after prototype members as keys of their own', () => {
    const { parse } = parser({ onReport: null });

    ['__proto__', 'constructor', '__proto__', 'constructor'].forEach((source) => {
      expect(parse(source, [], 'en', 'k')).toBe(source);
    });
    expect(compiled).toEqual(['__proto__', 'constructor']);
  });
  it('compiles a message it could not compile again on every call', () => {
    const { parse } = parser({ onReport: null });

    parse('{ broken', [], 'en', 'k');
    parse('{ broken', [], 'en', 'k');
    expect(compiled).toEqual(['{ broken', '{ broken']);
  });
  it('evicts the least recently used message once `cacheLimit` is reached', () => {
    const { parse } = parser({ onReport: null, cacheLimit: 2 });

    for (const source of 'abacab') parse(source, [], 'en', 'k');
    expect(compiled.join('')).toBe('abcb');
  });
  it.each([
    ['bdadacba', 'bdacb'],
    ['badacba', 'badcb'],
    ['bdadcba', 'bdacba'],
  ])('keeps the recency order through reads from its middle (%s)', (reads, compiles) => {
    const { parse } = parser({ onReport: null, cacheLimit: 3 });

    for (const source of reads) parse(source, [], 'en', 'k');
    expect(compiled.join('')).toBe(compiles);
  });
  it('keeps evicting once its one message is evicted, with a `cacheLimit` of 1', () => {
    const { parse } = parser({ onReport: null, cacheLimit: 1 });

    for (const source of 'abaa') parse(source, [], 'en', 'k');
    expect(compiled.join('')).toBe('aba');
  });
  it('compiles on every call with a `cacheLimit` of 0', () => {
    const { parse } = parser({ onReport: null, cacheLimit: 0 });

    parse('a', [], 'en', 'k');
    parse('a', [], 'en', 'k');
    expect(compiled).toEqual(['a', 'a']);
  });

  // How many compiles 10,001 messages and then the first one again take.
  const fill = (cacheLimit?: unknown) => {
    const { parse } = parser({ onReport: null, cacheLimit: cacheLimit as number });

    compiled.length = 0;
    for (let index = 0; index <= 10000; index += 1) parse(`m${index}`, [], 'en', 'k');
    parse('m0', [], 'en', 'k');

    return compiled.length;
  };

  it('holds 10,000 messages by default, and every one with an infinite `cacheLimit`', () => {
    expect(fill()).toBe(10002);
    expect(fill(Infinity)).toBe(10001);
  });
  it.each([-1, 1.5, NaN, '2', null])('holds 10,000 messages for a `cacheLimit` of %s, which is no count', (cacheLimit) => {
    expect(fill(cacheLimit)).toBe(10002);
  });
  it('builds a bundle once per locale, even with a `cacheLimit` of 0', () => {
    const { parse } = parser({ onReport: null, cacheLimit: 0 });

    for (const locale of ['en', 'cs', 'en', 'cs']) parse('a', [], locale, 'k');
    expect(bundles.map(({ bundle }) => bundle.locales)).toEqual([['en'], ['cs']]);
  });
  it('caches one bundle per locale when building it formats for that locale again', () => {
    let reentered = false;
    const functions = {
      // A getter runs as `@fluent/bundle` copies the functions into a bundle.
      get UP() {
        if (!reentered) {
          reentered = true;
          parse('a', [], 'en', 'k');
        }

        return ([value]: Parameters<FluentFunction>[0]) => String(value).toUpperCase();
      },
    };
    const { parse } = parser({ onReport: null, useIsolating: false, functions });

    expect(parse('{ UP("a") }', [], 'en', 'k')).toBe('A');
    parse('a', [], 'cs', 'k');
    parse('a', [], 'en', 'k');
    expect(bundles.map(({ bundle }) => bundle.locales)).toEqual([['en'], ['en'], ['cs']]);

    // A bundle built while another of its locale is built never enters the
    // cache, so no stale entry of it evicts the locale.
    for (let index = 0; index < 998; index += 1) parse('a', [], `en-x-l${index}`, 'k');
    parse('a', [], 'en', 'k');
    parse('a', [], 'en-x-l998', 'k');
    parse('a', [], 'en-x-l999', 'k');
    bundles.length = 0;
    parse('a', [], 'en', 'k');
    expect(bundles).toEqual([]);
  });
  it('holds the bundles of 1,000 locales, the least recently used making room', () => {
    const { parse } = parser({ onReport: null });

    for (let index = 0; index <= 1000; index += 1) parse('a', [], `en-x-l${index}`, 'k');
    parse('a', [], 'en-x-l1000', 'k');
    expect(bundles).toHaveLength(1001);
    parse('a', [], 'en-x-l0', 'k');
    expect(bundles).toHaveLength(1002);
  });
  it('keeps the `Intl` objects of a locale with its bundle, never in Fluent\'s own memo', () => {
    const { parse } = parser({ onReport: null });

    for (let index = 0; index < 20; index += 1) {
      parse('{ NUMBER($n) } { DATETIME($d) }', [{ n: 1, d: new Date(0) }], `en-x-m${index}`, 'k');
    }

    // Every bundle started from the one memo Fluent keeps for the constant
    // locale it is built for, and none ever wrote to it.
    expect(new Set(bundles.map(({ initial }) => initial)).size).toBe(1);
    expect(bundles[0].initial.size).toBe(0);
    expect(bundles.every(({ bundle, initial }) => bundle._intls !== initial && (bundle._intls as Map<unknown, unknown>).size > 0)).toBe(true);
  });
});
