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

const parser: Parser.Factory = ({ onReport, functions, ...parserOptions }) => {
  // The other official parsers format dates and money out of the box; the
  // draft functions are what gives this format the same reach.
  const options = { ...parserOptions, functions: { ...DraftFunctions, ...functions } };

  // Compiled messages keyed by locale and message, evicted least-recently-used.
  const cache = new Map<string, MessageFormat<string>>();

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

    const cacheKey = `${locale}\u0000${message}`;
    let compiled = cache.get(cacheKey);

    if (compiled === undefined) {
      compiled = new MessageFormat(locale, message, options);

      if (cache.size >= CACHE_LIMIT) {
        const oldest = cache.keys().next().value;

        if (oldest !== undefined) {
          cache.delete(oldest);
        }
      }
    } else {
      cache.delete(cacheKey);
    }

    cache.set(cacheKey, compiled);

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
