import type { Parser as BaseParser } from '@sveltekit-i18n/base';
import type { Parser } from './types';

// i18next's own escaping of a consumer-supplied marker, so the scanner builds
// the expressions the interpolator builds.
const regexEscape = (text: string) => text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

/**
 * `'unknown'` is the top of base's lattice, so a placeholder that narrows
 * nothing reports it: a bare placeholder stringifies whatever it receives, a
 * `list` takes an array no kind names, and a custom format is opaque here.
 * `'date'` already means `Date | number` in base, which is what
 * `Intl.DateTimeFormat` takes.
 */
const kindOf = (format: string | undefined): BaseParser.ParamKind => {
  switch (format) {
    case 'number':
    case 'currency':
    case 'relativetime': return 'number';
    case 'datetime': return 'date';
    default: return 'unknown';
  }
};

type Kinds = BaseParser.ParamKind | readonly BaseParser.ParamKind[];

/** Keeps every kind that narrows, and `'unknown'` only while nothing does. */
const mergeKinds = (current: Kinds, next: BaseParser.ParamKind): Kinds => {
  const held = Array.isArray(current) ? current : [current as BaseParser.ParamKind];
  const merged = next === 'unknown' ? held : [...held.filter((kind) => kind !== 'unknown'), next];
  const kinds = [...new Set(merged)];

  return kinds.length === 1 ? kinds[0]! : kinds;
};

type Placeholder = { start: number; end: number; text: string };

const scan = (message: string, regex: RegExp): Placeholder[] => [...message.matchAll(regex)].map((match) => ({
  start: match.index,
  end: match.index + match[0].length,
  text: match[1],
}));

/**
 * Builds the extractor base's build-time contract describes, from the
 * `interpolation` options `parser()` takes. The placeholders are found by the
 * expressions the interpolator builds from the same options, so a consumer
 * spelling `${name}` or `{{name|number}}` is read the way the runtime reads
 * it: the unescape marker is stripped, the name is what stands before the
 * first format separator, and a dotted path stays as spelled.
 *
 * A parameter is reported once, in the order the message first names it,
 * saying what every placeholder naming it says together. The syntax has no
 * selectors, so every parameter is expected outright.
 */
export const extractParamsFactory: Parser.ExtractParamsFactory = (options) => {
  const { prefix, suffix, unescapePrefix, unescapeSuffix, formatSeparator } = options?.interpolation ?? {};
  const separator = formatSeparator || ',';
  const open = regexEscape(prefix || '{{');
  const close = regexEscape(suffix || '}}');
  // Where a suffix marks the unescaped placeholder, the prefix marker is off.
  const marker = unescapeSuffix ? ['', regexEscape(unescapeSuffix)] : [unescapePrefix ? regexEscape(unescapePrefix) : '-', ''];
  const escaped = new RegExp(`${open}(.+?)${close}`, 'g');
  const unescaped = new RegExp(`${open}${marker[0]}(.+?)${marker[1]}${close}`, 'g');

  return (message) => {
    // A catalogue leaf is arbitrary data; only text can name parameters.
    if (typeof message !== 'string') return [];

    // The interpolator resolves the unescaped placeholders first, so the
    // plain expression never sees them.
    const raw = scan(message, unescaped);
    const plain = scan(message, escaped).filter(({ start, end }) => !raw.some((span) => start < span.end && span.start < end));

    const order: string[] = [];
    const found = new Map<string, BaseParser.ParamSpec>();

    [...raw, ...plain].sort((a, b) => a.start - b.start).forEach(({ text }) => {
      const key = text.trim();
      const [head, ...rest] = key.split(separator);
      const name = rest.length > 0 ? head.trim() : key;
      // The first format of a chain is the one that receives the value.
      const format = rest.length > 0 ? rest[0].split('(')[0].toLowerCase().trim() : undefined;
      const kind = kindOf(format);
      const held = found.get(name);

      if (held === undefined) {
        order.push(name);
        found.set(name, { name, kind, optional: false });

        return;
      }

      found.set(name, { ...held, kind: mergeKinds(held.kind ?? 'unknown', kind) });
    });

    return order.map((name) => found.get(name)!);
  };
};
