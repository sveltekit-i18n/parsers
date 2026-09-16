import { parseMessage, validate } from 'messageformat';
import type { Model } from 'messageformat';
import type { Parser as BaseParser } from '@sveltekit-i18n/base';
import type { Parser } from './types';

/**
 * The functions the specification defines, by what they read their operand
 * as. `'date'` already means `Date | number` in base, which is why `time`
 * maps onto it unchanged. `'unknown'` is the top of base's lattice, so an
 * expression with no function, or with one the specification does not
 * define, narrows nothing.
 */
const kindOf = (name: string | undefined): BaseParser.ParamKind => {
  switch (name) {
    case 'number':
    case 'integer':
    case 'offset':
    case 'currency':
    case 'percent':
    case 'unit': return 'number';
    case 'string': return 'string';
    case 'date':
    case 'datetime':
    case 'time': return 'date';
    default: return 'unknown';
  }
};

// A variant key of a numeric selector is a value of the parameter only when it
// is a number spelled the way the engine compares one, `String(value)`: `1e3`
// matches nothing, and `one`/`few`/`other` are categories the locale decides.
const NUMBER_LITERAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?$/;

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
 * What a variable stands for: the payload key it reads, if it reads one, and
 * the nearest function annotating it on the way.
 */
type Source = { param?: string; fn?: string };

/**
 * Builds the extractor base's build-time contract describes, from the same
 * options `parser()` takes. None of them changes what a message names - the
 * syntax is the specification's, and a custom function narrows nothing - so
 * they are taken for symmetry and read for nothing.
 *
 * A parameter is reported once, in the order the message first names it,
 * saying what every expression naming it says together. A declaration or a
 * selector names it outright; a local variable is the message's own and is
 * never reported, but the payload variable its expression reads is. One that
 * every expression puts under a variant is reported optional and carries the
 * keys of its first mention, one per selector - only some variants of the
 * message use it.
 */
export const extractParamsFactory: Parser.ExtractParamsFactory = () => (message) => {
  // A catalogue leaf is arbitrary data; only text can name parameters. The
  // parser throws on anything else, and on text it cannot parse, and the
  // validation rejects a message the formatter would.
  if (typeof message !== 'string') return [];

  let model: Model.Message;

  try {
    model = parseMessage(message);
    validate(model);
  } catch {
    return [];
  }

  // A declaration may only reference variables declared before it, so one
  // pass in declaration order settles every local: at a payload key, or at a
  // literal reading none.
  const sources = new Map<string, Source>();
  const resolve = (name: string): Source => sources.get(name) ?? { param: name };

  model.declarations.forEach(({ type, name, value: { arg, functionRef } }) => {
    const inner: Source = type === 'input' ? { param: name } : arg?.type === 'variable' ? resolve(arg.name) : {};

    sources.set(name, { param: inner.param, fn: functionRef?.name ?? inner.fn });
  });

  const order: string[] = [];
  const found = new Map<string, BaseParser.ParamSpec>();

  const record = (name: string, kind: BaseParser.ParamKind, when: readonly Branch[], values?: readonly string[]) => {
    const held = found.get(name);

    if (held === undefined) {
      order.push(name);
      found.set(name, {
        name,
        kind,
        ...(values ? { values } : {}),
        // Over-approximating optionality never demands a parameter the
        // caller's variant has no use for, which is what base asks for.
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
      // Named outside every variant once, the parameter is expected outright.
      optional: conditional,
      ...(conditional ? { when: heldWhen } : {}),
    });
  };

  // What a function reads an option as is the function's own business, so an
  // option variable narrows nothing.
  const readOptions = (options: Model.Options | undefined, when: readonly Branch[]) => {
    Object.values(options ?? {}).forEach((option) => {
      if (option.type !== 'variable') return;

      const { param } = resolve(option.name);

      if (param !== undefined) record(param, 'unknown', when);
    });
  };

  const readExpression = ({ arg, functionRef }: Model.Expression, when: readonly Branch[]) => {
    if (arg?.type === 'variable') {
      const { param } = resolve(arg.name);

      if (param !== undefined) record(param, kindOf(functionRef?.name), when);
    }

    readOptions(functionRef?.options, when);
  };

  const readPattern = (pattern: Model.Pattern, when: readonly Branch[]) => {
    pattern.forEach((part) => {
      if (typeof part === 'string') return;

      if (part.type === 'markup') {
        // Markup is never a parameter: it formats to nothing here. Its
        // options may still read the payload.
        readOptions(part.options, when);

        return;
      }

      readExpression(part, when);
    });
  };

  model.declarations.forEach(({ value }) => readExpression(value, []));

  if (model.type === 'message') {
    readPattern(model.pattern, []);

    return order.map((name) => found.get(name)!);
  }

  const params = model.selectors.map(({ name }, position) => {
    const { param, fn } = resolve(name);
    const kind = kindOf(fn);
    const literals = model.variants.flatMap(({ keys }) => {
      const key = keys[position];

      return key?.type === 'literal' ? [key.value] : [];
    });
    // A `:string` selector's keys are values of the parameter; a numeric one's
    // are values only where they are numbers. Any other selection is a
    // custom function's, and what its keys mean is not known here.
    const values = kind === 'string' ? literals : kind === 'number' ? literals.filter((key) => NUMBER_LITERAL.test(key)) : [];

    if (param !== undefined) record(param, kind, [], values.length > 0 ? values : undefined);

    return param ?? name;
  });

  model.variants.forEach(({ keys, value }) => {
    readPattern(value, keys.map((key, position) => ({ param: params[position], branch: key.type === '*' ? '*' : key.value })));
  });

  return order.map((name) => found.get(name)!);
};
