import { createInstance } from 'i18next';
import type { InterpolationOptions } from 'i18next';
import type { Parser, Config } from './types';

export type { Parser, Config };

// The build-time half of the contract is a named export of this entry rather
// than a subpath of its own: the package is ESM and declares
// `sideEffects: false`, so a bundle that never reaches it drops it.
export { extractParamsFactory } from './extract';

const parser: Parser.Factory = ({ onReport, interpolation, missingInterpolationHandler, formats }) => {
  // A resource-less instance: base owns the translation tables and resolves
  // the key, so all this parser needs of i18next is the interpolation and
  // formatting engines an instance carries as its services. Svelte escapes
  // text itself, so i18next's HTML escaping would double it: `escapeValue`
  // is off unless the consumer's options state it, and i18next reads an
  // undefined one as its own default, so only a stated value passes through.
  // The cache i18next keeps of its built-in formatters is keyed by the whole
  // payload: it hits only when a payload repeats exactly, and otherwise holds
  // an `Intl` formatter per distinct payload for the life of the process,
  // which a payload that differs per request would grow without bound.
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
