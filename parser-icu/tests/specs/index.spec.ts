import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IntlMessageFormat } from 'intl-messageformat';
import parser, { Parser } from '../../src';
import type { Parser as Shipped } from '../../dist';
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
  it('renders a catalogue leaf that cannot become text as the empty string, and reports it', () => {
    const reports: Parser.Report[] = [];
    const { parse } = parser({ onReport: (report) => reports.push(report) });

    expect(parse(Object.create(null), [], initLocale, 'k')).toBe('');
    expect(parse({ toString: () => { throw new Error('unprintable'); } }, [], initLocale, 'k')).toBe('');
    // The one primitive no concatenation can spell.
    expect(parse(Symbol('leaf'), [], initLocale, 'k')).toBe('Symbol(leaf)');
    expect(reports).toMatchObject([
      { code: 'failed-message', key: 'k', locale: initLocale },
      { code: 'failed-message', key: 'k', locale: initLocale },
      { code: 'failed-message', key: 'k', locale: initLocale },
    ]);
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

  it('ships declarations that keep the options typed', () => {
    // @ts-expect-error `onReport` is required.
    const missing: Shipped.Options = {};
    // @ts-expect-error an option `intl-messageformat` does not take is rejected.
    const unknown: Shipped.Options = { onReport: null, bogus: true };

    expect([missing, unknown]).toHaveLength(2);
  });
});

describe('formatters', () => {
  // Counts what the parser builds; each call still returns the host's own object.
  const count = (name: 'NumberFormat' | 'DateTimeFormat' | 'PluralRules') => {
    const Native = Intl[name] as new (...args: unknown[]) => object;

    return vi.spyOn(Intl, name).mockImplementation(function (...args: unknown[]) {
      return new Native(...args);
    });
  };

  const collect = () => {
    const reports: Parser.Report[] = [];

    return { reports, onReport: (report: Parser.Report) => { reports.push(report); } };
  };

  const d = new Date(Date.UTC(2024, 0, 15, 23, 30));

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds one Intl object for a locale and options, whichever message asks', () => {
    const built = count('PluralRules');
    const { parse } = parser({ onReport: null });

    expect(parse('{n, plural, one {# cat} other {# cats}}', [{ n: 2 }], 'en', 'a')).toBe('2 cats');
    expect(parse('{n, plural, one {# dog} other {# dogs}}', [{ n: 1 }], 'en', 'b')).toBe('1 dog');
    expect(parse('{n, plural, one {# owl} other {# owls}}', [{ n: 3 }, {}], 'en', 'c')).toBe('3 owls');
    expect(parse('{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}', [{ n: 3 }], 'en', 'd')).toBe('3rd');
    expect(parse('{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} again', [{ n: 2 }], 'en', 'e')).toBe('2nd again');
    // One for the cardinal rules, one for the ordinal.
    expect(built).toHaveBeenCalledTimes(2);
  });
  it('keeps them per parser', () => {
    const built = count('PluralRules');

    [parser({ onReport: null }), parser({ onReport: null })].forEach(({ parse }) => {
      expect(parse('{n, plural, one {# cat} other {# cats}}', [{ n: 2 }], 'en', 'a')).toBe('2 cats');
    });
    expect(built).toHaveBeenCalledTimes(2);
  });
  it('keeps no more than 10,000 number formats and plural rules, the oldest making room', () => {
    const { reports, onReport } = collect();
    const { parse } = parser({ onReport });
    const locales = Array.from({ length: 10001 }, (_, i) => `en-x-${i.toString(36).padStart(4, '0')}`);
    const render = (locale: string) => parse('{n, plural, other {#}} again', [{ n: 1 }], locale, 'a');

    locales.forEach((locale) => expect(render(locale)).toBe('1 again'));
    const numbers = count('NumberFormat');
    const plurals = count('PluralRules');

    expect(render(locales[10000])).toBe('1 again');
    expect(render(locales[1])).toBe('1 again');
    expect(numbers).toHaveBeenCalledTimes(0);
    expect(plurals).toHaveBeenCalledTimes(0);
    // The first locale made room for the last; the rest are still kept.
    expect(render(locales[0])).toBe('1 again');
    expect(reports).toEqual([]);
    expect(numbers).toHaveBeenCalledTimes(1);
    expect(plurals).toHaveBeenCalledTimes(1);
  }, 30_000);
  it('keeps no more than 1,000 date and time formatters, the oldest making room', () => {
    const { parse } = parser({ onReport: null });
    // A date and a time formatter to a locale, kept together: 1,002 in all.
    const locales = Array.from({ length: 501 }, (_, i) => `en-x-${i.toString(36).padStart(4, '0')}`);
    const render = (locale: string) => parse('{d, date, short} {d, time, short} {n, number}', [{ d, n: 1 }], locale, 'a');
    const text = render(locales[0]);

    locales.forEach((locale) => expect(render(locale)).toBe(text));
    const dates = count('DateTimeFormat');
    const numbers = count('NumberFormat');

    expect(render(locales[500])).toBe(text);
    expect(render(locales[1])).toBe(text);
    expect(dates).toHaveBeenCalledTimes(0);
    // The first locale's two made room for the last's, the time formatter too.
    expect(text).toContain(parse('{d, time, short}', [{ d }], locales[0], 'b'));
    expect(dates).toHaveBeenCalledTimes(1);
    // Number formats keep more.
    expect(render(locales[0])).toBe(text);
    expect(numbers).toHaveBeenCalledTimes(0);
  });
  // A message asking for fifty number formats, each built next to free: one
  // compile fills fifty slots of the store, so a test can drive it past its
  // limit in a few hundred locales.
  const fifty = () => {
    const built = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function () {
      return { format: () => 'x' } as unknown as Intl.NumberFormat;
    });
    const styles = Array.from({ length: 50 }, (_, i) => `s${i}`);
    const currencies = Intl.supportedValuesOf('currency');
    const formats = { number: Object.fromEntries(styles.map((style, i) => [style, { style: 'currency' as const, currency: currencies[i] }])) };
    const message = styles.map((style) => `{n, number, ${style}}`).join('');
    const { parse } = parser({ onReport: null });
    const render = (from: number, to: number) => {
      let text = '';

      for (let i = from; i < to; i += 1) text = parse(message, [{ n: 1 }, formats], `en-x-${i}`, 'k');

      return text;
    };

    return { built, render };
  };

  it('keeps the newest of what it built, however many times it made room', () => {
    const { built, render } = fifty();
    const builds = (locale: number) => {
      built.mockClear();
      render(locale, locale + 1);

      return built.mock.calls.length;
    };

    // The first locale's fifty made room for the 201st's.
    expect(render(0, 201)).toBe('x'.repeat(50));
    expect(builds(199)).toBe(0);
    expect(builds(0)).toBe(50);
    // 34,050 formatters in all: the newest 10,000 are the last 200 locales'.
    render(201, 680);
    expect(builds(480)).toBe(0);
    expect(builds(479)).toBe(50);
  });
  it('makes room at its limit in about the time it takes to keep a formatter below it', () => {
    const misses = (render: (from: number, to: number) => string, from: number, to: number) => {
      const start = performance.now();

      render(from, to);

      return performance.now() - start;
    };
    const best = { below: Infinity, at: Infinity };

    // The best of five pairs of parsers, each timed for 8,000 formatters: one
    // below its limit of 10,000, the other once it has made room 16,000 times.
    // The two take turns, 500 formatters at a time, so a slow stretch of the
    // host weighs on both alike.
    for (let round = 0; round < 5; round += 1) {
      const below = fifty().render;
      const at = fifty().render;
      const time = { below: 0, at: 0 };

      misses(below, 0, 20);
      misses(at, 0, 520);

      for (let chunk = 0; chunk < 16; chunk += 1) {
        time.below += misses(below, 20 + chunk * 10, 30 + chunk * 10);
        time.at += misses(at, 520 + chunk * 10, 530 + chunk * 10);
      }

      best.below = Math.min(best.below, time.below);
      best.at = Math.min(best.at, time.at);
    }

    expect(best.at).toBeLessThan(best.below * 2);
  }, 30_000);
  it('reads per-call options the way Intl does', () => {
    class Prefs {
      #timeZone = 'UTC';
      hour = 'numeric' as const;
      minute = '2-digit' as const;
      get timeZone() { return this.#timeZone; }
      set timeZone(timeZone: string) { this.#timeZone = timeZone; }
    }

    const { parse } = parser({ onReport: null });
    const inherited = (options: Intl.DateTimeFormatOptions) => [{ d }, { date: { v: Object.create(options) as Intl.DateTimeFormatOptions } }] satisfies Parser.Params;

    expect(parse('{d, date, v}', inherited({ year: 'numeric' }), 'en', 'a')).toBe('2024');
    expect(parse('{d, date, v}', inherited({ month: 'long' }), 'en', 'a')).toBe('January');

    const prefs = new Prefs();
    const at = (timeZone: string) => `At ${new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', timeZone }).format(d)}`;

    expect(parse('At {d, time, user}', [{ d }, { time: { user: prefs } }], 'en', 'b')).toBe(at('UTC'));
    prefs.timeZone = 'Asia/Tokyo';
    expect(parse('At {d, time, user}', [{ d }, { time: { user: prefs } }], 'en', 'b')).toBe(at('Asia/Tokyo'));
    expect(at('UTC')).not.toBe(at('Asia/Tokyo'));
  });
  it('reports an option Intl rejects, whatever was built before', () => {
    const { reports, onReport } = collect();
    const { parse } = parser({ onReport });

    expect(parse('{n, number, s}', [{ n: 1.2345 }, { number: { s: { maximumFractionDigits: null as never } } }], 'en', 'a')).toBe('1');
    expect(parse('{n, number, s}', [{ n: 1.2345 }, { number: { s: { maximumFractionDigits: NaN } } }], 'en', 'a')).toBe('{n, number, s}');
    expect(reports.map(({ code }) => code)).toEqual(['failed-message']);
  });
  it('shares a plain per-call style by content', () => {
    const built = count('DateTimeFormat');
    const { parse } = parser({ onReport: null });

    expect(parse('{d, date, y}', [{ d }, { date: { y: { year: 'numeric' } } }], 'en', 'a')).toBe('2024');
    expect(parse('{d, date, y}', [{ d }, { date: { y: { year: 'numeric' } } }], 'en', 'a')).toBe('2024');
    expect(built).toHaveBeenCalledTimes(1);
  });
  it('uses the formatters the options carry, as they are', () => {
    const getPluralRules = vi.fn((...args: ConstructorParameters<typeof Intl.PluralRules>) => new Intl.PluralRules(...args));
    const formatters = {
      getNumberFormat: (...args: ConstructorParameters<typeof Intl.NumberFormat>) => new Intl.NumberFormat(...args),
      getDateTimeFormat: (...args: ConstructorParameters<typeof Intl.DateTimeFormat>) => new Intl.DateTimeFormat(...args),
      getPluralRules,
    };
    const { parse } = parser({ onReport: null, formatters });

    expect(parse('{n, plural, one {# cat} other {# cats}}', [{ n: 2 }], 'en', 'a')).toBe('2 cats');
    expect(parse('{n, plural, one {# dog} other {# dogs}}', [{ n: 2 }], 'en', 'b')).toBe('2 dogs');
    expect(getPluralRules).toHaveBeenCalledTimes(2);
  });
});

describe('cache', () => {
  // What `intl-messageformat` compiles, and the options it compiles with, read
  // through the parse hook it declares.
  const compiled: string[] = [];
  const compiledWith: unknown[] = [];
  const original = IntlMessageFormat.__parse!;

  beforeEach(() => {
    compiled.length = 0;
    compiledWith.length = 0;
    IntlMessageFormat.__parse = (message, options) => {
      compiled.push(message);
      compiledWith.push(options);

      return original(message, options);
    };
  });

  afterEach(() => {
    IntlMessageFormat.__parse = original;
    vi.unstubAllGlobals();
  });

  // Every key the maps a parser builds hold, counted once it has run.
  const heldKeys = (run: () => void, of: (key: unknown) => boolean) => {
    const maps: Map<unknown, unknown>[] = [];

    vi.stubGlobal('Map', class extends Map<unknown, unknown> {
      constructor(entries?: Iterable<readonly [unknown, unknown]> | null) {
        super(entries);
        maps.push(this);
      }
    });
    run();
    vi.unstubAllGlobals();

    return maps.reduce((count, map) => count + [...map.keys()].filter(of).length, 0);
  };

  it('keeps a locale and a message apart, whatever characters they hold', () => {
    const reports: Parser.Report[] = [];
    const { parse } = parser({ onReport: (report) => reports.push(report) });

    expect(parse('a\u0000b', [], 'en', 'k')).toBe('a\u0000b');
    expect(parse('b', [], 'en\u0000a', 'k')).toBe('b');
    expect(reports).toMatchObject([{ code: 'failed-message', locale: 'en\u0000a' }]);
  });
  it('reads a cached message in about the time a short one takes, however long it is', () => {
    const { parse } = parser({ onReport: null });
    const long = `Hello {name}! ${'x'.repeat(8000)}`;
    const short = 'Hello {name}!';
    const hits = (message: string) => {
      const start = performance.now();

      for (let hit = 0; hit < 2000; hit += 1) parse(message, [{ name: 'A' }], 'en', 'k');

      return performance.now() - start;
    };
    const best = { long: Infinity, short: Infinity };

    // The best of ten rounds, the first warming up.
    for (let round = 0; round < 11; round += 1) {
      const timeLong = hits(long);
      const timeShort = hits(short);

      if (round > 0) {
        best.long = Math.min(best.long, timeLong);
        best.short = Math.min(best.short, timeShort);
      }
    }

    expect(best.long).toBeLessThan(best.short * 4);
  });
  it('keeps messages named after prototype members as keys of their own', () => {
    const { parse } = parser({ onReport: null });

    ['__proto__', 'constructor', '__proto__', 'constructor'].forEach((message) => {
      expect(parse(message, [], message === '__proto__' ? 'en' : 'cs', 'k')).toBe(message);
    });
    expect(compiled).toEqual(['__proto__', 'constructor']);
  });
  it('holds no more locales than messages, and none a compile threw for', () => {
    const held = heldKeys(() => {
      const { parse } = parser({ onReport: null });

      for (let index = 0; index < 10100; index += 1) {
        parse('Hello', [], `en-x-a${index}`, 'k');
        parse('{broken', [], `en-x-b${index}`, 'k');
      }
    }, (key) => typeof key === 'string' && key.startsWith('en-x-'));

    expect(held).toBeLessThanOrEqual(10000);
  });
  it('evicts the least recently used message across every locale once `cacheLimit` is reached', () => {
    const { parse } = parser({ onReport: null, cacheLimit: 2 });

    parse('a', [], 'en', 'k');
    parse('a', [], 'cs', 'k');
    parse('a', [], 'en', 'k');
    parse('a', [], 'de', 'k');
    expect(compiled).toEqual(['a', 'a', 'a']);

    parse('a', [], 'en', 'k');
    parse('a', [], 'cs', 'k');
    expect(compiled).toEqual(['a', 'a', 'a', 'a']);
    expect(compiledWith.every((options) => !Object.hasOwn(options as object, 'cacheLimit'))).toBe(true);
  });
  it('compiles on every call with a `cacheLimit` of 0', () => {
    const { parse } = parser({ onReport: null, cacheLimit: 0 });
    const money = { number: { money: { style: 'currency', currency: 'USD' } as const } };

    parse('a', [], 'en', 'k');
    parse('a', [], 'en', 'k');
    parse('a', [{}, money], 'en', 'k');
    parse('a', [{}, money], 'en', 'k');
    expect(compiled).toEqual(['a', 'a', 'a', 'a']);
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
  it('caches a message under the `formats` object a call passes', () => {
    const { parse } = parser({ onReport: null });
    const money = { number: { money: { style: 'currency', currency: 'USD' } as const } };

    expect(parse('{value, number, money}', [{ value: 1 }, money], 'en', 'k')).toBe('$1.00');
    expect(parse('{value, number, money}', [{ value: 2 }, money], 'en', 'k')).toBe('$2.00');
    expect(parse('{value, number, money}', [{ value: 3 }], 'en', 'k')).toBe('3');
    expect(compiled).toHaveLength(2);
  });
  it('keeps what a `formats` object caches apart from the messages every call reads', () => {
    const { parse } = parser({ onReport: null, cacheLimit: 1 });
    const money = { number: { money: { style: 'currency', currency: 'USD' } as const } };

    parse('a', [], 'en', 'k');
    Array.from({ length: 3 }, () => parse('{value, number, money}', [{ value: 1 }, { ...money }], 'en', 'k'));
    parse('b', [{}, money], 'en', 'k');
    parse('b', [{}, money], 'en', 'k');
    parse('a', [], 'en', 'k');
    expect(compiled).toEqual(['a', ...Array<string>(3).fill('{value, number, money}'), 'b']);
  });
  it('holds `cacheLimit` messages per `formats` object', () => {
    const { parse } = parser({ onReport: null, cacheLimit: 1 });
    const money = { number: { money: { style: 'currency', currency: 'USD' } as const } };

    parse('a', [{}, money], 'en', 'k');
    parse('b', [{}, money], 'en', 'k');
    parse('a', [{}, money], 'en', 'k');
    expect(compiled).toEqual(['a', 'b', 'a']);
  });
  it('holds no `formats` object it caches under', () => {
    const held = heldKeys(() => {
      const { parse } = parser({ onReport: null });

      for (let index = 0; index < 3; index += 1) {
        parse('{value, number, money}', [{ value: 1 }, { number: { money: { style: 'currency', currency: 'USD' } } }], 'en', 'k');
      }
    }, (key) => typeof key === 'object');

    expect(held).toBe(0);
  });
  it('formats with `formats` that are no object as without any', () => {
    const reports: Parser.Report[] = [];
    const { parse } = parser({ onReport: (report) => reports.push(report) });

    expect(parse('{value, number}', [{ value: 1000 }, null as never], 'en', 'k')).toBe('1,000');
    expect(parse('{value, number}', [{ value: 1000 }, null as never], 'en', 'k')).toBe('1,000');
    expect(reports).toEqual([]);
  });
  it('types `cacheLimit` as a count', () => {
    // @ts-expect-error `cacheLimit` is a number.
    const text: Shipped.Options = { onReport: null, cacheLimit: '5' };

    expect(text).toBeDefined();
  });
});
