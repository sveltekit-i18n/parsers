[![npm version](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-mf2.svg)](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-mf2) [![Tests](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-mf2.yml/badge.svg)](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-mf2.yml)

# @sveltekit-i18n/parser-mf2

[Unicode MessageFormat 2](https://unicode.org/reports/tr35/tr35-messageFormat.html) for [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base), powered by [`messageformat`](https://github.com/messageformat/messageformat), the format's reference implementation and this package's only dependency. MessageFormat 2 is the Unicode standard's successor to ICU MessageFormat: variables and functions in single braces, declarations that annotate a value once for the whole message, and selection on any number of values at once. This README is a practical guide to the syntax — the full grammar and the resolution rules are in the specification.

## Features

- 🌍 **Unicode standard** – MessageFormat 2, as specified in LDML
- 📐 **Selection** – Plural categories, exact matches and several selectors at once
- 🎯 **Declarations** – `.input` and `.local` annotate a value once for the whole message
- 🔢 **Number formatting** – `:number`, `:integer`, `:currency`, `:percent`, `:unit`
- 📅 **Date/time formatting** – `:date`, `:datetime`, `:time`, registered out of the box
- 🔧 **Custom functions** – Register your own, or replace a built-in one
- 🧩 **Build-time extraction** – Read a catalogue for the parameters its messages name
- 📝 **TypeScript** – Full type support

## Installation

```bash
npm install @sveltekit-i18n/parser-mf2
# bun add @sveltekit-i18n/parser-mf2
# deno add npm:@sveltekit-i18n/parser-mf2
```

**Note:** This parser has one external dependency (`messageformat`), which is installed automatically.

**Requirements:** Node.js 22.12, Bun 1.2 or Deno 2, or newer. Version 3 is ESM-only, expects [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) v3 as a peer dependency, and builds on `messageformat` v4.

## Usage

### Basic Setup

```typescript
// src/lib/translations/index.ts
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-mf2';
import type { Config } from '@sveltekit-i18n/parser-mf2';

const config: Config = {
  parser: parser({
    // Where a diagnostic goes; required, `null` included
    onReport: (report) => console.warn(report.message, report.error),
    // Optional: the engine's own options
    // See: https://github.com/messageformat/messageformat
  }),
  loaders: [
    {
      locale: 'en',
      key: 'home',
      routes: ['/'],
      loader: async () => (await import('./en/home.json')).default,
    },
    {
      locale: 'cs',
      key: 'home',
      routes: ['/'],
      loader: async () => (await import('./cs/home.json')).default,
    },
  ],
};

export const i18n = new I18n(config);
```

### Load Translations

```typescript
// src/routes/+layout.ts
import { i18n } from '$lib/translations';

export const load = async ({ url }) => {
  const { pathname } = url;
  const initLocale = 'en';

  await i18n.loadTranslations(initLocale, pathname);

  return {};
};
```

### Use in Components

```svelte
<script>
  import { i18n } from '$lib/translations';

  let itemCount = 5;
  let gender = 'female';
</script>

<p>{i18n.t('home.items', { count: itemCount })}</p>
<p>{i18n.t('home.response', { gender })}</p>
```

`i18n.t(key, payload?)` takes the values the message's variables name; there is no per-call formatting slot, because a message states its own formatting as function options. The examples below use it.

## MessageFormat 2 Syntax

A placeholder is an expression in single braces: a variable (`{$name}`), a literal (`{|text|}`, `{42}`), or either with a function and its options (`{$count :number minimumFractionDigits=2}`). Braces, backslashes and pipes are escaped with a backslash: `\{`, `\}`, `\\`, `\|`. In a JSON catalogue each backslash is written twice, and a message with declarations or selection spans several lines, written as `\n`.

The outputs below are shown without the [bidi isolation](#bidi-isolation) marks the default settings place around a placeholder of unknown direction; they are invisible in a browser, and a test comparing strings has to expect them.

### Variables

```json
{
  "greeting": "Hello, {$name}!",
  "user": "Signed in as {$user.name}."
}
```

```javascript
i18n.t('greeting', { name: 'Alice' })
// → "Hello, Alice!"

i18n.t('user', { user: { name: 'Kat' } })
// → "Signed in as Kat."
```

A dotted name reads into an object value. A value that is no text becomes what `String()` makes of it: an object renders as `[object Object]`, an array as its elements joined by commas. An absent value - `undefined` - is not text either: the expression renders as its [fallback](#reports), `{$name}`, instead. `null` is not absence to the engine: bare, it renders as the engine's own fallback, `{�}` (the replacement character in braces), and is reported as `fallback-value` with the error the engine raised; under a function, the function decides what it makes of it - `:string` renders the text `null`, `:number` leaves the expression to the fallback.

### Functions

A function follows the operand after a colon and reads its options from the expression:

```json
{
  "count": "{$count :number} items",
  "precise": "{$value :number minimumFractionDigits=2}",
  "rounded": "{$value :integer}",
  "literal": "{42 :number} and {|plain text|}"
}
```

```javascript
i18n.t('count', { count: 1234.5 })
// → "1,234.5 items" (en) or "1 234,5 items" (cs, with a non-breaking space)

i18n.t('precise', { value: 3 })
// → "3.00"

i18n.t('rounded', { value: 1234.5 })
// → "1,235"

i18n.t('literal')
// → "42 and plain text"
```

`:number` and `:integer` take the digit, rounding, grouping and sign options of `Intl.NumberFormat` the specification lists (`minimumFractionDigits`, `useGrouping`, `signDisplay`, ...) and select on the value; `:integer` takes no fraction-digit options, and an option the specification does not list is ignored without a report. `:string` reads the operand as text and selects on it; `:offset add=1` or `subtract=1` shifts a number before it is formatted. Together with the [draft functions](#date-time-currency-percent-and-unit) registered by this package, these are the functions a message can name out of the box; [custom functions](#custom-functions) add to them.

### Declarations

A declaration annotates a value once, before the pattern, which is then written in double braces. `.input` annotates a payload variable; `.local` names a value of the message's own:

```json
{
  "photos": ".input {$count :integer}\n{{{$count} photos}}",
  "price": ".local $amount = {$value :number minimumFractionDigits=2}\n{{Price: {$amount}}}"
}
```

```javascript
i18n.t('photos', { count: 1234.5 })
// → "1,235 photos"

i18n.t('price', { value: 3 })
// → "Price: 3.00"
```

### Selection

`.match` selects a variant by one or more values. Each variant lists one key per selector - a literal, or `*` for anything - and one variant has to be `*` for every selector. A selector must be annotated: declare it with the function that selects on it.

```json
{
  "photos": ".input {$count :integer}\n.match $count\n0 {{No photos.}}\none {{One photo.}}\n* {{{$count} photos.}}",
  "response": ".input {$gender :string}\n.match $gender\nmale {{He will respond shortly.}}\nfemale {{She will respond shortly.}}\n* {{They will respond shortly.}}",
  "likes": ".input {$count :integer}\n.input {$gender :string}\n.match $count $gender\n0 * {{Nobody liked this.}}\none female {{She liked this.}}\none male {{He liked this.}}\none * {{They liked this.}}\n* * {{{$count} people liked this.}}"
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

i18n.t('likes', { count: 1, gender: 'female' })
// → "She liked this."

i18n.t('likes', { count: 3, gender: 'female' })
// → "3 people liked this."
```

A number selects on its exact value first (`0`, `1`, `1.5`), then on its plural category for the locale: `zero`, `one`, `two`, `few`, `many`, `other`. `select=ordinal` switches `:integer` and `:number` to the ordinal categories:

```json
{
  "place": ".input {$position :integer select=ordinal}\n.match $position\none {{{$position}st}}\ntwo {{{$position}nd}}\nfew {{{$position}rd}}\n* {{{$position}th}}"
}
```

```javascript
i18n.t('place', { position: 3 })
// → "3rd"

i18n.t('place', { position: 22 })
// → "22nd"
```

### Date, Time, Currency, Percent and Unit

The specification classifies `:date`, `:datetime`, `:time`, `:currency`, `:percent` and `:unit` as DRAFT - liable to change, and outside its stability guarantee - and `messageformat` ships them apart from the required functions for that reason. This package registers them by default, so dates and money format out of the box as they do with the other official parsers, and tracks the upstream draft status: what `messageformat` ships as its draft functions is what a message can name here.

```json
{
  "today": "Today is {$date :date}",
  "long": "Today is {$date :date length=long}",
  "weekday": "{$date :date fields=year-month-day-weekday length=long}",
  "seen": "Last seen {$date :datetime}",
  "time": "At {$date :time}",
  "total": "Total: {$amount :currency currency=USD}",
  "discount": "Discount: {$rate :percent}",
  "weight": "{$mass :unit unit=kilogram}"
}
```

```javascript
const date = new Date('2024-01-15T12:00:00');

i18n.t('today', { date })
// → "Today is Jan 15, 2024" (en) or "Today is 15. 1. 2024" (cs)

i18n.t('long', { date })
// → "Today is January 15, 2024"

i18n.t('weekday', { date })
// → "Monday, January 15, 2024"

i18n.t('seen', { date })
// → "Last seen Jan 15, 2024, 12:00 PM"

i18n.t('time', { date })
// → "At 12:00 PM"

i18n.t('total', { amount: 99.99 })
// → "Total: $99.99"

i18n.t('discount', { rate: 0.15 })
// → "Discount: 15%"

i18n.t('weight', { mass: 5 })
// → "5 kg"
```

A date operand is a `Date`, milliseconds since the epoch, or text `Date` parses. `:date` takes `fields` (`weekday`, `day-weekday`, `month-day`, `month-day-weekday`, `year-month-day`, `year-month-day-weekday`) and `length` (`long`, `medium`, `short`); `:datetime` takes the same as `dateFields` and `dateLength`, plus `timePrecision` (`hour`, `minute`, `second`); `:time` takes `precision`. All three take `timeZone` and `calendar`, and the two with a time part `hour12` and `timeZoneStyle`. `:currency` requires `currency`, `:unit` requires `unit`, and both take the `Intl.NumberFormat` options of their style the specification lists, as `:percent` does; `:currency` states its fraction digits as one `fractionDigits` rather than the `Intl` pair. The option names are the specification's, not `Intl`'s: `dateStyle` or `style` names nothing and is ignored.

### Markup

```json
{
  "link": "Click {#link href=$url}here{/link}."
}
```

```javascript
i18n.t('link', { url: '/docs' })
// → "Click here."
```

Markup formats to nothing in text: this parser returns a string, so `{#link}` and `{/link}` leave only their content. Their options are still read, which is why the variables they name are [extracted](#extracting-parameters).

## Bidi Isolation

By default the engine isolates every placeholder unless both the message and the value are known to be left-to-right, so a right-to-left name inside a left-to-right sentence does not reorder the text around it. A value of unknown direction - text, unless a function states one - is wrapped in U+2068 FIRST STRONG ISOLATE and U+2069 POP DIRECTIONAL ISOLATE; one of known direction in U+2066 LEFT-TO-RIGHT ISOLATE or U+2067 RIGHT-TO-LEFT ISOLATE and U+2069 instead. A number or a date formatted for a left-to-right locale in a left-to-right message is known left-to-right on both sides and gets none. The marks are invisible in a browser, and the examples in this guide omit them. A test comparing strings has to expect them, or switch them off:

```javascript
// Under the default settings
expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, \u2068Alice\u2069!');

// With `bidiIsolation: 'none'`
expect(i18n.t('greeting', { name: 'Alice' })).toBe('Hello, Alice!');
```

`bidiIsolation: 'none'` applies no isolation at all; `dir` states the message's base direction where the locale would guess wrong.

## Parser Options

Configure the parser with the engine's options, plus `onReport`:

```typescript
import parser from '@sveltekit-i18n/parser-mf2';

const config = {
  parser: parser({
    onReport: (report) => console.warn(report.message, report.error),
    // Optional engine options
    bidiIsolation: 'default',
    dir: 'auto',
    localeMatcher: 'best fit',
    functions: {},
  }),
};
```

| Option | Meaning |
| --- | --- |
| `onReport` | Where a diagnostic goes: a function, or `null` to discard reports. Required. |
| `bidiIsolation` | `'default'` isolates placeholders as [described above](#bidi-isolation); `'none'` applies no isolation. |
| `dir` | The message's base direction, `'ltr'`, `'rtl'` or `'auto'`; detected from the locale when not set. |
| `localeMatcher` | `'best fit'` or `'lookup'`, the `Intl` locale negotiation each function uses. |
| `functions` | Functions by name, spread over the draft ones: a new name adds a function, a known name replaces it. |

`onReport` is required, `null` included: this package writes to no channel of its own, so where a diagnostic goes is stated by whoever builds the parser. Pass `null` to discard reports.

### Custom Functions

A function receives the engine's context (`locales`, `dir`, `localeMatcher`, `onError`), the expression's options, and the operand, and returns a message value: an object naming its `type`, rendering itself with `toString`, and optionally stating its `dir` and selecting a variant key with `selectKey`. `messageformat/functions` exports the `MessageFunction` type, the built-in implementations (`DefaultFunctions`, `DraftFunctions`) and helpers for reading options.

```typescript
import parser from '@sveltekit-i18n/parser-mf2';
import type { MessageFunction } from 'messageformat/functions';

const upper: MessageFunction<string> = (context, options, input) => ({
  type: 'string',
  dir: 'ltr',
  toString: () => String(input).toUpperCase(),
});

const config = {
  parser: parser({ onReport: null, functions: { upper } }),
};
```

```json
{
  "shout": "{$name :upper}!"
}
```

```javascript
i18n.t('shout', { name: 'alice' })
// → "ALICE!"
```

A function that throws, or returns something that is no message value, leaves its expression to the [fallback](#reports).

## Reports

A report carries `code`, the `key` and `locale` the call was made for, a one-sentence `message`, and the `error` the engine threw or handed back where there was one:

| `code` | When |
| --- | --- |
| `failed-message` | The message could not be compiled - a syntax error, or a data model error such as a selector without an annotation or a `.match` without a `*` variant - or could not be formatted at all. The raw message is returned; a leaf that is not text and cannot become any renders as the empty string. |
| `fallback-value` | One expression could not be resolved: a variable the payload lacks, a function nobody registered, or a function that rejected its operand or options. The rest of the message rendered, and the output carries the format's fallback for that expression, `{$name}`. |

```javascript
const config = {
  parser: parser({
    onReport: (report) => logger.warn(report.message, report),
  }),
};
```

A report never raises, and neither does a report channel that throws: the failure is contained and the render goes on.

## Caching and Error Handling

Compiled messages are cached per parser instance (least-recently-used, up to 10,000 entries keyed by locale and message), so repeated reads of the same message skip recompilation.

A key naming no message is nothing to format and yields the empty string; what a missing translation renders as is [`fallbackValue`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#fallbackvalue), which base answers before this parser is called.

If a message cannot be compiled, the parser does not throw. It reports the failure through [`onReport`](#reports) and returns the raw message, so one broken translation cannot crash your page. An expression that cannot be resolved does not take the message down either: it renders as the format's fallback, `{$name}`, and is reported as `fallback-value`. `parse` always returns a string.

## TypeScript Support

```typescript
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-mf2';
import type { Config, Parser } from '@sveltekit-i18n/parser-mf2';

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

`Config<Payload>` types the payload `i18n.t` accepts; left bare, `Config` accepts any payload key. `Parser` holds the option, report and parameter types (`Parser.Options`, `Parser.Report`, `Parser.OnReport`, `Parser.Params`, `Parser.Payload`). The library provides type definitions for the parser and configuration, but does not automatically infer translation keys from your JSON files.

## Extracting Parameters

What a message expects of its payload is fixed when the message is written, so a catalogue can be read for its parameters instead of them being discovered at render time. `extractParamsFactory` is the build-time half of the base parser contract, a named export beside the default one: a message scanner is of no use while rendering, so the package declares `sideEffects: false` and a bundle that never reaches it drops it.

```typescript
import { extractParamsFactory } from '@sveltekit-i18n/parser-mf2';

const extractParams = extractParamsFactory();

extractParams('.input {$count :integer}\n.match $count\n0 {{No photos.}}\n* {{{$count} photos.}}');
// → [{ name: 'count', kind: 'number', values: ['0'], optional: false }]
```

Each parameter is reported once, in the order the message first names it, and says what every expression naming it says together. `name` is the payload key, arbitrary text rather than an identifier, so whatever writes it down quotes it. `kind` is what the function annotating the expression narrows the value to:

| Expression | `kind` |
| --- | --- |
| `{$value}` | `'unknown'` |
| `{$value :number}`, `:integer`, `:offset`, `:currency`, `:percent`, `:unit` | `'number'` |
| `{$value :string}` | `'string'` |
| `{$value :date}`, `:datetime`, `:time` | `'date'` - a `Date` or milliseconds since the epoch |
| `{$value :custom}` | `'unknown'` - a function the specification does not define narrows nothing |
| `minimumFractionDigits=$digits`, `{#b class=$cls}` | `'unknown'` - an option is the function's, or the markup's, to read |

A parameter several expressions name accepts what all of them say together, and `unknown` is the top of that lattice rather than a member of it: it is what a parameter accepts while nothing has narrowed it, and it drops out the moment something does. So `{$value}` alone reports `unknown`, while `{$value} of {$value :number}` reports `'number'`.

A declaration names a parameter too. `.input {$count :integer}` annotates `count` for the whole message; `.local $total = {$price :number}` is the message's own variable, never reported, but `price`, which its expression reads, is - with the kind the local's function gives it, wherever the local is used. A selector names its parameter outright, through a local where it is declared as one. `values` lists the variant keys of a `:string` selector and the exact numeric keys of a numeric one, which are the keys that are values of the parameter - `one`/`few`/`other` are categories the locale decides for a number the caller does not choose, and `*` is the catch-all rather than a value. It is a hint and never a closed set: a value none of them matches takes the `*` variant rather than failing.

`optional` reports a parameter every expression naming it puts inside a variant, since only some variants of the message use it, and `when` names those variants - one `{ param, branch }` per selector, `branch` being the key or `*` - so a generator can emit a discriminated payload instead of the flat approximation. Named outside every variant once, in a declaration, as a selector or in a pattern message, the parameter is expected outright.

Build the extractor from the same options `parser()` is built from, for symmetry: the syntax is the specification's and a custom function narrows nothing, so no option changes what a message names. `onReport` is not among them - extraction reports nothing.

Only the text of a message is scanned. A translation leaf that is not text names no parameters rather than throwing, and neither does a message this parser cannot compile.

## Examples

### Complete Multi-page App

```typescript
// src/lib/translations/index.ts
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-mf2';
import type { Config } from '@sveltekit-i18n/parser-mf2';

const config: Config = {
  parser: parser({ onReport: null }),
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    {
      locale: 'en',
      key: 'home',
      routes: ['/'],
      loader: async () => (await import('./en/home.json')).default,
    },
    {
      locale: 'cs',
      key: 'common',
      loader: async () => (await import('./cs/common.json')).default,
    },
    {
      locale: 'cs',
      key: 'home',
      routes: ['/'],
      loader: async () => (await import('./cs/home.json')).default,
    },
  ],
};

export const i18n = new I18n(config);
```

```json
// src/lib/translations/en/common.json
{
  "app.name": "My App",
  "nav.home": "Home",
  "nav.about": "About",
  "items": ".input {$count :integer}\n.match $count\n0 {{You have no items.}}\none {{You have one item.}}\n* {{You have {$count} items.}}"
}
```

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { i18n } from '$lib/translations';

  let cartItems = 3;
</script>

<h1>{i18n.t('common.app.name')}</h1>
<p>Current locale: {i18n.locale}</p>
<p>{i18n.t('common.items', { count: cartItems })}</p>
```

## Comparison

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
  "items": "{{count; 0:no items; 1:one item; default:{{count}} items;}}"
}
```

All three achieve the same result. MessageFormat 2 is the Unicode standard's current format, ICU the one it succeeds, and Curly the smallest of the three; choose based on your preference and requirements.

## More Resources

- 📖 [Unicode MessageFormat 2](https://unicode.org/reports/tr35/tr35-messageFormat.html) – The specification
- 📚 [messageformat](https://github.com/messageformat/messageformat) – The reference implementation
- 🌐 [sveltekit-i18n.github.io](https://sveltekit-i18n.github.io) – The documentation site, with a live playground
- 🎨 [All Parsers](https://github.com/sveltekit-i18n/parsers) – Parser overview
- 💡 [Examples](https://github.com/sveltekit-i18n/lib/tree/master/examples) – Working examples
- 📋 [Changelog](./CHANGELOG.md) – Version history

## Issues

If you're facing issues with this parser, create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).

## Sponsor

You can support the maintenance of this package through
[GitHub Sponsors](https://github.com/sponsors/sveltekit-i18n).

## License

MIT
