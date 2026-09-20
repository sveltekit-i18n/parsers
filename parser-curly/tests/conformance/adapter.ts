import type { Adapter, ModifierInput } from '@curly-message/conformance';
import parser, { cst, Modifier, Parser, Report } from '../../src';

/**
 * The adapter of SPEC.md section 14.3, driving this package's public API:
 * `parser(options)` and the `parse(value, [payload, props], locale, id)`
 * that the base library calls, with `cst` beside them for the tree cases of
 * CST.md. The levels and the limits are the two statements the specification
 * asks an implementation to make about itself; both are
 * `@curly-message/parser`'s, which resolves every message here, and the
 * README repeats them.
 */
export const adapter: Adapter = {
  levels: ['core', 'intl', 'extensions'],
  limits: { output: 100000, read: 100000, conversion: 100000, nesting: 8 },
  // The spans the tree carries are UTF-16 code units, which is what section 4
  // of CST.md asks an implementation to name.
  cst: { unit: 'utf-16', parse: cst },
  resolve: ({ message, payload, props, locale, id, modifiers, defaults }) => {
    const reports: Report[] = [];

    // A behaviour of the set's catalogue is a function of section 11's inputs;
    // the modifier signature carries the same inputs under its own names, with
    // the default behind an accessor that walks the chain on the read, which
    // is what the behaviour's `default` call is for.
    const wrap = (behaviour: (input: ModifierInput) => unknown): Modifier.T => (config) => behaviour({
      value: config.value,
      options: config.options,
      props: config.props,
      locale: config.locale,
      default: () => config.defaultValue,
    });

    const { parse } = parser({
      customModifiers: modifiers && Object.fromEntries(Object.entries(modifiers).map(([name, behaviour]) => [name, wrap(behaviour)])),
      modifierDefaults: defaults as Modifier.Props | undefined,
      onReport: (report) => { reports.push(report); },
    });

    // The base contract spells the locale and the id as strings because the
    // base library always passes strings; the set drives the format's whole
    // input space through the same slots, so both are handed on as they came.
    return {
      output: parse(message, [payload as Parser.Payload | undefined, props as Modifier.Props | undefined], locale as string, id as string),
      reports,
    };
  },
};
