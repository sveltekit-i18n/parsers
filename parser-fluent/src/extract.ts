import type { Parser as BaseParser } from '@sveltekit-i18n/base';
import { compile } from './compile';
import type { Pattern } from './compile';
import type { Parser } from './types';

type Expression = Extract<NonNullable<Pattern>, readonly unknown[]>[number] & object;
type Argument = Extract<Expression, { type: 'func' }>['args'][number];
type Variant = Extract<Expression, { type: 'select' }>['variants'][number];

// The keys Fluent matches against the plural category of a number but
// `other`, which is as common a key of a string selector as of a numeric one,
// and narrows neither: every number of a locale with one category is `other`.
const PLURAL = new Set(['zero', 'one', 'two', 'few', 'many']);

type Kinds = BaseParser.ParamKind | readonly BaseParser.ParamKind[];

/** Keeps every kind that narrows, and `'unknown'` only while nothing does. */
const mergeKinds = (current: Kinds, next: BaseParser.ParamKind): Kinds => {
  const held = Array.isArray(current) ? current : [current as BaseParser.ParamKind];
  const merged = next === 'unknown' ? held : [...held.filter((kind) => kind !== 'unknown'), next];
  const kinds = [...new Set(merged)];

  return kinds.length === 1 ? kinds[0]! : kinds;
};

type Branch = { param: string; branch: string };

/** Where an expression stands: the branches it is under, and whether any variant holds it. */
type Place = { when: readonly Branch[]; conditional: boolean };

const OUTRIGHT: Place = { when: [], conditional: false };

/**
 * Builds the extractor base's build-time contract describes, from the same
 * options `parser()` takes. Only `functions` changes what a message names: a
 * function of that bag named `NUMBER` replaces the builtin, whose keys are
 * then no values of its argument.
 *
 * A string selector is the one thing that narrows a parameter. A number or a
 * date is formatted from a `number`, a `Date`, or a `FluentNumber` or
 * `FluentDateTime` the app builds to set what a message cannot - a currency,
 * an ordinal plural, a time zone - and no kind base defines holds them all.
 *
 * A parameter is reported once, in the order the message first names it,
 * saying what every expression naming it says together. One that every
 * expression puts under a variant is reported optional, and carries the keys
 * of its first mention, one per selector reading a parameter.
 */
export const extractParamsFactory: Parser.ExtractParamsFactory = (options) => {
  const builtinNumber = !Object.prototype.hasOwnProperty.call(options?.functions ?? {}, 'NUMBER');

  return (message) => {
    // A catalogue leaf is arbitrary data; only text can name parameters, and
    // only text the parser compiles whole.
    if (typeof message !== 'string') return [];

    let pattern: Pattern;

    try {
      pattern = compile(message);
    } catch {
      return [];
    }

    const order: string[] = [];
    const found = new Map<string, BaseParser.ParamSpec>();

    const record = (name: string, kind: BaseParser.ParamKind, { when, conditional }: Place, values?: readonly string[]) => {
      const held = found.get(name);

      if (held === undefined) {
        order.push(name);
        found.set(name, {
          name,
          kind,
          ...(values ? { values } : {}),
          // Over-approximating optionality never demands a parameter the
          // caller's variant has no use for, which is what base asks for.
          optional: conditional,
          ...(when.length > 0 ? { when } : {}),
        });

        return;
      }

      const { when: heldWhen, ...rest } = held;
      const optional = conditional && held.optional === true;

      found.set(name, {
        ...rest,
        kind: mergeKinds(held.kind ?? 'unknown', kind),
        ...(values ? { values: [...new Set([...held.values ?? [], ...values])] } : {}),
        // Named outside every variant once, the parameter is expected outright.
        optional,
        ...(optional && heldWhen !== undefined ? { when: heldWhen } : {}),
      });
    };

    // The variables the arguments of a call read. A named argument is a
    // literal; a term's positional arguments are resolved, and read the
    // payload, even though a term only ever reads its named ones.
    const readArguments = (args: readonly Argument[], place: Place) => {
      args.forEach((arg) => {
        if (arg.type !== 'narg') readExpression(arg, place);
      });
    };

    function readExpression(expression: Expression, place: Place) {
      switch (expression.type) {
        case 'var':
          record(expression.name, 'unknown', place);
          break;
        case 'func':
        case 'term':
          readArguments(expression.args, place);
          break;
        case 'select':
          readSelect(expression, place);
          break;
        default:
          break;
      }
    }

    function readPattern(value: Pattern, place: Place) {
      if (typeof value !== 'string' && value !== null) {
        value.forEach((element) => {
          if (typeof element !== 'string') readExpression(element, place);
        });
      }
    }

    // The parameter a selector reads, as what its keys say of it: a number
    // literal or a plural category is matched against a number only, and
    // another key but `other` against a string, which only then narrows the
    // parameter. The default variant's key is no value: it matches whatever
    // the others do not.
    const readSelector = (selector: Expression, variants: readonly Variant[], star: number, place: Place): string | undefined => {
      const keys = variants.filter((_, index) => index !== star).map(({ key }) => key);
      const numeric = variants.some(({ key }) => key.type === 'num' || PLURAL.has(key.value));
      const numbers = keys.flatMap((key) => (key.type === 'num' ? [String(key.value)] : []));
      const strings = keys.flatMap((key) => (key.type === 'str' ? [key.value] : []));
      const values = numeric ? numbers : strings;
      const narrows = !numeric && strings.some((key) => key !== 'other');

      if (selector.type === 'var') {
        record(selector.name, narrows ? 'string' : 'unknown', place, values.length > 0 ? values : undefined);

        return selector.name;
      }

      if (selector.type === 'func') {
        const [first] = selector.args;

        readArguments(selector.args, place);

        // Only the builtin `NUMBER` compares its keys with the variable it
        // reads; what a custom function's keys mean is not known here, and a
        // date matches no key.
        if (!builtinNumber || selector.name !== 'NUMBER' || first?.type !== 'var') return undefined;

        if (numbers.length > 0) record(first.name, 'unknown', place, numbers);

        return first.name;
      }

      readExpression(selector, place);

      return undefined;
    };

    function readSelect({ selector, variants, star }: Extract<Expression, { type: 'select' }>, place: Place) {
      const param = readSelector(selector, variants, star, place);

      variants.forEach(({ key, value }, index) => {
        const branch = index === star ? '*' : String(key.value);

        readPattern(value, {
          when: param === undefined ? place.when : [...place.when, { param, branch }],
          conditional: true,
        });
      });
    }

    readPattern(pattern, OUTRIGHT);

    return order.map((name) => found.get(name)!);
  };
};
