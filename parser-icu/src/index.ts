import { IntlMessageFormat, type Formats, type Formatters } from 'intl-messageformat';
import type { Parser, Config } from './types';

export type { Parser, Config };

// The build-time half of the contract is a named export of this entry rather
// than a subpath of its own: the package is ESM and declares
// `sideEffects: false`, so a bundle that never reaches it drops it.
export { extractParamsFactory } from './extract';

type Message = ConstructorParameters<typeof IntlMessageFormat>[0];

const CACHE_LIMIT = 10000;
const FORMATTER_LIMIT = 10000;
// A date formatter holds some 30 KB of native memory, several times any other
// kind, so fewer are kept.
const DATE_FORMATTER_LIMIT = 1000;

// A count of entries, or no limit at all; anything else keeps the default.
const capacity = (limit: unknown): number => ((Number.isInteger(limit) && (limit as number) >= 0) || limit === Infinity
  ? limit as number
  : CACHE_LIMIT);

// A leaf that is no message is returned as its text; a null-prototype object,
// or a `toString` that throws, has none.
const raw = (message: unknown): string | undefined => {
  try {
    return String(message);
  } catch {
    return undefined;
  }
};

// The key is what `JSON.stringify` sees, while `Intl` reads an option through
// the prototype chain and through getters: only options the two read alike -
// own, enumerable data of finite numbers, strings and booleans - are keyed.
const keyable = (options: unknown): boolean => {
  if (options === undefined) return true;
  if (typeof options !== 'object' || options === null) return false;

  const prototype: unknown = Object.getPrototypeOf(options);

  if (prototype !== Object.prototype && prototype !== null) return false;

  return Object.getOwnPropertyNames(options).every((name) => {
    const descriptor = Object.getOwnPropertyDescriptor(options, name);

    if (!descriptor?.enumerable || !('value' in descriptor)) return false;

    const value: unknown = descriptor.value;

    return value === undefined || value === null || typeof value === 'string' || typeof value === 'boolean'
      || (typeof value === 'number' && Number.isFinite(value));
  });
};

// Each constructor keeps up to `limit` of what it built for a locale and
// options, the oldest making room: a locale reaches `parse` from the caller,
// so what it builds for must not grow without limit.
const keep = <O, R>(limit: number, build: (locales?: string | string[], options?: O) => R) => {
  const built = new Map<string, R>();
  // The keys in the order they were kept: a Map's iterator walks past every
  // entry deleted before its oldest, which at the limit is most of the table.
  const order: string[] = [];
  let oldest = 0;

  return (locales?: string | string[], options?: O): R => {
    if (typeof locales !== 'string' || !keyable(options)) return build(locales, options);

    const key = JSON.stringify([locales, options]);
    let kept = built.get(key);

    if (kept === undefined) {
      kept = build(locales, options);

      if (built.size >= limit) {
        built.delete(order[oldest]);
        order[oldest] = key;
        oldest = (oldest + 1) % limit;
      } else {
        order.push(key);
      }

      built.set(key, kept);
    }

    return kept;
  };
};

// A node of the recency list, which runs from the least recently used message
// of a cache to the most recently used one.
type Entry = {
  compiled: IntlMessageFormat;
  locale: string;
  message: string;
  older: Entry | undefined;
  newer: Entry | undefined;
};

type Cache = {
  get: (locale: string, message: string) => IntlMessageFormat | undefined;
  set: (locale: string, message: string, compiled: IntlMessageFormat) => void;
};

// Compiled messages by locale, then by message, so a hit hashes the message
// string a catalogue holds, evicted least recently used first. A locale reaches
// `parse` from the caller, so the limit bounds the locales held as well: a
// locale is held while a message of it is, and never for a compile that threw.
const lru = (limit: number): Cache => {
  const locales = new Map<string, Map<string, Entry>>();
  let oldest: Entry | undefined;
  let newest: Entry | undefined;
  let size = 0;

  const unlink = (entry: Entry) => {
    if (entry.older) entry.older.newer = entry.newer;
    else oldest = entry.newer;
    if (entry.newer) entry.newer.older = entry.older;
    else newest = entry.older;
  };

  const append = (entry: Entry) => {
    entry.older = newest;
    entry.newer = undefined;
    if (newest) newest.newer = entry;
    else oldest = entry;
    newest = entry;
  };

  const evict = (entry: Entry) => {
    const messages = locales.get(entry.locale)!;

    unlink(entry);
    messages.delete(entry.message);
    if (messages.size === 0) locales.delete(entry.locale);
    size -= 1;
  };

  return {
    get: (locale, message) => {
      const held = locales.get(locale)?.get(message);

      if (held !== undefined && held !== newest) {
        unlink(held);
        append(held);
      }

      return held?.compiled;
    },
    set: (locale, message, compiled) => {
      if (size >= limit) evict(oldest!);

      let messages = locales.get(locale);

      if (messages === undefined) {
        messages = new Map();
        locales.set(locale, messages);
      }

      const entry: Entry = { compiled, locale, message, older: undefined, newer: undefined };

      messages.set(message, entry);
      append(entry);
      size += 1;
    },
  };
};

const sharedFormatters = (): Formatters => ({
  getNumberFormat: keep(FORMATTER_LIMIT, (locales, options?: Intl.NumberFormatOptions) => new Intl.NumberFormat(locales, options)),
  getDateTimeFormat: keep(DATE_FORMATTER_LIMIT, (locales, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locales, options)),
  getPluralRules: keep(FORMATTER_LIMIT, (locales, options?: Intl.PluralRulesOptions) => new Intl.PluralRules(locales, options)),
});

const parser: Parser.Factory = ({ onReport, cacheLimit, ...rest }) => {
  // One set of formatters serves every message this parser formats, unless
  // the consumer brought their own.
  const parserOptions = rest.formatters ? rest : { ...rest, formatters: sharedFormatters() };
  const limit = capacity(cacheLimit);
  const plain = lru(limit);
  // Per-call `formats` change the compilation, so each formats object keeps a
  // cache of its own, which goes when the object does: one built for a render
  // takes nothing from the messages every render reads.
  const formatted = new WeakMap<object, Cache>();

  const cacheOf = (formats: Partial<Formats> | undefined): Cache | undefined => {
    if (limit === 0) return undefined;
    if (formats === undefined) return plain;
    // Anything else `intl-messageformat` reads as no formats, and it is no key.
    if (typeof formats !== 'object' || formats === null) return undefined;

    let cache = formatted.get(formats);

    if (cache === undefined) {
      cache = lru(limit);
      formatted.set(formats, cache);
    }

    return cache;
  };

  const compile = (message: Message, locale: string, formats: Partial<Formats> | undefined) => new IntlMessageFormat(message, locale, formats, parserOptions);

  const cached = (message: string, locale: string, formats: Partial<Formats> | undefined): IntlMessageFormat => {
    const cache = cacheOf(formats);
    const held = cache?.get(locale, message);

    if (held !== undefined) return held;

    const compiled = compile(message, locale, formats);

    cache?.set(locale, message, compiled);

    return compiled;
  };

  // A report channel is consumer code: a throwing one must not take a render
  // down with it.
  const report = (entry: Parser.Report) => {
    if (!onReport) return;

    try {
      onReport(entry);
    } catch {
      return;
    }
  };

  const render = (compiled: IntlMessageFormat, payload: Parser.Payload | undefined, locale: string, key: string): string => {
    const formatted: unknown = compiled.format(payload);

    if (typeof formatted === 'string') return formatted;

    // A payload value the message cannot render as text - an object, or a tag
    // callback returning one - makes `format` yield the pieces instead. This
    // parser declares a string, so they are joined and the loss is reported.
    report({
      code: 'unserializable-output',
      key,
      locale,
      message: `Message for key '${key}' was rendered from values that are not text; the pieces were joined.`,
    });

    return Array.isArray(formatted) ? formatted.join('') : String(formatted);
  };

  return {
    parse: (message, [payload, formats], locale, key) => {

      // Nothing to format. What a missing translation renders as is base's
      // `fallbackValue`, which base answers with before this is reached.
      if (message === undefined) {
        return '';
      }

      try {
        const compiled = typeof message === 'string' ? cached(message, locale, formats) : compile(message, locale, formats);

        return render(compiled, payload, locale, key);
      } catch (error) {
        const text = raw(message);

        report({
          code: 'failed-message',
          key,
          locale,
          message: text === undefined
            ? `Message for key '${key}' could not be rendered as text.`
            : `Message for key '${key}' could not be formatted and was returned raw.`,
          error,
        });

        return text ?? '';
      }
    },
  };
};

export default parser;
