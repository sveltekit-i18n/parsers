import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageDataModelError, MessageResolutionError, MessageSyntaxError } from 'messageformat';
import type { MessageFunction } from 'messageformat/functions';
import parser, { Parser } from '../../src';
import { TRANSLATIONS } from '../data';

// What the engine compiles, and the options it compiles with.
const { compiled, compiledWith } = vi.hoisted(() => ({ compiled: [] as unknown[], compiledWith: [] as unknown[] }));

vi.mock('messageformat', async (importOriginal) => {
  const original = await importOriginal<typeof import('messageformat')>();

  class MessageFormat<T extends string = never, P extends string = T> extends original.MessageFormat<T, P> {
    constructor(...args: ConstructorParameters<typeof original.MessageFormat<T, P>>) {
      compiled.push(args[1]);
      compiledWith.push(args[2]);
      super(...args);
    }
  }

  return { ...original, MessageFormat };
});

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

describe('cache', () => {
  beforeEach(() => {
    compiled.length = 0;
    compiledWith.length = 0;
  });

  afterEach(() => {
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
    const { parse } = parser({ onReport: (report) => reports.push(report), bidiIsolation: 'none' });

    expect(parse('{|a\u0000b|}', [], 'en', 'k')).toBe('a\u0000b');
    expect(parse('b|}', [], 'en\u0000{|a', 'k')).toBe('b|}');
    expect(reports).toMatchObject([{ code: 'failed-message', locale: 'en\u0000{|a' }]);
  });
  it('reads a cached message in about the time a short one takes, however long it is', () => {
    const { parse } = parser({ onReport: null });
    const long = `Hello {$name}! ${'x'.repeat(8000)}`;
    const short = 'Hello {$name}!';
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
  it('compiles a message that is no text on every call', () => {
    const { parse } = parser({ onReport: null });
    const source = { type: 'message', declarations: [], pattern: ['Hi'] };

    expect(parse(source, [], 'en', 'k')).toBe('Hi');
    expect(parse(source, [], 'en', 'k')).toBe('Hi');
    expect(compiled).toEqual([source, source]);
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
  it.each([
    ['bdadacba', 'bdacb'],
    ['badacba', 'badcb'],
    ['bdadcba', 'bdacba'],
  ])('keeps the recency order through reads from its middle (%s)', (reads, compiles) => {
    const { parse } = parser({ onReport: null, cacheLimit: 3 });

    for (const message of reads) parse(message, [], 'en', 'k');
    expect(compiled.join('')).toBe(compiles);
  });
  it('keeps evicting once its one message is evicted, with a `cacheLimit` of 1', () => {
    const { parse } = parser({ onReport: null, cacheLimit: 1 });

    for (const message of 'abaa') parse(message, [], 'en', 'k');
    expect(compiled.join('')).toBe('aba');
  });
  it('keeps one entry for a message a call cached while it was compiling it', () => {
    const reports: Parser.Report[] = [];
    const { parse } = parser({ onReport: (report) => reports.push(report), cacheLimit: 2 });
    const prototype = Object.prototype as Record<string, unknown>;
    let reenter = true;

    // An option the engine reads through the prototype chain, whose getter
    // parses the same message again while it compiles; what the engine
    // assigns to it stays the object's own.
    Object.defineProperty(prototype, 'bidiIsolation', {
      configurable: true,
      get: () => {
        if (reenter) {
          reenter = false;
          parse('A {$n}', [{ n: 1 }], 'en', 'a');
        }

        return undefined;
      },
      set(value: unknown) {
        Object.defineProperty(this, 'bidiIsolation', { value, writable: true, enumerable: true, configurable: true });
      },
    });

    try {
      expect(parse('A {$n}', [{ n: 1 }], 'en', 'a')).toBe('A 1');
    } finally {
      delete prototype['bidiIsolation'];
    }

    expect(reenter).toBe(false);
    expect(parse('B {$n}', [{ n: 2 }], 'de', 'b')).toBe('B 2');
    expect(parse('C {$n}', [{ n: 3 }], 'de', 'c')).toBe('C 3');
    expect(reports).toEqual([]);
  });
  it.each([
    { when: 'below its limit', cacheLimit: 4, fill: 'de', calls: 'bac', left: 'between two others' },
    { when: 'below its limit', cacheLimit: 4, fill: 'de', calls: 'abc', left: 'the oldest' },
    { when: 'at its limit', cacheLimit: 3, fill: 'd', calls: 'bac', left: 'between two others' },
    { when: 'at its limit', cacheLimit: 3, fill: 'd', calls: 'abc', left: 'the oldest' },
  ])('uses a message a call cached while it was compiling it as it uses a hit, $when, the call having left it $left', ({ cacheLimit, fill, calls }) => {
    const { parse } = parser({ onReport: null, cacheLimit });
    const prototype = Object.prototype as Record<string, unknown>;
    let reenter = true;

    // An option the engine reads through the prototype chain, whose getter
    // parses three messages, this one among them, while it compiles; what the
    // engine assigns to it stays the object's own.
    Object.defineProperty(prototype, 'bidiIsolation', {
      configurable: true,
      get: () => {
        if (reenter) {
          reenter = false;
          for (const message of calls) parse(message, [], 'en', 'k');
        }

        return undefined;
      },
      set(value: unknown) {
        Object.defineProperty(this, 'bidiIsolation', { value, writable: true, enumerable: true, configurable: true });
      },
    });

    try {
      expect(parse('a', [], 'en', 'k')).toBe('a');
      compiled.length = 0;
      // Wherever the call left A, the outer call used it last: B, the oldest,
      // is still held, and the first message past the limit lets C go.
      for (const message of `b${fill}ac`) parse(message, [], 'en', 'k');
    } finally {
      delete prototype['bidiIsolation'];
    }

    expect(reenter).toBe(false);
    expect(compiled.join('')).toBe(`${fill}c`);
  });
  it('keeps a message apart for each locale it was compiled for', () => {
    const { parse } = parser({ onReport: null });

    for (const locale of ['en', 'cs', 'cs', 'en']) parse('a', [], locale, 'k');
    expect(compiled).toEqual(['a', 'a']);
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
});
