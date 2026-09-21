[![npm version](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-i18next.svg)](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-i18next) [![Tests](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-i18next.yml/badge.svg)](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-i18next.yml)

# @sveltekit-i18n/parser-i18next

The [i18next](https://www.i18next.com) interpolation and formatting syntax for [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base): `{{name}}` placeholders, `{{- html}}` for a value that must not be escaped, dotted paths, and the built-in `number`, `currency`, `datetime`, `relativetime` and `list` formats with their argument syntax. It is for translation files that already exist in that syntax, and it is an adapter over `i18next` itself rather than a reimplementation: every message is interpolated by i18next's own engine, so it renders here as it rendered there. That fidelity costs a dependency of about 44 kB minified — `i18next` is this package's only one — which is the trade the parser makes on purpose; [`parser-curly`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly) and [`parser-icu`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu) are the lighter choices for a catalogue written fresh.

## Installation

```bash
npm install @sveltekit-i18n/parser-i18next
# bun add @sveltekit-i18n/parser-i18next
# deno add npm:@sveltekit-i18n/parser-i18next
```

**Requirements:** Node.js 22, Bun 1.2 or Deno 2, or newer. Version 3 is ESM-only, expects [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) v3 as a peer dependency, and builds on `i18next` v26.

## Usage

```typescript
// src/lib/translations/index.ts
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-i18next';
import type { Config } from '@sveltekit-i18n/parser-i18next';

const config: Config = {
  parser: parser({
    // Where a diagnostic goes; required, `null` included
    onReport: (report) => console.warn(report.message, report.error),
  }),
  loaders: [
    {
      locale: 'en',
      namespace: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    {
      locale: 'cs',
      namespace: 'common',
      loader: async () => (await import('./cs/common.json')).default,
    },
  ],
};

export const i18n = new I18n(config);
```

`i18n.t(key, payload?, options?)` takes the values the placeholders name and the per-call formatting options; the examples below use it.

Values are not HTML-escaped. Svelte escapes text itself when it renders `{i18n.t(...)}`, and i18next's escaping on top of that would double it, so `<b>` would reach the page as `&lt;b&gt;`. That is the one default this parser sets differently from i18next; `interpolation: { escapeValue: true }` restores it for output that is rendered as markup.

## Syntax

### Placeholders

```json
{
  "greeting": "Hi {{name}}!",
  "dotted": "Hello {{user.name}}!"
}
```

```javascript
i18n.t('greeting', { name: 'Alice' })
// → "Hi Alice!"

i18n.t('dotted', { user: { name: 'Bob' } })
// → "Hello Bob!"

i18n.t('greeting', {})
// → "Hi {{name}}!"
```

A placeholder names a payload key, or a dotted path into it; whitespace inside the braces is not significant. A placeholder whose value the payload lacks stays in the output as written, which is i18next's `skipOnVariables` default, and [`missingInterpolationHandler`](#missing-values) changes that. A value reaches the output as text: `null` as the empty string, `true` as `true`, an array joined with commas, a plain object as `[object Object]`, a `Date` under no format as its `toString()`.

### Unescaped values

```json
{
  "safe": "{{html}}",
  "raw": "{{- html}}"
}
```

With the default `escapeValue` both render the value as it is. With `interpolation: { escapeValue: true }`, the marker is what tells them apart:

```javascript
i18n.t('safe', { html: '<b>&' })
// → "&lt;b&gt;&amp;"

i18n.t('raw', { html: '<b>&' })
// → "<b>&"
```

### Formats

A format follows the key after a comma and reads its arguments from the parentheses: `key: value` pairs separated by semicolons, or a single bare argument where the format takes one. The value is formatted with `Intl` in the locale of the call.

```json
{
  "number": "{{n, number}}",
  "currency": "{{n, currency(USD)}}",
  "fraction": "{{n, number(minimumFractionDigits: 2)}}",
  "euro": "{{n, currency(currency: EUR; minimumFractionDigits: 0)}}",
  "date": "{{d, datetime}}",
  "long": "{{d, datetime(dateStyle: long)}}",
  "ago": "{{d, relativetime}}",
  "hours": "{{d, relativetime(range: hour)}}",
  "list": "{{l, list}}"
}
```

```javascript
i18n.t('number', { n: 1234.5 })
// → "1,234.5" (en), "1 234,5" (cs)

i18n.t('currency', { n: 1234.5 })
// → "$1,234.50"

i18n.t('fraction', { n: 5 })
// → "5.00"

i18n.t('euro', { n: 1234.5 })
// → "1.234,5 €" (de)

i18n.t('date', { d: new Date(2024, 2, 5) })
// → "3/5/2024" (en), "5. 3. 2024" (cs)

i18n.t('long', { d: new Date(2024, 2, 5) })
// → "March 5, 2024"

i18n.t('ago', { d: -3 })
// → "3 days ago" (en), "před 3 dny" (cs)

i18n.t('hours', { d: 3 })
// → "in 3 hours"

i18n.t('list', { l: ['a', 'b', 'c'] })
// → "a, b, and c" (en), "a, b a c" (cs)
```

The spaces `Intl` puts inside a Czech number, before a currency sign and after the Czech list's `a` are no-break spaces.

| Format | Reads the value with | Bare argument |
| --- | --- | --- |
| `number` | `Intl.NumberFormat` | — |
| `currency` | `Intl.NumberFormat`, `style: 'currency'` | the currency code: `currency(USD)` |
| `datetime` | `Intl.DateTimeFormat` | — |
| `relativetime` | `Intl.RelativeTimeFormat` | the unit, `day` unless named: `relativetime(hour)` |
| `list` | `Intl.ListFormat` | — |

A format nobody registered renders the value as its text: `{{n, bogus}}` with `1234.5` gives `1234.5`. So does a format `Intl` rejects — a malformed currency code, a locale tag it cannot read — because the engine contains that failure and hands the value on.

### Per-call `formatParams`

The second argument of `t()` after the payload carries `formatParams`: `Intl` options keyed by placeholder name, layered over the arguments the message spells out. An `lng` among them formats that one value in another locale.

```javascript
i18n.t('date', { d: new Date(2024, 2, 5) }, { formatParams: { d: { dateStyle: 'long' } } })
// → "March 5, 2024"

i18n.t('number', { n: 1234.5 }, { formatParams: { n: { maximumFractionDigits: 0 } } })
// → "1,235"

i18n.t('number', { n: 1234.5 }, { formatParams: { n: { lng: 'de' } } })
// → "1.234,5"
```

### Custom formats

```javascript
import parser from '@sveltekit-i18n/parser-i18next';

const config = {
  parser: parser({
    onReport: null,
    formats: {
      upper: (value) => String(value).toUpperCase(),
    },
  }),
};
```

```json
{
  "shout": "{{v, upper}}"
}
```

```javascript
i18n.t('shout', { v: 'abc' })
// → "ABC"
```

A format is a function of the value, the locale of the call and the merged options — the arguments the placeholder spells out, the call's `formatParams` entry for it and the payload itself — and what it returns is the text. Formats are registered per parser instance, under a name matched without regard to case.

### Missing values

```javascript
const config = {
  parser: parser({
    onReport: null,
    missingInterpolationHandler: (text, match) => `[${match[1]}?]`,
  }),
};
```

```javascript
i18n.t('greeting', {})
// → "Hi [name?]!"
```

The handler receives the message, the regular-expression match of the placeholder (`match[0]` is the placeholder, `match[1]` the text inside it) and the options of the call. A string it returns replaces the placeholder; anything else replaces it with the empty string.

## What this parser does not do

- **Plural and context suffixes** (`key_one`, `key_other`, `key_male`). Choosing a key variant is key resolution, which base does before any parser runs, so a parser only ever sees one message. An extension patching `t` is the natural home for it.
- **Nesting** (`$t(key)`). Resolving another key needs the translation tables, which the parser does not have; that is a resolver, not an adapter detail, and the text renders as written.
- **Placeholders named after `t()` options** (`{{lng}}`, `{{ns}}`, `{{context}}`, `{{defaultValue}}`). i18next's `t()` resolves a placeholder from its whole options bag; here the payload is the only data, so those names are missing values.
- **`returnObjects`, `defaultValue` and post-processors.** They belong to i18next's translation function, of which this parser is the interpolation step only; a missing translation is [`fallbackValue`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#fallbackvalue), which base answers before this parser is called.
- **Per-call `interpolation` overrides.** The second argument is typed as `formatParams` only; the other keys of i18next's `t()` options bag (`interpolation`, `lng`, `ns` and the rest) are not part of this parser's contract, whatever the engine happens to read from them.

## Options

```javascript
import parser from '@sveltekit-i18n/parser-i18next';

const config = {
  parser: parser({
    // i18next's own interpolation options. `escapeValue` is off here unless
    // stated; the rest keep their i18next defaults.
    interpolation: {
      prefix: '{{',
      suffix: '}}',
      formatSeparator: ',',
      unescapePrefix: '-',
      defaultVariables: { appName: 'My app' },
    },
    // Called for a placeholder whose value the payload lacks.
    missingInterpolationHandler: (text, match, options) => { /* ... */ },
    // Custom formats by name, over the built-in ones.
    formats: {},
    // Where diagnostics go. Required: a function, or `null` to state that
    // reports go nowhere.
    onReport: (report) => { /* ... */ },
  }),
};
```

| Option | Meaning |
| --- | --- |
| `onReport` | Where a diagnostic goes: a function, or `null` to state that reports go nowhere. Required. |
| `interpolation` | i18next's [`interpolation`](https://www.i18next.com/translation-function/interpolation) options, handed to the engine as they are: `escapeValue`, `prefix`, `suffix`, `formatSeparator`, `unescapePrefix`, `unescapeSuffix`, `defaultVariables`, `skipOnVariables`, `maxReplaces` and the rest. |
| `missingInterpolationHandler` | i18next's own, see [Missing values](#missing-values). |
| `formats` | Custom formats by name, see [Custom formats](#custom-formats). |

## Reports

i18next writes its diagnostics to a logger that is silent unless its `debug` option is on, and this package adds no writer of its own: `onReport` is therefore a required option — a function, or `null` to state that reports go nowhere — so that silence is a decision, never an omission. A host with a logger routes reports to it:

```javascript
parser({ onReport: (report) => logger.warn(report.message, report.error) })
```

A `Report` carries:

| Field | Meaning |
| --- | --- |
| `code` | `failed-message`: the message could not be rendered as text — the engine threw while interpolating it, and it is returned raw, or a leaf that is not text could not become any, and it renders as the empty string |
| `key`, `locale` | what the call was made for |
| `message` | what happened, in one sentence |
| `error` | what was thrown |

A report never raises, and a report channel that throws is contained like any other failure. A placeholder without a value is not a failure: it renders as i18next renders it, and [`missingInterpolationHandler`](#missing-values) is where to observe it.

## Extracting Parameters

What a message expects of its payload is fixed when the message is written, so a catalogue can be read for its parameters instead of them being discovered at render time. `extractParamsFactory` is the build-time half of the base parser contract, a named export beside the default one: a message scanner is of no use while rendering, so the package declares `sideEffects: false` and a bundle that never reaches it drops it.

```typescript
import { extractParamsFactory } from '@sveltekit-i18n/parser-i18next';

const extractParams = extractParamsFactory();

extractParams('{{count, number}} items for {{user.name}}');
// → [{ name: 'count', kind: 'number', optional: false }, { name: 'user.name', kind: 'unknown', optional: false }]
```

Each parameter is reported once, in the order the message first names it, and says what every placeholder naming it says together. `name` is the payload key as the message spells it — a dotted path stays dotted — and arbitrary text rather than an identifier, so whatever writes it down quotes it. `kind` is what the placeholder's format narrows the value to:

| Placeholder | `kind` |
| --- | --- |
| `{{value}}` | `'unknown'` |
| `{{value, number}}`, `{{value, currency(...)}}`, `{{value, relativetime(...)}}` | `'number'` |
| `{{value, datetime(...)}}` | `'date'` — a `Date` or milliseconds since the epoch |
| `{{value, list}}` | `'unknown'` — an array, which no kind names |
| a custom or unknown format | `'unknown'` |

A parameter several placeholders name accepts what all of them say together, and `unknown` is the top of that lattice rather than a member of it: `{{v}} and {{v, number}}` reports `'number'`, and `{{v, datetime}} and {{v, number}}` reports `['date', 'number']`. The syntax has no selectors, so every parameter is reported `optional: false` and none carries `values` or `when`.

Build the extractor from the `interpolation` options `parser()` is built from: the prefix, suffix, unescape marker and format separator decide what a placeholder looks like, so `extractParamsFactory({ interpolation: { prefix: '${', suffix: '}' } })` reads `${name}`. Only `prefix`, `suffix`, `unescapePrefix`, `unescapeSuffix` and `formatSeparator` are read: the pre-escaped `prefixEscaped` and `suffixEscaped`, which the engine falls back to when `prefix` or `suffix` is emptied, and the nesting markers are not. `formats` and `onReport` reach nothing here — extraction formats nothing and reports nothing.

Only the text of a message is scanned. A translation leaf that is not text names no parameters rather than throwing, an unclosed `{{name` names nothing, and the text inside a `$t(...)` nesting is scanned like any other text.

## TypeScript

```typescript
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-i18next';
import type { Config, Parser } from '@sveltekit-i18n/parser-i18next';

type Payload = { applicationName: string };

const config: Config<Payload> = {
  parser: parser({
    onReport: (report: Parser.Report) => { console.warn(report.message); },
  }),
  loaders: [/* ... */],
};

const i18n = new I18n(config);

i18n.t('common.welcome', { applicationName: 'My app' }, { formatParams: {} })
// → ok

i18n.t('common.welcome', { aplicationName: 'My app' })
// → type error: typo caught
```

`Config<Payload>` types the payload `i18n.t` accepts; left bare, `Config` accepts any payload key. The second argument is typed as the per-call options (`formatParams`). `Parser` holds the option and parameter types (`Parser.Options`, `Parser.OnReport`, `Parser.Report`, `Parser.Params`, `Parser.Payload`, `Parser.CallOptions`, `Parser.Format`, `Parser.ExtractOptions`), and the `interpolation` and `missingInterpolationHandler` options are i18next's own types.

## More Resources

- [i18next interpolation](https://www.i18next.com/translation-function/interpolation) and [formatting](https://www.i18next.com/translation-function/formatting) – The syntax this parser renders
- [sveltekit-i18n.github.io](https://sveltekit-i18n.github.io) – The documentation site, with a live playground
- [All Parsers](https://github.com/sveltekit-i18n/parsers) – Parser overview
- [Changelog](./CHANGELOG.md) – Version history

## Issues

If you're facing issues with this parser, create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).

## Sponsor

You can support the maintenance of this package through
[GitHub Sponsors](https://github.com/sponsors/sveltekit-i18n).

## License

MIT
