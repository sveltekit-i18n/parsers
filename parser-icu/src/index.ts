import { IntlMessageFormat } from 'intl-messageformat';
import type { Parser, Config } from './types';

export type { Parser, Config };

const CACHE_LIMIT = 10000;

const parser: Parser.Factory = (parserOptions) => {
  // Compiled messages keyed by locale and message, evicted least-recently-used.
  // Per-call `formats` change the compilation, so those calls bypass the cache.
  const cache = new Map<string, IntlMessageFormat>();

  return {
    parse: (message, [payload, formats], locale, key) => {

      if (message === undefined) {
        return `${key}`;
      }

      try {
        if (formats !== undefined || typeof message !== 'string') {
          return new IntlMessageFormat(message, locale, formats, parserOptions).format(payload);
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

        return compiled.format(payload);
      } catch (error) {
        console.warn(`[i18n]: Message for key '${key}' could not be formatted and was returned raw.`, error);

        return `${message}`;
      }
    },
  };
};

export default parser;
