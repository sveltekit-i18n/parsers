import { FluentBundle, FluentResource } from '@fluent/bundle';
import type { FluentVariable } from '@fluent/bundle';
import { compile } from './compile';
import type { Pattern } from './compile';
import type { Parser, Config } from './types';

export type { Parser, Config };

// The build-time half of the contract is a named export of this entry rather
// than a subpath of its own: the package is ESM and declares
// `sideEffects: false`, so a bundle that never reaches it drops it.
export { extractParamsFactory } from './extract';

// What a custom function returns, and what a payload may carry beside strings,
// numbers and dates, from the copy of `@fluent/bundle` this parser formats
// with: Fluent tells a value's type by `instanceof`, and a runtime may load
// the package's CommonJS build where a bundler takes its ES module.
export { FluentDateTime, FluentNone, FluentNumber, FluentType } from '@fluent/bundle';
export type { FluentFunction, FluentValue, FluentVariable } from '@fluent/bundle';

const CACHE_LIMIT = 10000;
// A bundle holds the `Intl` objects of its locale, and a locale reaches
// `parse` from the caller.
const BUNDLE_LIMIT = 1000;

// What `formatPattern` answers when nothing of the message could be formatted:
// the text of a `FluentNone` without a value.
const NOTHING = '{???}';

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

// A node of the recency list, which runs from the least recently used entry
// of a cache to the most recently used one.
type Entry<V> = {
  key: string;
  value: V;
  older: Entry<V> | undefined;
  newer: Entry<V> | undefined;
};

type Cache<V> = {
  get: (key: string) => V | undefined;
  set: (key: string, value: V) => void;
};

// Values by key, evicted least recently used first.
const lru = <V>(limit: number): Cache<V> => {
  const entries = new Map<string, Entry<V>>();
  let oldest: Entry<V> | undefined;
  let newest: Entry<V> | undefined;

  const unlink = (entry: Entry<V>) => {
    if (entry.older) entry.older.newer = entry.newer;
    else oldest = entry.newer;
    if (entry.newer) entry.newer.older = entry.older;
    else newest = entry.older;
  };

  const append = (entry: Entry<V>) => {
    entry.older = newest;
    entry.newer = undefined;
    if (newest) newest.newer = entry;
    else oldest = entry;
    newest = entry;
  };

  const get = (key: string) => {
    const held = entries.get(key);

    if (held !== undefined && held !== newest) {
      unlink(held);
      append(held);
    }

    return held?.value;
  };

  return {
    get,
    set: (key, value) => {
      // A call made while this one was building the value cached it first.
      if (get(key) !== undefined) return;

      if (entries.size >= limit) {
        const evicted = oldest!;

        unlink(evicted);
        entries.delete(evicted.key);
      }

      const entry: Entry<V> = { key, value, older: undefined, newer: undefined };

      entries.set(key, entry);
      append(entry);
    },
  };
};

// The terms of each locale, read once. A reference to a term without a value
// throws inside `@fluent/bundle`, so such a term is left out with the
// messages.
const readTerms = (terms: Record<string, string> | undefined): Map<string, FluentResource> => {
  const read = new Map<string, FluentResource>();

  Object.entries(terms ?? {}).forEach(([locale, source]) => {
    if (typeof source !== 'string') return;

    let resource: FluentResource;

    try {
      resource = new FluentResource(source);
    } catch {
      return;
    }

    resource.body = resource.body.filter(({ id, value }) => id.startsWith('-') && value !== null);
    read.set(locale.toLowerCase(), resource);
  });

  return read;
};

// Only an object holds variables: any other value would lend the message its
// own properties, a string its `length`.
const variables = (payload: unknown): Record<string, FluentVariable> | null => (typeof payload === 'object' && payload !== null
  ? payload as Record<string, FluentVariable>
  : null);

const parser: Parser.Factory = ({ onReport, terms, cacheLimit, functions, useIsolating, transform }) => {
  const limit = capacity(cacheLimit);
  // A pattern does not depend on the locale, so one entry serves every locale
  // a message is formatted in.
  const patterns = limit === 0 ? undefined : lru<Pattern>(limit);
  const bundles = lru<FluentBundle>(BUNDLE_LIMIT);
  const resources = readTerms(terms);

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

  const patternOf = (message: string): Pattern => {
    const held = patterns?.get(message);

    if (held !== undefined) return held;

    const pattern = compile(message);

    patterns?.set(message, pattern);

    return pattern;
  };

  const bundleOf = (locale: string): FluentBundle => {
    const held = bundles.get(locale);

    if (held !== undefined) return held;

    // `@fluent/bundle` keeps the `Intl` objects of every locale string it was
    // given in a map of its own it never empties, so the bundle is built for
    // one constant locale and handed its own locale and memo afterwards: they
    // then go when the bundle does.
    const bundle = new FluentBundle('und', { functions, useIsolating, transform });
    const resource = resources.get(locale.toLowerCase());

    bundle.locales = [locale];
    bundle._intls = new Map();
    if (resource !== undefined) bundle.addResource(resource);
    bundles.set(locale, bundle);

    return bundle;
  };

  const fail = (key: string, locale: string, text: string, error: unknown) => {
    report({
      code: 'failed-message',
      key,
      locale,
      message: `Message for key '${key}' could not be formatted and was returned raw.`,
      error,
    });

    return text;
  };

  return {
    parse: (message, [payload], locale, key) => {
      // Nothing to format. What a missing translation renders as is base's
      // `fallbackValue`, which base answers with before this is reached.
      if (message === undefined) {
        return '';
      }

      if (typeof message !== 'string') {
        const text = raw(message);

        report({
          code: 'failed-message',
          key,
          locale,
          message: text === undefined
            ? `Message for key '${key}' could not be rendered as text.`
            : `Message for key '${key}' is not text and was returned as its text.`,
        });

        return text ?? '';
      }

      let pattern: Pattern;

      try {
        pattern = patternOf(message);
      } catch (error) {
        return fail(key, locale, message, error);
      }

      // An empty message.
      if (pattern === null) return '';

      const errors: Error[] = [];
      let output: string;

      try {
        output = bundleOf(locale).formatPattern(pattern, variables(payload), errors);
      } catch (error) {
        // What a custom function or `transform` throws that is no `Error`.
        return fail(key, locale, message, error);
      }

      // Fluent catches an error that ends the whole message - an invalid
      // date, a locale `Intl` rejects, more than 100 placeables - and answers
      // its fallback for the message.
      if (output === NOTHING && errors.length > 0) {
        return fail(key, locale, message, errors[errors.length - 1]);
      }

      errors.forEach((error) => {
        report({
          code: 'fallback-value',
          key,
          locale,
          message: `A placeable in the message for key '${key}' could not be resolved and was rendered as its fallback.`,
          error,
        });
      });

      return output;
    },
  };
};

export default parser;
