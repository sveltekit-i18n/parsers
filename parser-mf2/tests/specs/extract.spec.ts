import { describe, expect, it } from 'vitest';
import parser, { extractParamsFactory } from '../../src';
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
    expect(extractParams(message(initLocale, 'common.number'))).toEqual([{ name: 'value', kind: 'number', optional: false }]);
    expect(extractParams(message(initLocale, 'common.integer'))).toEqual([{ name: 'value', kind: 'number', optional: false }]);
    expect(extractParams(message(initLocale, 'common.date'))).toEqual([{ name: 'value', kind: 'date', optional: false }]);
    expect(extractParams(message(initLocale, 'common.currency'))).toEqual([{ name: 'value', kind: 'number', optional: false }]);
  });

  it('reads the kind off the function the expression names', () => {
    expect(extractParams('{$value :offset add=1}')).toEqual([{ name: 'value', kind: 'number', optional: false }]);
    expect(extractParams('{$value :percent}')).toEqual([{ name: 'value', kind: 'number', optional: false }]);
    expect(extractParams('{$value :unit unit=kilogram}')).toEqual([{ name: 'value', kind: 'number', optional: false }]);
    expect(extractParams('{$value :string}')).toEqual([{ name: 'value', kind: 'string', optional: false }]);
    expect(extractParams('{$value :datetime}')).toEqual([{ name: 'value', kind: 'date', optional: false }]);
    expect(extractParams('{$value :time}')).toEqual([{ name: 'value', kind: 'date', optional: false }]);
    // A function the specification does not define narrows nothing.
    expect(extractParams(message(initLocale, 'common.unknown_function'))).toEqual([{ name: 'value', kind: 'unknown', optional: false }]);
  });

  it('reads an option variable as a parameter that narrows nothing', () => {
    expect(extractParams('{$value :number minimumFractionDigits=$digits}')).toEqual([
      { name: 'value', kind: 'number', optional: false },
      { name: 'digits', kind: 'unknown', optional: false },
    ]);
    expect(extractParams('{$amount :currency currency=$code}')).toEqual([
      { name: 'amount', kind: 'number', optional: false },
      { name: 'code', kind: 'unknown', optional: false },
    ]);
  });

  it('names nothing for a literal, a function alone, or markup', () => {
    expect(extractParams('{|literal|} and {42 :number}')).toEqual([]);
    expect(extractParams('{:now}')).toEqual([]);
    expect(extractParams('Click {#b}here{/b} {#img src=|x.png| /}')).toEqual([]);
  });

  it('reads the variables a markup option names', () => {
    expect(extractParams('Click {#b class=$cls}here{/b} {#img src=|x.png| alt=$alt /}')).toEqual([
      { name: 'cls', kind: 'unknown', optional: false },
      { name: 'alt', kind: 'unknown', optional: false },
    ]);
  });

  it('reads a declared input as a parameter, annotated by its declaration', () => {
    expect(extractParams('.input {$count :number}\n{{{$count}}}')).toEqual([{ name: 'count', kind: 'number', optional: false }]);
    expect(extractParams('.input {$count}\n{{{$count}}}')).toEqual([{ name: 'count', kind: 'unknown', optional: false }]);
    expect(extractParams('.input {$value :number minimumFractionDigits=$digits}\n{{{$value}}}')).toEqual([
      { name: 'value', kind: 'number', optional: false },
      { name: 'digits', kind: 'unknown', optional: false },
    ]);
  });

  it('reads through a local variable to the payload it names, and never reports the local', () => {
    expect(extractParams(message(initLocale, 'common.local'))).toEqual([{ name: 'value', kind: 'number', optional: false }]);
    expect(extractParams('.local $x = {$n :number minimumFractionDigits=$d}\n{{{$x}}}')).toEqual([
      { name: 'n', kind: 'number', optional: false },
      { name: 'd', kind: 'unknown', optional: false },
    ]);
    expect(extractParams('.local $a = {$n}\n.local $b = {$a :integer}\n{{{$b}}}')).toEqual([{ name: 'n', kind: 'number', optional: false }]);
    expect(extractParams('.local $x = {|hello|}\n{{{$x}}}')).toEqual([]);
  });

  it('reads through a chain of locals of any length', () => {
    const depth = 20000;
    const locals = Array.from({ length: depth }, (_, i) => `.local $a${i + 1} = {$a${i}}`);

    expect(extractParams(`.input {$a0 :number}\n${locals.join('\n')}\n{{{$a${depth}}}}`)).toEqual([{ name: 'a0', kind: 'number', optional: false }]);
  });

  it('names the values a selector lists, and only where they are values', () => {
    // A numeric selector's exact keys are values; `one`/`other` are categories
    // the locale decides for a number the caller does not choose, and `|1e3|`
    // is spelled as no `String(value)` is, so the engine never matches it.
    expect(extractParams(message(initLocale, 'common.plural'))).toEqual([
      { name: 'count', kind: 'number', values: ['0'], optional: false },
    ]);
    expect(extractParams(message(initLocale, 'common.select'))).toEqual([
      { name: 'gender', kind: 'string', values: ['male', 'female'], optional: false },
    ]);
    expect(extractParams('.input {$n :integer select=ordinal}\n.match $n\n1 {{first}}\n-1 {{last}}\n1.5 {{half}}\n|1e3| {{thousandth}}\none {{{$n}st}}\n* {{{$n}th}}')).toEqual([
      { name: 'n', kind: 'number', values: ['1', '-1', '1.5'], optional: false },
    ]);
    // What a custom function selects on is its own business.
    expect(extractParams('.input {$v :custom}\n.match $v\nx {{X}}\n* {{Y}}')).toEqual([{ name: 'v', kind: 'unknown', optional: false }]);
  });

  it('reads a selector through a local to the payload it names', () => {
    expect(extractParams('.local $c = {$count :integer}\n.match $c\n1 {{one}}\n* {{{$count}}}')).toEqual([
      { name: 'count', kind: 'number', values: ['1'], optional: false },
    ]);
    expect(extractParams('.input {$count :number}\n.local $c = {$count}\n.match $c\n1 {{one}}\n* {{{$name}}}')).toEqual([
      { name: 'count', kind: 'number', values: ['1'], optional: false },
      { name: 'name', kind: 'unknown', optional: true, when: [{ param: 'count', branch: '*' }] },
    ]);
  });

  it('reports a parameter only some variants use as optional, under the keys it sits in', () => {
    expect(extractParams('.input {$count :number}\n.match $count\none {{{$name} has one}}\n* {{{$name} has {$count}}}')).toEqual([
      { name: 'count', kind: 'number', optional: false },
      { name: 'name', kind: 'unknown', optional: true, when: [{ param: 'count', branch: 'one' }] },
    ]);
    expect(extractParams('.input {$count :number}\n.input {$gender :string}\n.match $count $gender\n0 * {{Nobody}}\none female {{She}}\n* * {{They ({$count}) {$name}}}')).toEqual([
      { name: 'count', kind: 'number', values: ['0'], optional: false },
      { name: 'gender', kind: 'string', values: ['female'], optional: false },
      { name: 'name', kind: 'unknown', optional: true, when: [{ param: 'count', branch: '*' }, { param: 'gender', branch: '*' }] },
    ]);
  });

  it('reports a parameter once, saying what every mention of it says together', () => {
    expect(extractParams('{$v} and {$v :number}')).toEqual([{ name: 'v', kind: 'number', optional: false }]);
    expect(extractParams('{$v :datetime} and {$v :number}')).toEqual([{ name: 'v', kind: ['date', 'number'], optional: false }]);
    expect(extractParams('.input {$v :number}\n{{{$v :string}}}')).toEqual([{ name: 'v', kind: ['number', 'string'], optional: false }]);
    // Named outside every variant once, it is expected outright.
    expect(extractParams('.input {$count :number}\n.match $count\none {{{$name}}}\n* {{{$name} {$count}}}')).toEqual([
      { name: 'count', kind: 'number', optional: false },
      { name: 'name', kind: 'unknown', optional: true, when: [{ param: 'count', branch: 'one' }] },
    ]);
    expect(extractParams('.input {$name :string}\n.input {$count :number}\n.match $count\none {{{$name}}}\n* {{{$count}}}')).toEqual([
      { name: 'name', kind: 'string', optional: false },
      { name: 'count', kind: 'number', optional: false },
    ]);
  });

  it('names nothing for a catalogue leaf that is no message', () => {
    expect(extractParams(message(initLocale, 'common.malformed'))).toEqual([]);
    expect(extractParams(message(initLocale, 'common.unannotated'))).toEqual([]);
    expect(extractParams(message(initLocale, 'common.undefined'))).toEqual([]);
    expect(extractParams(42)).toEqual([]);
    expect(extractParams({ nested: 'object' })).toEqual([]);
  });

  it('is built from the options the parser beside it is built from', () => {
    const options = { bidiIsolation: 'none' } as const;
    const greeting = message(initLocale, 'common.greeting');

    expect(parser({ ...options, onReport: null }).parse(greeting, [{ name: 'Alice' }], initLocale, 'common.greeting')).toBe('Hi Alice!');
    expect(extractParamsFactory(options)(greeting)).toEqual(extractParams(greeting));
  });

  it('takes the diagnostic context the contract declares, and reads the message without it', () => {
    const greeting = message(initLocale, 'common.greeting');

    expect(extractParams(greeting, { key: 'common.greeting', locale: initLocale })).toEqual(extractParams(greeting));
  });
});
