import { describe, expect, it } from 'vitest';
import { createInstance } from 'i18next';
import type { InterpolationOptions } from 'i18next';
import parser from '../../src';

type Fixture = {
  locale: string;
  key: string;
  message: string;
  payload: Record<string, unknown>;
  options?: { formatParams?: Record<string, Record<string, unknown>> };
};

// Local time both ways, so the expectation does not depend on the zone the
// suite runs in.
const date = new Date(2024, 2, 5);

// Messages i18next renders through `t()` and this parser renders through
// `parse()`. None nests another key and none carries `count` or `context`:
// what a suffix or a `$t()` resolves to is key resolution, which base does
// before any parser runs. None names an option of the `t()` call either
// (`lng`, `ns`): i18next resolves those from its options bag, this parser
// from the payload alone.
const FIXTURES: readonly Fixture[] = [
  { locale: 'en', key: 'greeting', message: 'Hi {{name}}!', payload: { name: 'Alice' } },
  { locale: 'en', key: 'missing', message: 'Hi {{name}}!', payload: {} },
  { locale: 'en', key: 'unescaped', message: '{{- html}}', payload: { html: '<b>&</b>' } },
  { locale: 'en', key: 'dotted', message: 'Hello {{user.name}}!', payload: { user: { name: 'Bob' } } },
  { locale: 'en', key: 'deep', message: '{{a.b.c}}', payload: { a: { b: { c: 'deep' } } } },
  { locale: 'en', key: 'number', message: '{{n, number}}', payload: { n: 1234.5 } },
  { locale: 'en', key: 'percent', message: '{{n, number(style: percent)}}', payload: { n: 0.5 } },
  { locale: 'en', key: 'currency', message: '{{n, currency(USD)}}', payload: { n: 1234.5 } },
  { locale: 'en', key: 'chained', message: '{{v, number, currency(USD)}}', payload: { v: 5 } },
  { locale: 'en', key: 'date', message: '{{d, datetime(dateStyle: long)}}', payload: { d: date } },
  { locale: 'en', key: 'short', message: '{{d, datetime(dateStyle: long)}}', payload: { d: date }, options: { formatParams: { d: { dateStyle: 'short' } } } },
  { locale: 'en', key: 'ago', message: '{{d, relativetime}}', payload: { d: -3 } },
  { locale: 'en', key: 'list', message: '{{l, list}}', payload: { l: ['a', 'b', 'c'] } },
  { locale: 'en', key: 'unknown', message: '{{n, bogus}}', payload: { n: 5 } },
  { locale: 'en', key: 'coerced', message: '{{a}}|{{b}}|{{c}}|{{d}}|{{e}}', payload: { a: null, b: true, c: 0, d: ['x', 'y'], e: { f: 1 } } },
  { locale: 'en', key: 'braces', message: '{{a}} {{b}}', payload: { a: '{{b}}', b: 'B' } },
  { locale: 'cs', key: 'greeting', message: 'Ahoj {{name}}!', payload: { name: 'Alice' } },
  { locale: 'cs', key: 'price', message: '{{n, currency(CZK)}}', payload: { n: 1234.5 } },
  { locale: 'cs', key: 'date', message: '{{d, datetime(dateStyle: long)}}', payload: { d: date } },
  { locale: 'cs', key: 'ago', message: '{{d, relativetime}}', payload: { d: -3 } },
  { locale: 'cs', key: 'list', message: '{{l, list}}', payload: { l: ['a', 'b', 'c'] } },
  { locale: 'de', key: 'greeting', message: 'Hallo {{name}}!', payload: { name: 'Alice' } },
  { locale: 'de', key: 'price', message: '{{n, currency(currency: EUR; minimumFractionDigits: 0)}}', payload: { n: 1234.5 } },
  { locale: 'de', key: 'date', message: '{{d, datetime}}', payload: { d: date } },
  { locale: 'de', key: 'hours', message: '{{d, relativetime(range: hour)}}', payload: { d: 3 } },
  { locale: 'de', key: 'list', message: '{{l, list}}', payload: { l: ['a', 'b', 'c'] } },
];

const interpolation: InterpolationOptions = { escapeValue: false };

// A plain i18next application instance holding the fixtures as resources,
// the way an app that renders them with `t()` would.
const reference = createInstance({
  initAsync: false,
  lng: 'en',
  interpolation,
  resources: Object.fromEntries(
    [...new Set(FIXTURES.map(({ locale }) => locale))].map((locale) => [locale, {
      translation: Object.fromEntries(FIXTURES.filter((fixture) => fixture.locale === locale).map(({ key, message }) => [key, message])),
    }]),
  ),
});

void reference.init();

const { parse } = parser({ onReport: null, interpolation });

// The fidelity proof this package exists for: a message renders through
// `parse()` as it renders through i18next's own `t()`.
describe('differential', () => {
  FIXTURES.forEach(({ locale, key, message, payload, options }) => {
    it(`renders '${message}' for ${locale} as i18next does`, () => {
      const expected = reference.t(key, { ...payload, lng: locale, ...options });

      expect(typeof expected).toBe('string');
      expect(parse(message, [payload, options], locale, key)).toBe(expected);
    });
  });
});
