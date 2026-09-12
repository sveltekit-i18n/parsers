import { parse, TYPE } from '@formatjs/icu-messageformat-parser';
import type { MessageFormatElement } from '@formatjs/icu-messageformat-parser';
import type { Parser as BaseParser } from '@sveltekit-i18n/base';
import type { Parser } from './types';

// The branch an option key names is a value of the parameter only for `select`
// and for a plural's exact matches. A plural's `one`/`few`/`other` are
// categories the locale decides, not values a caller can pass.
const EXACT_MATCH = /^=/;

/**
 * `'unknown'` is the top of base's lattice, so a placeholder that narrows
 * nothing reports it: ICU stringifies whatever a plain argument receives.
 * `'date'` already means `Date | number` in base, which is why `time` maps onto
 * it unchanged.
 */
const kindOf = (element: MessageFormatElement): BaseParser.ParamKind | undefined => {
  switch (element.type) {
    case TYPE.argument: return 'unknown';
    case TYPE.number: return 'number';
    case TYPE.date:
    case TYPE.time: return 'date';
    case TYPE.select: return 'string';
    case TYPE.plural: return 'number';
    // A tag is resolved by a callback the payload carries, which is the shape
    // base's `'function'` kind describes.
    case TYPE.tag: return 'function';
    default: return undefined;
  }
};

const valuesOf = (element: MessageFormatElement): readonly string[] | undefined => {
  if (element.type === TYPE.select) {
    // `other` is the fallback branch rather than a value the parameter takes.
    const named = Object.keys(element.options).filter((option) => option !== 'other');

    return named.length > 0 ? named : undefined;
  }

  if (element.type === TYPE.plural) {
    const exact = Object.keys(element.options).filter((option) => EXACT_MATCH.test(option));

    return exact.length > 0 ? exact.map((option) => option.slice(1)) : undefined;
  }

  return undefined;
};

type Kinds = BaseParser.ParamKind | readonly BaseParser.ParamKind[];

/** Keeps every kind that narrows, and `'unknown'` only while nothing does. */
const mergeKinds = (current: Kinds, next: BaseParser.ParamKind): Kinds => {
  const held = Array.isArray(current) ? current : [current as BaseParser.ParamKind];
  const merged = next === 'unknown' ? held : [...held.filter((kind) => kind !== 'unknown'), next];
  const kinds = [...new Set(merged)];

  return kinds.length === 1 ? kinds[0]! : kinds;
};

type Branch = { param: string; branch: string };

/**
 * Builds the extractor base's build-time contract describes, from the same
 * options `parser()` takes. They reach the same parse the runtime reaches, so
 * an option that changes what a message MEANS - `ignoreTag` makes `<b>x</b>`
 * literal text rather than a callback the payload carries - changes what it
 * names here too.
 *
 * A parameter is reported once, in the order the message first names it,
 * saying what every placeholder naming it says together. One that every
 * placeholder puts under a selector branch is reported optional and carries
 * the branches of its first mention, outermost first - only some branches of
 * the message use it.
 */
export const extractParamsFactory: Parser.ExtractParamsFactory = (options) => (message) => {
  // A catalogue leaf is arbitrary data; only text can name parameters. The
  // ICU parser throws on anything else, and on text it cannot parse.
  if (typeof message !== 'string') return [];

  let elements: MessageFormatElement[];

  try {
    elements = parse(message, options);
  } catch {
    return [];
  }

  const order: string[] = [];
  const found = new Map<string, BaseParser.ParamSpec>();

  const record = (element: MessageFormatElement, when: readonly Branch[]) => {
    const kind = kindOf(element);

    if (kind === undefined || !('value' in element) || typeof element.value !== 'string') return;

    const name = element.value;
    const values = valuesOf(element);
    const held = found.get(name);

    if (held === undefined) {
      order.push(name);
      found.set(name, {
        name,
        kind,
        ...(values ? { values } : {}),
        // Over-approximating optionality never demands a parameter the
        // caller's branch has no use for, which is what base asks for.
        optional: when.length > 0,
        ...(when.length > 0 ? { when } : {}),
      });

      return;
    }

    const { when: heldWhen, ...rest } = held;
    const conditional = when.length > 0 && heldWhen !== undefined;

    found.set(name, {
      ...rest,
      kind: mergeKinds(held.kind ?? 'unknown', kind),
      ...(values ? { values: [...new Set([...held.values ?? [], ...values])] } : {}),
      // Named outside every branch once, the parameter is expected outright.
      optional: conditional,
      ...(conditional ? { when: heldWhen } : {}),
    });
  };

  const walk = (nodes: readonly MessageFormatElement[], when: readonly Branch[]) => {
    nodes.forEach((node) => {
      record(node, when);

      if (node.type === TYPE.tag) {
        // A tag selects nothing, so its children are not under a branch.
        walk(node.children, when);

        return;
      }

      if (node.type === TYPE.select || node.type === TYPE.plural) {
        Object.entries(node.options).forEach(([branch, option]) => {
          walk(option.value, [...when, { param: node.value, branch }]);
        });
      }
    });
  };

  walk(elements, []);

  return order.map((name) => found.get(name)!);
};
