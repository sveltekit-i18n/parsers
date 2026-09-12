import { IntlMessageFormat } from 'intl-messageformat';
import type { Parser, Config } from './types';

export type { Parser, Config };

// The build-time half of the contract is a named export of this entry rather
// than a subpath of its own: the package is ESM and declares
// `sideEffects: false`, so a bundle that never reaches it drops it.
export { extractParamsFactory } from './extract';

const CACHE_LIMIT = 10000;

const parser: Parser.Factory = ({ onReport, ...parserOptions }) => {
  // Compiled messages keyed by locale and message, evicted least-recently-used.
  // Per-call `formats` change the compilation, so those calls bypass the cache.
  const cache = new Map<string, IntlMessageFormat>();

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

      if (message === undefined) {
        return `${key}`;
      }

      try {
        if (formats !== undefined || typeof message !== 'string') {
          return render(new IntlMessageFormat(message, locale, formats, parserOptions), payload, locale, key);
        }

        const cacheKey = `${locale}\u0000${message}`;
        let compiled = cache.get(cacheKey);

        if (compiled === undefined) {
          compiled = new IntlMessageFormat(message, locale, undefined, parserOptions);

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

        return render(compiled, payload, locale, key);
      } catch (error) {
        report({
          code: 'failed-message',
          key,
          locale,
          message: `Message for key '${key}' could not be formatted and was returned raw.`,
          error,
        });

        return `${message}`;
      }
    },
  };
};

export default parser;
