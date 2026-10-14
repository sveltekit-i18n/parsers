[![npm version](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-fluent.svg)](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-fluent) [![Tests](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-fluent.yml/badge.svg)](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-fluent.yml)

# @sveltekit-i18n/parser-fluent

[Fluent](https://projectfluent.org) for [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base), powered by [`@fluent/bundle`](https://github.com/projectfluent/fluent.js/tree/main/fluent-bundle), Fluent's JavaScript runtime and this package's only dependency. Fluent is Mozilla's localization system: variables, selectors over plural categories and strings, built-in number and date formatting, and terms - shared fragments such as a brand name, with grammatical forms of their own - that every message of a locale can reference. This README is a practical guide to using Fluent here; the full syntax is in the [Fluent Syntax Guide](https://projectfluent.org/fluent/guide/).

## Features

- 🦊 **Fluent** – Mozilla's localization system, as `@fluent/bundle` formats it
- 📐 **Selection** – Plural categories, exact numbers and strings
- 🏷️ **Terms** – Shared fragments per locale, with variants and attributes of their own
- 🔢 **Number formatting** – `NUMBER()`, and every `Intl.NumberFormat` style through `FluentNumber`
- 📅 **Date/time formatting** – `DATETIME()`, and time zones through `FluentDateTime`
- 🔧 **Custom functions** – Register your own, or replace a built-in one
- 🧩 **Build-time extraction** – Read a catalogue for the parameters its messages name
- 📝 **TypeScript** – Full type support

## Installation

```bash
npm install @sveltekit-i18n/parser-fluent
# bun add @sveltekit-i18n/parser-fluent
# deno add npm:@sveltekit-i18n/parser-fluent
```

**Note:** This parser has one external dependency (`@fluent/bundle`), which is installed automatically.

**Requirements:** Node.js 22.12, Bun 1.2 or Deno 2, or newer. Version 3 is ESM-only, expects [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) v3 as a peer dependency, and builds on `@fluent/bundle` 0.19. The examples use base 3.1: its loader spelling - `namespace`, and one descriptor listing several locales - and its `@sveltekit-i18n/base/kit` subpath. On base 3.0 write `key` and one descriptor per locale, whose loader names its own file, since 3.0 passes it no `namespace`: `{ locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default }`.

## Usage

### Basic Setup

```typescript
// src/lib/translations/index.ts
import { defineI18n } from '@sveltekit-i18n/base/kit';
import parser from '@sveltekit-i18n/parser-fluent';
import type { Config } from '@sveltekit-i18n/parser-fluent';

export const config: Config = {
  parser: parser({
    // Where a diagnostic goes; required, `null` included
    onReport: (report) => console.warn(report.message, report.error),
    // Optional: the terms of each locale, and Fluent's own options
  }),
  loaders: [
    {
      locale: ['en', 'cs'],
      namespace: 'home',
      routes: ['/'],
      loader: async ({ locale, namespace }) => (await import(`./${locale}/${namespace}.json`)).default,
    },
  ],
};

export const { handle, load, use, get } = defineI18n(config, {
  // The visitor's choice, where there is one; `Accept-Language` is tried next
  preferredLocale: (event) => event.cookies?.get('lang'),
});
```

Outside SvelteKit, `new I18n(config)` from `@sveltekit-i18n/base` builds the instance directly. A catalogue is a table of messages, as for every parser of the family; [Loading `.ftl` Files](#loading-ftl-files) reads one from Fluent's own file format.

### Wire SvelteKit

```typescript
// src/hooks.server.ts
export { handle } from '$lib/translations';
```

```typescript
// src/routes/+layout.server.ts and src/routes/+layout.ts - the same line in both
export { load } from '$lib/translations';
```

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { use } from '$lib/translations';

  let { data, children } = $props();

  use(() => data);
</script>

{@render children()}
```

The server negotiates the locale and loads it for the route into an instance of its own for every request, and the browser picks that up without fetching it again and follows every navigation. The core's [SvelteKit guide](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#sveltekit) covers the rest: which locale wins, `%lang%` and `%dir%` in `app.html`, and combining the hook and the loads with your own.

### Use in Components

```svelte
<script>
  import { get } from '$lib/translations';

  const i18n = get();

  let itemCount = 5;
  let gender = 'female';
</script>

<p>{i18n.t('home.items', { count: itemCount })}</p>
<p>{i18n.t('home.response', { gender })}</p>
```

`i18n.t(key, payload?)` takes the values the message's variables name; there is no per-call formatting slot, because a message states its own formatting as function options, and the app states what a message cannot as a [Fluent value](#fluent-values). The examples below use it.

## Fluent Syntax

A value of the catalogue is the pattern of one Fluent message: what follows `id =` in a Fluent file. A placeable is an expression in braces: a variable (`{ $name }`), a term (`{ -brand }`), a string or number literal (`{ "text" }`, `{ 42 }`), a function call (`{ NUMBER($count) }`), or a select expression. Text needs no escaping but for a brace, which is written as a string literal: `{ "{" }`. In a JSON catalogue a message of several lines is written with `\n`.

The outputs below are shown without the [bidi isolation](#bidi-isolation) marks Fluent places around a placeable in a message that holds more than the placeable; they are invisible in a browser, and a test comparing strings has to expect them.

### Variables

```json
{
  "greeting": "Hello, { $name }!",
  "count": "{ $count } items"
}
```

```javascript
i18n.t('greeting', { name: 'Alice' })
// → "Hello, Alice!"

i18n.t('count', { count: 1234.5 })
// → "1,234.5 items" (en) or "1 234,5 items" (cs, with a non-breaking space)
```

A variable takes a string, a number, a `Date`, or a [Fluent value](#fluent-values); a number and a date are formatted for the locale. A value of any other type - a boolean, an object, `null` - renders as the variable's [fallback](#reports), `{$name}`, and so does a variable the payload lacks. A name is read as an own property of the payload, so `{ $toString }` is a variable like any other, and a payload that is no object holds no variables.

### Numbers and Dates

`NUMBER()` and `DATETIME()` format their argument with the options the message passes them:

```json
{
  "precise": "{ NUMBER($value, minimumFractionDigits: 2) }",
  "rounded": "{ NUMBER($value, maximumFractionDigits: 0) }",
  "long": "Today is { DATETIME($date, dateStyle: \"long\") }",
  "weekday": "{ DATETIME($date, weekday: \"long\", year: \"numeric\", month: \"long\", day: \"numeric\") }",
  "seen": "Last seen { DATETIME($date, dateStyle: \"medium\", timeStyle: \"short\") }"
}
```

```javascript
const date = new Date('2024-01-15T12:00:00');

i18n.t('precise', { value: 3 })
// → "3.00"

i18n.t('rounded', { value: 1234.5 })
// → "1,235"

i18n.t('long', { date })
// → "Today is January 15, 2024"

i18n.t('weekday', { date })
// → "Monday, January 15, 2024"

i18n.t('seen', { date })
// → "Last seen Jan 15, 2024, 12:00 PM"
```

A message may set only the options that are the translator's to choose: `NUMBER()` takes `minimumIntegerDigits`, the fraction and significant digit options, `useGrouping`, `currencyDisplay` and `unitDisplay`; `DATETIME()` takes `dateStyle`, `timeStyle`, the component options (`weekday`, `era`, `year`, `month`, `day`, `hour`, `minute`, `second`, `fractionalSecondDigits`, `dayPeriod`, `timeZoneName`) and `hour12`. Any other option is ignored without a report. A number's style, currency and unit, the plural type and a date's time zone are the app's to set, with a [Fluent value](#fluent-values).

### Fluent Values

What a message cannot set, the app passes as a value built for it. `FluentNumber` takes the options of `Intl.NumberFormat`, and `FluentDateTime` those of `Intl.DateTimeFormat`; both are exported by this package, from the copy of `@fluent/bundle` it formats with, since Fluent tells a value's type by `instanceof`:

```json
{
  "total": "Total: { $amount }",
  "discount": "Discount: { $rate }",
  "meeting": "Meeting at { DATETIME($at, hour: \"numeric\", minute: \"numeric\") }"
}
```

```javascript
import { FluentDateTime, FluentNumber } from '@sveltekit-i18n/parser-fluent';

i18n.t('total', { amount: new FluentNumber(99.99, { style: 'currency', currency: 'USD' }) })
// → "Total: $99.99"

i18n.t('discount', { rate: new FluentNumber(0.15, { style: 'percent' }) })
// → "Discount: 15%"

i18n.t('meeting', { at: new FluentDateTime(Date.UTC(2024, 0, 15, 12), { timeZone: 'Asia/Tokyo' }) })
// → "Meeting at 9:00 PM"
```

A message still adds its own options to the value's: `{ NUMBER($amount, currencyDisplay: "code") }` renders `USD 99.99`, with a non-breaking space. `@fluent/bundle` also formats a Temporal object, where the runtime provides `Temporal`.

### Selection

A select expression picks a variant by the value of its selector. Each variant starts on a line of its own with its key in brackets, and the default variant, marked with `*`, is taken when no key matches:

```json
{
  "photos": "{ $count ->\n    [0] No photos.\n    [one] One photo.\n   *[other] { $count } photos.\n}",
  "response": "{ $gender ->\n    [male] He will respond shortly.\n    [female] She will respond shortly.\n   *[other] They will respond shortly.\n}"
}
```

```javascript
i18n.t('photos', { count: 0 })
// → "No photos."

i18n.t('photos', { count: 1 })
// → "One photo."

i18n.t('photos', { count: 5 })
// → "5 photos."

i18n.t('response', { gender: 'female' })
// → "She will respond shortly."
```

A number selects on its exact value first (`[0]`, `[1.5]`), then on its plural category for the locale: `zero`, `one`, `two`, `few`, `many`, `other`. A string selects on a key equal to it: the string `"1"` matches neither `[1]` nor `[one]`. The ordinal categories take a `FluentNumber` the app builds with `type: 'ordinal'`, an option of `Intl.PluralRules`, which `@fluent/bundle` types as `Intl.NumberFormatOptions` and hands to `Intl.PluralRules` as well:

```json
{
  "place": "{ $position ->\n    [one] { $position }st\n    [two] { $position }nd\n    [few] { $position }rd\n   *[other] { $position }th\n}"
}
```

```typescript
const ordinal: Intl.NumberFormatOptions & Intl.PluralRulesOptions = { type: 'ordinal' };

i18n.t('place', { position: new FluentNumber(22, ordinal) })
// → "22nd"
```

### Terms

A term is a fragment every message of a locale can reference - a product name, with the grammatical forms the locale needs. Terms are Fluent source, passed per locale to the parser:

```typescript
const config: Config = {
  parser: parser({
    onReport: console.warn,
    terms: {
      en: '-brand = Firefox\n    .gender = masculine',
      cs: '-brand = { $case ->\n   *[nominative] Firefox\n    [locative] Firefoxu\n}\n    .gender = masculine',
    },
  }),
};
```

```json
{
  "welcome": "Welcome to { -brand }!",
  "about": "About { -brand(case: \"locative\") }",
  "ready": "{ -brand.gender ->\n    [masculine] He is ready.\n   *[other] It is ready.\n}"
}
```

```javascript
i18n.t('welcome')
// → "Welcome to Firefox!"

i18n.t('about') // in cs
// → "About Firefoxu"

i18n.t('ready')
// → "He is ready."
```

A message passes a term named arguments, which the term reads as its own variables; an attribute of a term (`-brand.gender`) is meant for selection, though `@fluent/bundle` renders its value where a message places it: `{ -brand.gender }` renders `masculine`. A locale is matched without regard to case and exactly otherwise: `en-US` does not read the terms of `en`. A message rendered from the fallback locale reads the terms of the locale it is rendered for, which `t()` passes the parser. Only terms are read from a source: a message it defines is left out, and so is an entry Fluent cannot read. Of two terms of one name the first wins, and of two keys that differ by case alone the last. Terms are read once, when the parser is built: load them with the app, for example as `import en from './en/terms.ftl?raw'` in Vite.

### Message References and Attributes

A message is formatted on its own, so it cannot reference another: `{ other-message }` renders as its fallback, `{other-message}`, and is reported as `fallback-value`. Share a fragment as a [term](#terms) instead. A message has no attributes either: `.title = …` under a message fails it. Write an attribute as a key of its own, which base's dot notation reads as one more key: `"login.placeholder"`.

### Whitespace and Line Starts

A value is read as Fluent reads a pattern in a file. The blanks at its start and end are trimmed, and the common indent of its lines after the first is removed:

```javascript
i18n.t('k') // "First line\n  indented\nthird"
// → "First line\n  indented\nthird"

i18n.t('k') // "Hello\n    world"
// → "Hello\nworld"

i18n.t('k') // "  padded  "
// → "padded"
```

Write blanks Fluent would trim as a string literal: `{ "  " }`. A line of text after the first must not start with `[`, `*`, `.` or `}`, and the blanks any line after the first starts with must all be spaces - no tab, no no-break space, no ideographic space - whether the line holds text, blanks alone or a variant: Fluent indents with spaces alone. A value holds no carriage return but before a line feed, and no line separator (U+2028, U+2029) followed by `name =`, which Fluent reads as the start of another entry. Such a value is reported as `failed-message` and returned raw, never cut short. Write the character as a string literal, `{ "[" }`, and a carriage return or a line separator as an escape, `{ "\u000D" }`. A select expression writes its variants on lines of their own, and a line starting with `[` or `*` inside one is a variant key, as it should be.

[`@sveltekit-i18n/extension-markdown`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-markdown#parsers) renders Markdown written as text, which this parser leaves as it is but for those rules: a list item starting with `*` or a line starting with a tab is written through a string literal, `{ "*" } item`. [`@sveltekit-i18n/extension-html`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-html#parsers) renders HTML tags written as text, which Fluent leaves as it is. A placeable inside an attribute value carries its [isolation](#bidi-isolation) marks into the value. From extension-html 3.0.2, `<T>` renders every attribute but `title` without them, so `<a href="/docs/{ $slug }">` links to `/docs/` and the slug. An attribute the app fills with `t()` keeps them: `href={i18n.t('docs.link', { slug })}` links to the slug between U+2068 and U+2069, which the browser percent-encodes into the path, so build the parser with `useIsolating: false` where such an attribute interpolates.

## Bidi Isolation

By default Fluent wraps a placeable in U+2068 FIRST STRONG ISOLATE and U+2069 POP DIRECTIONAL ISOLATE, so a right-to-left name inside a left-to-right sentence does not reorder the text around it. A message that is one placeable alone gets none. The marks are invisible in a browser, and the examples in this guide omit them. A test comparing strings has to expect them, or switch them off:

```javascript
// Under the default settings
expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, \u2068Alice\u2069!');

// With `useIsolating: false`
expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
```

## Parser Options

Configure the parser with Fluent's options, plus `onReport`, `terms` and `cacheLimit`:

```typescript
import parser from '@sveltekit-i18n/parser-fluent';

const config = {
  parser: parser({
    onReport: (report) => console.warn(report.message, report.error),
    // Optional: the terms of each locale, as Fluent source
    terms: { en: '-brand = Firefox' },
    // Optional: how many compiled messages are kept (default 10,000)
    cacheLimit: 20000,
    // Optional: Fluent's own options
    useIsolating: true,
    functions: {},
    transform: (text) => text,
  }),
};
```

| Option | Meaning |
| --- | --- |
| `onReport` | Where a diagnostic goes: a function, or `null` to discard reports. Required. |
| `terms` | Fluent source per locale, holding the [terms](#terms) its messages reference. |
| `cacheLimit` | How many compiled messages the parser keeps, 10,000 by default; a value that is no count keeps the default - see [Caching and Error Handling](#caching-and-error-handling). |
| `useIsolating` | Whether a placeable is [isolated](#bidi-isolation); `true` by default. |
| `functions` | Functions by name, beside `NUMBER` and `DATETIME`: a new name adds a function, a builtin's name replaces it. |
| `transform` | Applied to every piece of text Fluent resolves - the message's, its variants' and the terms' it references - never to a variable's value, a string literal or what a function returns: a pseudo-localization, for example. |

`onReport` is required, `null` included: this package writes to no channel of its own, so where a diagnostic goes is stated by whoever builds the parser. Pass `null` to discard reports.

### Custom Functions

A function receives the positional arguments and the named ones, resolved, and returns a Fluent value or a string. This package exports `FluentFunction`, and the value classes from the copy of `@fluent/bundle` it formats with: `FluentNumber` and `FluentDateTime`, `FluentNone` for a function's fallback, and `FluentType` to subclass a value of your own:

```typescript
import parser from '@sveltekit-i18n/parser-fluent';
import type { FluentFunction } from '@sveltekit-i18n/parser-fluent';

const UPPER: FluentFunction = ([value]) => String(value).toUpperCase();

const config = {
  parser: parser({ onReport: console.warn, functions: { UPPER } }),
};
```

```json
{
  "shout": "{ UPPER($name) }!"
}
```

```javascript
i18n.t('shout', { name: 'alice' })
// → "ALICE!"
```

A function that throws an `Error` leaves its placeable to the [fallback](#reports), `{UPPER()}`. One that throws anything else fails the message, which is returned raw.

## Loading `.ftl` Files

Fluent's own file format holds a locale's messages, their attributes and its terms in one file. [`@fluent/syntax`](https://github.com/projectfluent/fluent.js/tree/main/fluent-syntax) reads one into what this parser takes - a message's pattern under its id, an attribute under `id.attribute`, and the terms apart:

```typescript
import { Message, parse, Term } from '@fluent/syntax';

export const readFtl = (source: string) => {
  const { body } = parse(source, { withSpans: true });
  const text = ({ span }: { span?: { start: number; end: number } | null }) => source.slice(span!.start, span!.end);
  const messages: Record<string, string> = {};
  const terms: string[] = [];

  body.forEach((entry) => {
    if (entry instanceof Term) terms.push(text(entry));
    if (!(entry instanceof Message)) return;
    if (entry.value) messages[entry.id.name] = text(entry.value);
    entry.attributes.forEach((attribute) => {
      messages[`${entry.id.name}.${attribute.id.name}`] = text(attribute.value);
    });
  });

  return { messages, terms: terms.join('\n') };
};
```

Every message then renders as Fluent renders it from the file, but for a reference to another message. Run it where the bundle size does not matter - a build step that writes JSON, or a loader that runs on the server alone - since `@fluent/syntax` is a parser of its own. The package's suite runs this recipe against a file of every construct.

## Reports

A report carries `code`, the `key` and `locale` the call was made for, a one-sentence `message`, and the `error` Fluent threw or collected where there was one:

| `code` | When |
| --- | --- |
| `failed-message` | The message could not be read as one Fluent pattern - a placeable left open, an attribute, a [line start or a carriage return](#whitespace-and-line-starts) the parser refuses, a nesting too deep to read, a run of more than 1,000 spaces, which Fluent reads in quadratic time, or a line separator (U+2028, U+2029) followed by `name =`, which Fluent reads as the start of another entry - or nothing of it could be formatted (an invalid date, more than 100 placeables, a locale `Intl` rejects under a selector on a number), or a function threw what is no `Error`. The raw message is returned; a leaf that is not text and cannot become any renders as the empty string. |
| `fallback-value` | One placeable could not be resolved: a variable the payload lacks or holds a value Fluent does not format, a term the locale's `terms` lack, a reference to another message, a function nobody registered or one that threw. The rest of the message rendered, and the output carries Fluent's fallback for that placeable, `{$name}`. A number or a date `Intl` cannot format - for the options of a [Fluent value](#fluent-values), or for the locale - renders unformatted instead: the number, or the date as ISO text. |

```javascript
const config = {
  parser: parser({
    onReport: (report) => logger.warn(report.message, report),
  }),
};
```

A report never raises, and neither does a report channel that throws: the failure is contained and the render goes on.

## Caching and Error Handling

A compiled message does not depend on the locale, so it is cached once for every locale: a parser keeps up to [`cacheLimit`](#parser-options) of them, 10,000 by default, the least recently used making room. A short message takes about 1 KB of the JavaScript heap. `cacheLimit: 0` compiles on every call, and `Infinity` never evicts, so memory grows with every message the parser meets.

The parser also keeps a bundle per locale it formats for, holding the locale's terms and the `Intl` formatters its messages use, up to 1,000 locales whatever `cacheLimit` says. The formatters go with the bundle: none is kept by `@fluent/bundle`'s own memo, which never lets go of a locale it was given.

A key naming no message is nothing to format and yields the empty string; what a missing translation renders as is [`fallbackValue`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#fallbackvalue), which base answers before this parser is called.

If a message cannot be compiled, the parser does not throw. It reports the failure through [`onReport`](#reports) and returns the raw message, so one broken translation cannot crash your page. A placeable that cannot be resolved does not take the message down either: it renders as Fluent's fallback, `{$name}`, and is reported as `fallback-value`. `parse` always returns a string.

## TypeScript Support

```typescript
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-fluent';
import type { Config, Parser } from '@sveltekit-i18n/parser-fluent';

type Payload = { applicationName: string };

const config: Config<Payload> = {
  parser: parser({
    onReport: (report: Parser.Report) => { console.warn(report.message); },
  }),
  loaders: [/* ... */],
};

const i18n = new I18n(config);

i18n.t('common.welcome', { applicationName: 'My app' })
// → ok

i18n.t('common.welcome', { aplicationName: 'My app' })
// → type error: typo caught
```

`Config<Payload>` types the payload `i18n.t` accepts; left bare, `Config` accepts any payload key. `Parser` holds the option, report and parameter types (`Parser.Options`, `Parser.Report`, `Parser.OnReport`, `Parser.Params`, `Parser.Payload`), and `FluentFunction`, `FluentValue` and `FluentVariable` are `@fluent/bundle`'s. Translation keys and their payloads are typed by [`config.schema`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#schema), which [`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen) fills from your catalogue through this parser's extractor - see [Extracting Parameters](#extracting-parameters).

## Extracting Parameters

What a message expects of its payload is fixed when the message is written, so a catalogue can be read for its parameters instead of them being discovered at render time. `extractParamsFactory` is the build-time half of the base parser contract, a named export beside the default one: a message scanner is of no use while rendering, so the package declares `sideEffects: false` and a bundle that never reaches it drops it.

```typescript
import { extractParamsFactory } from '@sveltekit-i18n/parser-fluent';

const extractParams = extractParamsFactory();

extractParams('{ $gender ->\n    [male] He\n    [female] She\n   *[other] They\n} replied to { $name }.');
// → [
//   { name: 'gender', kind: 'string', values: ['male', 'female'], optional: false },
//   { name: 'name', kind: 'unknown', optional: false },
// ]
```

Each parameter is reported once, in the order the message first names it, and says what every expression naming it says together. `name` is the payload key. `kind` is `'string'` for the selector of a select expression whose keys are strings, none a plural category but `other`, and one of them neither the default's nor `other`; it is `'unknown'` for everything else: a number or a date may be a [Fluent value](#fluent-values) the app builds, which no kind base defines takes, so `NUMBER($x)`, `DATETIME($x)` and a selector with a number key or a plural category (`zero`, `one`, `two`, `few`, `many`) narrow nothing, and neither does a selector whose keys are only the default and `other`, which every number of a locale with one plural category takes. A variable a term's positional argument names is a parameter too, since Fluent resolves it against the payload.

`values` lists the keys of a string selector, and the number keys of a numeric one, as `String()` spells them: they are the keys that are values of the parameter - a plural category is decided by the locale, and the default variant's key is the catch-all rather than a value. It is a hint and never a closed set: a value none of them matches takes the default variant rather than failing. The number keys of a `NUMBER($x)` selector are values of `x`.

`optional` reports a parameter every expression naming it puts inside a variant, since only some variants of the message use it, and `when` names those variants - one `{ param, branch }` per selector reading a parameter, `branch` being a string key as it is written, a number key as `String()` spells it (`[1.50]` is `'1.5'`), or `*` for the default variant - so a generator can emit a discriminated payload instead of the flat approximation. A selector that reads no parameter, a term's attribute or a custom function's result, still makes what its variants name optional, without a branch of its own. Named outside every variant once, the parameter is expected outright.

Build the extractor from the same options `parser()` is built from. Only `functions` changes what a message names: a function named `NUMBER` replaces the builtin, whose keys are then no values of its argument. `onReport` and `cacheLimit` are not among them - extraction reports and caches nothing.

Only the text of a message is scanned. A translation leaf that is not text names no parameters rather than throwing, and neither does a message this parser cannot compile.

This is what types `t` and `l` by key and payload: [`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen), a Vite plugin, runs the config the module it is pointed at exports as `config`, reads every message through the extractor and writes the schema, which it registers for every config that states no [`schema`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#schema) of its own, so on base 3.1 there is nothing to wire ([an older core](https://github.com/sveltekit-i18n/typegen#3-nothing-to-wire-on-a-31-core) takes a cast). It is told which package the extractor comes from:

```javascript
// vite.config.js
typegen({ config: 'src/lib/translations/index.ts', extractParams: { from: '@sveltekit-i18n/parser-fluent' } })
```

The plugin hands the factory any options it is given as JSON, so `functions` cannot reach the extractor: a message that replaces `NUMBER` is typed as if it did not, which only adds values to a hint.

## Examples

### Complete Multi-page App

```typescript
// src/lib/translations/index.ts
import { defineI18n } from '@sveltekit-i18n/base/kit';
import parser from '@sveltekit-i18n/parser-fluent';
import type { Config } from '@sveltekit-i18n/parser-fluent';
import en from './en/terms.ftl?raw';
import cs from './cs/terms.ftl?raw';

export const config: Config = {
  parser: parser({ onReport: console.warn, terms: { en, cs } }),
  loaders: [
    {
      locale: ['en', 'cs'],
      namespace: 'common',
      loader: async ({ locale, namespace }) => (await import(`./${locale}/${namespace}.json`)).default,
    },
    {
      locale: ['en', 'cs'],
      namespace: 'home',
      routes: ['/'],
      loader: async ({ locale, namespace }) => (await import(`./${locale}/${namespace}.json`)).default,
    },
  ],
};

export const { handle, load, use, get } = defineI18n(config);
```

`hooks.server.ts`, both root layout files and the root `+layout.svelte` are wired as in [Wire SvelteKit](#wire-sveltekit).

```jsonc
// src/lib/translations/en/common.json
{
  "app.name": "{ -brand }",
  "nav.home": "Home",
  "nav.about": "About",
  "items": "{ $count ->\n    [0] You have no items.\n    [one] You have one item.\n   *[other] You have { $count } items.\n}"
}
```

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { get } from '$lib/translations';

  const i18n = get();

  let cartItems = 3;
</script>

<h1>{i18n.t('common.app.name')}</h1>
<p>Current locale: {i18n.locale}</p>
<p>{i18n.t('common.items', { count: cartItems })}</p>
```

## Comparison

**Fluent (parser-fluent):**
```json
{
  "items": "{ $count ->\n    [0] no items\n    [one] one item\n   *[other] { $count } items\n}"
}
```

**MessageFormat 2 (parser-mf2):**
```json
{
  "items": ".input {$count :integer}\n.match $count\n0 {{no items}}\none {{one item}}\n* {{{$count} items}}"
}
```

**ICU (parser-icu):**
```json
{
  "items": "{count, plural, =0 {no items} one {one item} other {# items}}"
}
```

**Curly (parser-curly):**
```json
{
  "items": "{{count:plural; 0:no items; one:one item; other:{{count:number}} items;}}"
}
```

All four select by the locale's plural categories. Fluent's `*` variant, ICU's `other` and MessageFormat 2's `*` catch every category a message leaves out, while a Curly message writes each category its locale uses. Fluent adds terms, which keep a product name and its grammar in one place per locale; choose based on your preference and requirements.

## More Resources

- 📖 [Fluent Syntax Guide](https://projectfluent.org/fluent/guide/) – The syntax, by example
- 📚 [fluent.js](https://github.com/projectfluent/fluent.js) – `@fluent/bundle` and `@fluent/syntax`
- 🌐 [sveltekit-i18n.github.io](https://sveltekit-i18n.github.io) – The documentation site
- 🎨 [All Parsers](https://github.com/sveltekit-i18n/parsers) – Parser overview
- 📋 [Changelog](https://github.com/sveltekit-i18n/parsers/blob/master/parser-fluent/CHANGELOG.md) – Version history

## Issues

If you're facing issues with this parser, create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).

## Sponsor

You can support the maintenance of this package through
[GitHub Sponsors](https://github.com/sponsors/sveltekit-i18n).

## License

MIT
