import { createInstance } from 'i18next';
import type { InterpolationOptions } from 'i18next';
import type { Parser, Config } from './types';

export type { Parser, Config };

// The build-time half of the contract is a named export of this entry rather
// than a subpath of its own: the package is ESM and declares
// `sideEffects: false`, so a bundle that never reaches it drops it.
export { extractParamsFactory } from './extract';

const FORMATTER_LIMIT = 10000;

type Options = Record<string, unknown>;

// i18next's own reading of the locale, which its built-in formats build with.
const cleaned = (locale: string | undefined) => locale?.replace(/_/g, '-');

// Keeps what a constructor built per locale and the options it read, the
// oldest making room. The options a format receives hold the payload too,
// which no constructor reads, so the names it reads are recorded as it builds
// and only those are keyed.
const keep = <F>(build: (locale: string | undefined, options: Options) => F) => {
  const read = new Set<string>();
  const built = new Map<string, F>();
  // The keys in the order they were kept: a Map's iterator walks past every
  // entry deleted before its oldest, which at the limit is most of the table.
  const order: string[] = [];
  let oldest = 0;

  // `JSON.stringify` sees own data, while the constructor reads through the
  // prototype chain and getters and rejects what is not finite: only options
  // the two read alike are keyed, and a call with any other is not.
  const keyOf = (locale: unknown, options: Options): string | undefined => {
    if (typeof locale !== 'string') return undefined;

    const picked: Options = Object.create(null) as Options;

    for (const name of read) {
      if (!Object.hasOwn(options, name)) {
        if (name in options) return undefined;
        continue;
      }

      const descriptor = Object.getOwnPropertyDescriptor(options, name)!;

      if (!('value' in descriptor)) return undefined;

      const value: unknown = descriptor.value;

      if (value === undefined) continue;
      if (!(value === null || typeof value === 'string' || typeof value === 'boolean'
        || (typeof value === 'number' && Number.isFinite(value)))) return undefined;

      picked[name] = value;
    }

    return JSON.stringify([locale, picked]);
  };

  return (locale: string | undefined, options: Options): F => {
    const size = read.size;
    let key = keyOf(locale, options);

    if (key === undefined) return build(cleaned(locale), options);

    const found = built.get(key);

    if (found !== undefined) return found;

    const recorder = new Proxy(options, {
      get: (target, name) => {
        if (typeof name === 'string') read.add(name);

        return Reflect.get(target, name) as unknown;
      },
    });
    const made = build(cleaned(locale), recorder);

    if (read.size !== size) {
      key = keyOf(locale, options);

      if (key === undefined) return made;
    }

    if (built.size >= FORMATTER_LIMIT) {
      built.delete(order[oldest]);
      order[oldest] = key;
      oldest = (oldest + 1) % FORMATTER_LIMIT;
    } else {
      order.push(key);
    }

    built.set(key, made);

    return made;
  };
};

const parser: Parser.Factory = ({ onReport, interpolation, missingInterpolationHandler, formats }) => {
  // A resource-less instance: base owns the translation tables and resolves
  // the key, so all this parser needs of i18next is the interpolation and
  // formatting engines an instance carries as its services. Svelte escapes
  // text itself, so i18next's HTML escaping would double it: `escapeValue`
  // is off unless the consumer's options state it, and i18next reads an
  // undefined one as its own default, so only a stated value passes through.
  // The cache i18next keeps of its built-in formatters is keyed by the whole
  // payload: it hits only when a payload repeats exactly, and otherwise holds
  // an `Intl` formatter per distinct payload for the life of the process. It
  // stays off for any built-in this parser does not register below.
  const instance = createInstance({
    initAsync: false,
    resources: {},
    cacheInBuiltFormats: false,
    interpolation: { ...interpolation, escapeValue: interpolation?.escapeValue ?? false },
    missingInterpolationHandler,
  });

  // Synchronous under `initAsync: false`; the promise it also returns settles
  // in the same tick and never rejects.
  void instance.init();

  const { interpolator, formatter } = instance.services;

  const numberFormat = keep((locale, options) => new Intl.NumberFormat(locale, options));
  const dateTimeFormat = keep((locale, options) => new Intl.DateTimeFormat(locale, options));
  const relativeTimeFormat = keep((locale, options) => new Intl.RelativeTimeFormat(locale, options));
  const listFormat = keep((locale, options) => new Intl.ListFormat(locale, options));

  // i18next's built-in formats, registered again over formatters kept per
  // locale and the options `Intl` reads; the options are merged, and the
  // value formatted, as i18next's own do.
  const builtIns: Record<string, Parser.Format> = {
    number: (value, locale, options: Options) => numberFormat(locale, { ...options }).format(value),
    currency: (value, locale, options: Options) => numberFormat(locale, { ...options, style: 'currency' }).format(value),
    datetime: (value, locale, options: Options) => dateTimeFormat(locale, { ...options }).format(value),
    relativetime: (value, locale, options: Options) => relativeTimeFormat(locale, { ...options }).format(value, (options.range || 'day') as Intl.RelativeTimeFormatUnit),
    list: (value, locale, options: Options) => listFormat(locale, { ...options }).format(value),
  };

  Object.entries(builtIns).forEach(([name, format]) => formatter!.add(name, format));

  // The built-in formatter is in place unless a formatter module is `use`d,
  // which this instance never is.
  Object.entries(formats ?? {}).forEach(([name, format]) => formatter!.add(name, format));

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

  return {
    parse: (value, [payload, options], locale, key) => {
      // Nothing to format. What a missing translation renders as is base's
      // `fallbackValue`, which base answers with before this is reached.
      if (value === undefined) {
        return '';
      }

      try {
        // i18next hands a leaf that is not text back as it is; this parser
        // declares a string.
        if (typeof value !== 'string') {
          return String(value);
        }

        // The declaration types the fourth argument as `InterpolationOptions`;
        // at runtime it is the options bag of a `t()` call, which is where the
        // formatter reads `formatParams` from.
        return interpolator.interpolate(value, payload ?? {}, locale, (options ?? {}) as InterpolationOptions);
      } catch (error) {
        report({
          code: 'failed-message',
          key,
          locale,
          message: `Message for key '${key}' could not be rendered as text.`,
          error,
        });

        // A leaf that could not become text has no raw form to fall back to.
        return typeof value === 'string' ? value : '';
      }
    },
  };
};

export default parser;
