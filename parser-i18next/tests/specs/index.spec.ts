import { afterEach, describe, expect, it, vi } from 'vitest';
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

type IntlKind = 'NumberFormat' | 'DateTimeFormat' | 'RelativeTimeFormat' | 'ListFormat';

// Counts the formatters of a kind built from here on. Each is returned rather
// than constructed in place: the spy constructs with itself as `new.target`,
// which leaves the instance without the real prototype.
const spyOnIntl = (kind: IntlKind) => {
  const Built = Intl[kind] as new (...args: unknown[]) => object;

  return vi.spyOn(Intl, kind as 'NumberFormat').mockImplementation(function (...args: unknown[]) {
    return new Built(...args) as Intl.NumberFormat;
  });
};

describe('parser', () => {
  // A spy left in place by a failed expectation would count for every later
  // test.
  afterEach(() => {
    vi.restoreAllMocks();
  });

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
  it('keeps one `Intl` formatter per locale and the options it reads, whatever the payload', () => {
    // The options a format receives hold the payload, which differs per
    // render: a formatter keyed by them would be built on every render.
    const own = parser({ onReport: null });
    const $en = localize(initLocale, own);
    const $cs = localize('cs', own);
    const number = { en: new Intl.NumberFormat('en'), cs: new Intl.NumberFormat('cs') };
    const dateTime = { en: new Intl.DateTimeFormat('en'), cs: new Intl.DateTimeFormat('cs') };
    const numbers = spyOnIntl('NumberFormat');
    const dates = spyOnIntl('DateTimeFormat');
    const extra = { at: new Date(0), user: { name: 'Bob' }, tags: ['a'] };

    for (let n = 1; n <= 50; n += 1) {
      const d = new Date(2024, 2, n);

      expect($en('common.number', { ...extra, n: n + 0.5 })).toBe(number.en.format(n + 0.5));
      expect($cs('common.number', { ...extra, n: n + 0.5 })).toBe(number.cs.format(n + 0.5));
      expect($en('common.date', { ...extra, d })).toBe(dateTime.en.format(d));
      expect($cs('common.date', { ...extra, d })).toBe(dateTime.cs.format(d));
    }

    expect(numbers).toHaveBeenCalledTimes(2);
    expect(dates).toHaveBeenCalledTimes(2);
  });
  it.each([
    { kind: 'NumberFormat', limit: 10000, key: 'common.number', payload: { n: 1234.5 }, text: '1,234.5' },
    { kind: 'DateTimeFormat', limit: 1000, key: 'common.date', payload: { d: date }, text: '3/5/2024' },
    { kind: 'RelativeTimeFormat', limit: 10000, key: 'common.ago', payload: { d: -3 }, text: '3 days ago' },
    { kind: 'ListFormat', limit: 10000, key: 'common.list', payload: { l: ['a', 'b', 'c'] }, text: 'a, b, and c' },
  ] as const)('keeps no more than $limit of $kind, the oldest making room', ({ kind, limit, key, payload, text }) => {
    const { parse } = parser({ onReport: null });
    // Locales the catalogue lacks, which `Intl` reads as English.
    const locales = Array.from({ length: limit + 1 }, (_, i) => `en-x-${i.toString(36).padStart(4, '0')}`);
    const render = (locale: string) => parse(message(initLocale, key), [payload], locale, key);

    locales.forEach((locale) => expect(render(locale)).toBe(text));

    const built = spyOnIntl(kind);

    expect(render(locales[limit])).toBe(text);
    expect(render(locales[1])).toBe(text);
    expect(built).toHaveBeenCalledTimes(0);
    expect(render(locales[0])).toBe(text);
    expect(built).toHaveBeenCalledTimes(1);
  }, 30_000);
  // A list formatter that costs next to nothing to build, one to a locale, so
  // what is timed and counted is the keeping.
  const lists = () => {
    const built = vi.spyOn(Intl, 'ListFormat').mockImplementation(function () {
      return { format: () => 'x' } as unknown as Intl.ListFormat;
    });
    const { parse } = parser({ onReport: null });
    const render = (from: number, to: number) => {
      for (let i = from; i < to; i += 1) parse('{{l, list}}', [{ l: ['a'] }], `en-x-${i}`, 'k');
    };
    const builds = (locale: number) => {
      built.mockClear();
      render(locale, locale + 1);

      return built.mock.calls.length;
    };

    return { built, render, builds };
  };

  it('makes room at its limit in about the time it takes to keep a formatter below it', () => {
    const misses = (render: (from: number, to: number) => void, from: number, to: number) => {
      const start = performance.now();

      render(from, to);

      return performance.now() - start;
    };
    const best = { below: Infinity, at: Infinity };

    // The best of five pairs of parsers, each timed for 8,000 locales: one
    // below its limit of 10,000, the other once it has made room 16,000 times.
    // The two take turns, 500 locales at a time, so a slow stretch of the host
    // weighs on both alike.
    for (let round = 0; round < 5; round += 1) {
      const below = lists().render;
      const at = lists().render;
      const time = { below: 0, at: 0 };

      misses(below, 0, 2000);
      misses(at, 0, 26000);

      for (let chunk = 0; chunk < 16; chunk += 1) {
        time.below += misses(below, 2000 + chunk * 500, 2500 + chunk * 500);
        time.at += misses(at, 26000 + chunk * 500, 26500 + chunk * 500);
      }

      best.below = Math.min(best.below, time.below);
      best.at = Math.min(best.at, time.at);
    }

    expect(best.at).toBeLessThan(best.below * 2);
  }, 30_000);
  it('keeps the newest of what it built, however many times it made room', () => {
    const { render, builds } = lists();

    // The first two locales made room for the next two, oldest first.
    render(0, 10002);
    expect(builds(9999)).toBe(0);
    expect(builds(1)).toBe(1);
    // 34,001 formatters in all: the newest 10,000 are the last 10,000 locales'.
    render(10002, 34000);
    expect(builds(24000)).toBe(0);
    expect(builds(23999)).toBe(1);
  }, 30_000);
  it.each([
    { when: 'below its limit', at: 0, next: 9999 },
    { when: 'at its limit', at: 10000, next: 10001 },
  ])('keeps one slot for a formatter a call kept while it was building it, $when', ({ at, next }) => {
    const { built, render, builds } = lists();
    let reenter = true;

    render(0, at);
    // An options getter that calls `parse` again with the same locale, as a
    // formatter is built.
    built.mockImplementation(function () {
      if (reenter) {
        reenter = false;
        render(at, at + 1);
      }

      return { format: () => 'x' } as unknown as Intl.ListFormat;
    });

    // The newest 10,000 are the last 10,000 locales'. A second slot for the
    // key kept twice would hold the formatter of `next` past the limit.
    render(at, 34000);
    expect(builds(24000)).toBe(0);
    expect(builds(23999)).toBe(1);
    expect(builds(next)).toBe(1);
  }, 30_000);
  it('keys the options `Intl` reads from the payload and the call', () => {
    const { parse } = parser({ onReport: null });
    const $t = localize(initLocale, { parse });

    expect(parse('{{n, currency}}', [{ n: 1234.5, currency: 'EUR' }], initLocale, 'k')).toBe('€1,234.50');
    expect(parse('{{n, currency}}', [{ n: 1234.5, currency: 'JPY' }], initLocale, 'k')).toBe('¥1,235');
    expect(parse('{{n, currency}}', [{ n: 1234.5, currency: 'EUR' }], initLocale, 'k')).toBe('€1,234.50');
    expect($t('common.number', { n: 1234.5 }, { formatParams: { n: { maximumFractionDigits: 0 } } })).toBe('1,235');
    expect($t('common.number', { n: 1234.5 })).toBe('1,234.5');
  });
  it('reads the unit of `relativetime` per call', () => {
    const $t = localize(initLocale, parser({ onReport: null }));

    expect($t('common.ago', { d: 3 })).toBe('in 3 days');
    expect($t('common.ago', { d: 3 }, { formatParams: { d: { range: 'hour' } } })).toBe('in 3 hours');
    expect($t('common.ago', { d: 3 })).toBe('in 3 days');
  });
  it('builds for the call what it cannot key', () => {
    const $t = localize(initLocale, parser({ onReport: null }));
    const style = { toString: () => 'percent' };
    const built = spyOnIntl('NumberFormat');

    expect($t('common.number', { n: 0.5 }, { formatParams: { n: { style } } })).toBe('50%');
    expect($t('common.number', { n: 0.5 }, { formatParams: { n: { style } } })).toBe('50%');
    expect(built).toHaveBeenCalledTimes(2);

    expect($t('common.number', { n: 1234.5 }, { formatParams: { n: { lng: 42 } } })).toBe('1234.5');
  });
  it('reads an option inherited from `Object.prototype` as `Intl` does', () => {
    const $t = localize(initLocale, parser({ onReport: null }));
    const prototype = Object.prototype as Record<string, unknown>;

    expect($t('common.number', { n: 1.23456 })).toBe('1.235');

    try {
      prototype['maximumFractionDigits'] = 0;

      expect($t('common.number', { n: 1.23456 })).toBe('1');
      expect(localize(initLocale, parser({ onReport: null }))('common.number', { n: 1.23456 })).toBe('1');
    } finally {
      delete prototype['maximumFractionDigits'];
    }

    expect($t('common.number', { n: 1.23456 })).toBe('1.235');
    expect(localize(initLocale, parser({ onReport: null }))('common.number', { n: 1.23456 })).toBe('1.235');
    expect(({} as Record<string, unknown>)['maximumFractionDigits']).toBeUndefined();
  });
  it('keys no option `Intl` rejects', () => {
    const $t = localize(initLocale, parser({ onReport: null }));

    // `null` reads as 0, `NaN` is out of range: the engine contains the throw
    // and hands the value on.
    expect($t('common.number', { n: 1234.5 }, { formatParams: { n: { minimumFractionDigits: null } } })).toBe('1,234.5');
    expect($t('common.number', { n: 1234.5 }, { formatParams: { n: { minimumFractionDigits: NaN } } })).toBe('1234.5');
  });
  it('lets a custom format replace a built-in', () => {
    const $t = localize(initLocale, parser({ onReport: null, formats: { number: () => 'N' } }));

    expect($t('common.number', { n: 1234.5 })).toBe('N');
    expect(localize(initLocale, parser({ onReport: null }))('common.number', { n: 1234.5 })).toBe('1,234.5');
  });
  it('formats in a prototype-named locale the same every time', () => {
    const own = parser({ onReport: null });

    ['__proto__', 'constructor', 'toString'].forEach((locale) => {
      const first = localize(locale, own)('common.number', { n: 1234.5 });

      expect(localize(locale, own)('common.number', { n: 1234.5 })).toBe(first);
      expect(localize(locale, parser({ onReport: null }))('common.number', { n: 1234.5 })).toBe(first);
    });
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
