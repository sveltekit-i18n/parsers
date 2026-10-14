import { describe, expect, it } from 'vitest';
import { FluentResource } from '@fluent/bundle';
import { extractParamsFactory } from '../../src';
import { TRANSLATIONS } from '../data';

const initLocale = 'en';

const message = (locale: string, key: string) => {
  const [namespace, ...path] = key.split('.');

  return TRANSLATIONS[locale]?.[namespace]?.[path.join('.')];
};

const extractParams = extractParamsFactory();

// The build-time half of the base parser contract, reached through the same
// entry point as the parser and built from the same options.
describe('extractParamsFactory', () => {
  it('names what a message expects of its payload', () => {
    expect(extractParams(message(initLocale, 'common.greeting'))).toEqual([{ name: 'name', kind: 'unknown', optional: false }]);
    expect(extractParams(message(initLocale, 'common.fraction'))).toEqual([{ name: 'value', kind: 'unknown', optional: false }]);
  });

  it('narrows no argument of a call, since a number or a date may be a Fluent value the app builds', () => {
    expect(extractParams('{ NUMBER($a, $b) } { DATETIME($c) } { UPPER($d) }')).toEqual([
      { name: 'a', kind: 'unknown', optional: false },
      { name: 'b', kind: 'unknown', optional: false },
      { name: 'c', kind: 'unknown', optional: false },
      { name: 'd', kind: 'unknown', optional: false },
    ]);
  });

  it('reads a variable a call nests in its arguments', () => {
    expect(extractParams('{ UPPER(NUMBER($n)) }')).toEqual([{ name: 'n', kind: 'unknown', optional: false }]);
  });

  it('reads the positional arguments of a term, which Fluent resolves against the payload', () => {
    expect(extractParams('{ -brand($x, case: "genitive") }')).toEqual([{ name: 'x', kind: 'unknown', optional: false }]);
  });

  it('names nothing for literals, a term, or a message reference', () => {
    expect(extractParams('{ "literal" } { 42 } { -brand } { -brand.gender } { other } { other.title }')).toEqual([]);
  });

  it('reports a parameter once, saying what every expression naming it says together', () => {
    expect(extractParams('{ $g } { $g ->\n  [a] x\n *[other] y\n} { $g }')).toEqual([{ name: 'g', kind: 'string', values: ['a'], optional: false }]);
    expect(extractParams('{ $g ->\n  [a] x\n *[other] y\n} { $g ->\n  [b] x\n *[other] y\n}')).toEqual([{ name: 'g', kind: 'string', values: ['a', 'b'], optional: false }]);
    expect(extractParams('{ $g ->\n  [a] x\n *[other] y\n} { $g ->\n  [a] x\n *[other] y\n}')).toEqual([{ name: 'g', kind: 'string', values: ['a'], optional: false }]);
  });

  it('reads a selector with a number key or a plural category as numeric, with the number keys as values', () => {
    expect(extractParams(message(initLocale, 'common.plural'))).toEqual([{ name: 'count', kind: 'unknown', values: ['0'], optional: false }]);
    expect(extractParams('{ $n ->\n  [few] a\n *[other] b\n}')).toEqual([{ name: 'n', kind: 'unknown', optional: false }]);
    // A number is a value as `String()` spells it, which is how it is compared.
    expect(extractParams('{ $n ->\n  [1.50] a\n  [-2] b\n *[other] c\n}')).toEqual([{ name: 'n', kind: 'unknown', values: ['1.5', '-2'], optional: false }]);
  });

  it('reads a selector with string keys alone as a string, with every key but the default\'s as values', () => {
    expect(extractParams(message(initLocale, 'common.select'))).toEqual([{ name: 'gender', kind: 'string', values: ['male', 'female'], optional: false }]);
    expect(extractParams('{ $g ->\n  [other] a\n  [x] b\n *[y] c\n}')).toEqual([{ name: 'g', kind: 'string', values: ['other', 'x'], optional: false }]);
  });

  it('narrows nothing by a selector whose keys are only the default and `other`, which every number of a locale with one plural category takes', () => {
    expect(extractParams('{ $count ->\n *[other] { NUMBER($count) } items\n}')).toEqual([{ name: 'count', kind: 'unknown', optional: false }]);
    expect(extractParams('{ $g ->\n *[x] a\n}')).toEqual([{ name: 'g', kind: 'unknown', optional: false }]);
    expect(extractParams('{ $g ->\n  [other] a\n *[x] b\n}')).toEqual([{ name: 'g', kind: 'unknown', values: ['other'], optional: false }]);
  });

  it('reads the number keys of a `NUMBER` selector as values of its argument, unless `functions` replaces it', () => {
    const source = '{ NUMBER($n, minimumFractionDigits: 1) ->\n  [1] { $x }\n  [one] b\n *[other] c\n}';

    expect(extractParams(source)).toEqual([
      { name: 'n', kind: 'unknown', values: ['1'], optional: false },
      { name: 'x', kind: 'unknown', optional: true, when: [{ param: 'n', branch: '1' }] },
    ]);
    expect(extractParamsFactory({ functions: { NUMBER: () => '' } })(source)).toEqual([
      { name: 'n', kind: 'unknown', optional: false },
      { name: 'x', kind: 'unknown', optional: true },
    ]);
  });

  it('reads no values off a `DATETIME` or custom function selector', () => {
    expect(extractParams('{ DATETIME($d) ->\n  [x] a\n *[other] b\n}')).toEqual([{ name: 'd', kind: 'unknown', optional: false }]);
    expect(extractParams('{ PLATFORM($p) ->\n  [windows] a\n *[other] b\n}')).toEqual([{ name: 'p', kind: 'unknown', optional: false }]);
  });

  it('reports a parameter every variant names as optional, with the branch of its first mention', () => {
    expect(extractParams('{ $count ->\n  [one] { $name } has one photo.\n *[other] { $name } has { $count } photos.\n}')).toEqual([
      { name: 'count', kind: 'unknown', optional: false },
      { name: 'name', kind: 'unknown', optional: true, when: [{ param: 'count', branch: 'one' }] },
    ]);
  });

  it('names the default variant\'s branch `*`, and a number key as `String()` spells it', () => {
    expect(extractParams('{ $n ->\n  [1.50] a\n *[other] { $x }\n}')).toEqual([
      { name: 'n', kind: 'unknown', values: ['1.5'], optional: false },
      { name: 'x', kind: 'unknown', optional: true, when: [{ param: 'n', branch: '*' }] },
    ]);
    expect(extractParams('{ $n ->\n *[1.50] { $x }\n  [2] b\n}')).toEqual([
      { name: 'n', kind: 'unknown', values: ['2'], optional: false },
      { name: 'x', kind: 'unknown', optional: true, when: [{ param: 'n', branch: '*' }] },
    ]);
    expect(extractParams('{ NUMBER($n) ->\n  [1.50] { $x }\n *[other] b\n}')).toEqual([
      { name: 'n', kind: 'unknown', values: ['1.5'], optional: false },
      { name: 'x', kind: 'unknown', optional: true, when: [{ param: 'n', branch: '1.5' }] },
    ]);
    expect(extractParams(`{ $n ->\n  [1.${'0'.repeat(101)}] { $x }\n *[other] b\n}`)).toEqual([
      { name: 'n', kind: 'unknown', values: ['1'], optional: false },
      { name: 'x', kind: 'unknown', optional: true, when: [{ param: 'n', branch: '1' }] },
    ]);
  });

  it('reports a parameter named outside every variant once as expected outright', () => {
    expect(extractParams('{ $g ->\n  [a] { $x }\n *[b] c\n} { $x }')).toEqual([
      { name: 'g', kind: 'string', values: ['a'], optional: false },
      { name: 'x', kind: 'unknown', optional: false },
    ]);
  });

  it('carries the branches of nested selectors', () => {
    expect(extractParams('{ $a ->\n  [x] { $b ->\n    [y] { $c }\n   *[z] d\n  }\n *[w] e\n}')).toEqual([
      { name: 'a', kind: 'string', values: ['x'], optional: false },
      { name: 'b', kind: 'string', values: ['y'], optional: true, when: [{ param: 'a', branch: 'x' }] },
      { name: 'c', kind: 'unknown', optional: true, when: [{ param: 'a', branch: 'x' }, { param: 'b', branch: 'y' }] },
    ]);
  });

  it('reports a parameter under a selector that reads none as optional, with no branch of it', () => {
    expect(extractParams(message(initLocale, 'common.gendered'))).toEqual([]);
    expect(extractParams('{ -brand.gender ->\n  [feminine] { $x }\n *[other] y\n}')).toEqual([{ name: 'x', kind: 'unknown', optional: true }]);
    expect(extractParams('{ UPPER($p) ->\n  [a] { $x }\n *[other] y\n}')).toEqual([
      { name: 'p', kind: 'unknown', optional: false },
      { name: 'x', kind: 'unknown', optional: true },
    ]);
  });

  it('names nothing for a message it cannot compile whole, nor for a leaf that is no text', () => {
    expect(extractParams(message(initLocale, 'common.malformed'))).toEqual([]);
    expect(extractParams(message(initLocale, 'common.attribute'))).toEqual([]);
    expect(extractParams('{ '.repeat(20000))).toEqual([]);
    expect(extractParams(`{ $a }${' '.repeat(1001)}`)).toEqual([]);
    expect(extractParams(42)).toEqual([]);
    expect(extractParams(undefined)).toEqual([]);
  });

  it('names nothing for plain text', () => {
    expect(extractParams('Hello!')).toEqual([]);
    expect(extractParams('')).toEqual([]);
  });
});

// The extractor walks the runtime's own syntax tree, which `@fluent/bundle`
// calls a black box: these pin the shapes it reads, so an upgrade that changes
// them fails here rather than extracting nothing.
describe('the syntax tree of @fluent/bundle', () => {
  const valueOf = (source: string) => new FluentResource(`m = ${source}\n`).body[0]?.value;

  it('spells a variable, a call and its arguments, and a term', () => {
    expect(valueOf('{ $a } { NUMBER($b, style: "percent") } { -t($c, case: "x") } { m2 } { "s" } { 1.50 }')).toEqual([
      { type: 'var', name: 'a' },
      ' ',
      { type: 'func', name: 'NUMBER', args: [{ type: 'var', name: 'b' }, { type: 'narg', name: 'style', value: { type: 'str', value: 'percent' } }] },
      ' ',
      { type: 'term', name: 't', attr: null, args: [{ type: 'var', name: 'c' }, { type: 'narg', name: 'case', value: { type: 'str', value: 'x' } }] },
      ' ',
      { type: 'mesg', name: 'm2', attr: null },
      ' ',
      { type: 'str', value: 's' },
      ' ',
      { type: 'num', value: 1.5, precision: 2 },
    ]);
  });

  it('spells a select expression, its variant keys and its default', () => {
    expect(valueOf('{ $n ->\n  [one] a\n *[other] b\n  [2] c\n}')).toEqual([
      {
        type: 'select',
        selector: { type: 'var', name: 'n' },
        variants: [
          { key: { type: 'str', value: 'one' }, value: 'a' },
          { key: { type: 'str', value: 'other' }, value: 'b' },
          { key: { type: 'num', value: 2, precision: 0 }, value: 'c' },
        ],
        star: 1,
      },
    ]);
  });

  it('spells plain text as a string', () => {
    expect(valueOf('Hello')).toBe('Hello');
  });
});
