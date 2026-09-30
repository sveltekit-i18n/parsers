import { MessageFormat } from 'messageformat';
import { DraftFunctions } from 'messageformat/functions';
import type { Parser, Config } from './types';

export type { Parser, Config };

// The build-time half of the contract is a named export of this entry rather
// than a subpath of its own: the package is ESM and declares
// `sideEffects: false`, so a bundle that never reaches it drops it.
export { extractParamsFactory } from './extract';

const CACHE_LIMIT = 10000;

// A leaf that is no message is returned as its text; a null-prototype object,
// or a `toString` that throws, has none.
const raw = (message: unknown): string | undefined => {
  try {
    return String(message);
  } catch {
    return undefined;
  }
};

// A node of the recency list, which runs from the least recently used message
// of a cache to the most recently used one.
type Entry = {
  compiled: MessageFormat<string>;
  locale: string;
  message: string;
  older: Entry | undefined;
  newer: Entry | undefined;
};

type Cache = {
  get: (locale: string, message: string) => MessageFormat<string> | undefined;
  set: (locale: string, message: string, compiled: MessageFormat<string>) => void;
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

const parser: Parser.Factory = ({ onReport, functions, ...parserOptions }) => {
  // The other official parsers format dates and money out of the box; the
  // draft functions are what gives this format the same reach.
  const options = { ...parserOptions, functions: { ...DraftFunctions, ...functions } };

  const cache = lru(CACHE_LIMIT);

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

  const compile = (message: unknown, locale: string): MessageFormat<string> => {
    // A leaf that is not text is handed over as it is: the engine takes its
    // own data model as a source, and rejects anything else itself.
    if (typeof message !== 'string') {
      return new MessageFormat(locale, message as string, options);
    }

    const held = cache.get(locale, message);

    if (held !== undefined) return held;

    const compiled = new MessageFormat(locale, message, options);

    cache.set(locale, message, compiled);

    return compiled;
  };

  return {
    parse: (message, [payload], locale, key) => {

      // Nothing to format. What a missing translation renders as is base's
      // `fallbackValue`, which base answers with before this is reached.
      if (message === undefined) {
        return '';
      }

      try {
        // Without a callback the engine warns on the process itself; with one,
        // the expression renders as its fallback and the loss goes where the
        // host said.
        return compile(message, locale).format(payload, (error) => {
          report({
            code: 'fallback-value',
            key,
            locale,
            message: `An expression in the message for key '${key}' could not be resolved and was rendered as its fallback.`,
            error,
          });
        });
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
