[![npm version](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-icu.svg)](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-icu) [![Tests](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-icu.yml/badge.svg)](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-icu.yml)

# @sveltekit-i18n/parser-icu

ICU message format parser for [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base), powered by [`intl-messageformat`](https://www.npmjs.com/package/intl-messageformat). This brings industry-standard [ICU message syntax](https://unicode-org.github.io/icu/userguide/format_parse/messages/) to your SvelteKit applications.

## Features

- 🌍 **Industry standard** – ICU message format used worldwide
- 📐 **Advanced plurals** – Complex plural rules for any language
- 🎯 **Select format** – Gender and other categorical selections
- 🔢 **Number formatting** – Locale-aware number display
- 📅 **Date/time formatting** – Full internationalization support
- 🔧 **Flexible** – Rich formatting options
- 🧩 **Build-time extraction** – Read a catalogue for the parameters its messages name
- 📝 **TypeScript** – Full type support

## Installation

```bash
npm install @sveltekit-i18n/parser-icu
# bun add @sveltekit-i18n/parser-icu
# deno add npm:@sveltekit-i18n/parser-icu
```

**Note:** This parser has external dependencies (`intl-messageformat` and `@formatjs/icu-messageformat-parser`) which are installed automatically.

**Requirements:** Node.js 22, Bun 1.2 or Deno 2, or newer. Version 3 is ESM-only, expects [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) v3 as a peer dependency, and builds on `intl-messageformat` v11. The examples use base 3.1: its loader spelling - `namespace`, and one descriptor listing several locales - and its `@sveltekit-i18n/base/kit` subpath. On base 3.0 write `key` and one descriptor per locale, whose loader names its own file, since 3.0 passes it no `namespace`: `{ locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default }`.

## Usage

### Basic Setup

```typescript
// src/lib/translations/index.ts
import { defineI18n } from '@sveltekit-i18n/base/kit';
import parser from '@sveltekit-i18n/parser-icu';
import type { Config } from '@sveltekit-i18n/parser-icu';

export const config: Config = {
  parser: parser({
    // Where a diagnostic goes; required, `null` included
    onReport: (report) => console.warn(report.message, report.error),
    // Optional: Intl.MessageFormat options
    // See: https://formatjs.io/docs/intl-messageformat/
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

Outside SvelteKit, `new I18n(config)` from `@sveltekit-i18n/base` builds the instance directly.

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

## ICU Message Syntax

### Simple Messages

Basic text with simple placeholders:

```json
{
  "greeting": "Hello, {name}!",
  "welcome": "Welcome to {appName}."
}
```

```javascript
i18n.t('greeting', { name: 'Alice' })
// → "Hello, Alice!"
```

### Plural Format

Handle pluralization with proper grammar:

```json
{
  "items": "You have {count, plural, =0 {no items} one {# item} other {# items}}.",
  "photos": "{count, plural, =0 {No photos.} =1 {One photo.} other {# photos.}}"
}
```

```javascript
i18n.t('items', { count: 0 })
// → "You have no items."

i18n.t('items', { count: 1 })
// → "You have 1 item."

i18n.t('items', { count: 5 })
// → "You have 5 items."
```

**Plural categories:** `zero`, `one`, `two`, `few`, `many`, `other`

Use `#` to display the actual number, or `=N` for exact matches.

### Select Format

Choose text based on a value (like gender):

```json
{
  "response": "{gender, select, male {He} female {She} other {They}} will respond shortly.",
  "role": "{role, select, admin {Administrator} user {User} guest {Guest} other {Unknown}}",
  "status": "{status, select, active {✓ Active} inactive {✗ Inactive} other {? Unknown}}"
}
```

```javascript
i18n.t('response', { gender: 'female' })
// → "She will respond shortly."

i18n.t('role', { role: 'admin' })
// → "Administrator"
```

### SelectOrdinal Format

For ordinal numbers (1st, 2nd, 3rd, etc.):

```json
{
  "birthday": "It's my cat's {count, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} birthday!",
  "place": "You finished {position, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}!"
}
```

```javascript
i18n.t('birthday', { count: 1 })
// → "It's my cat's 1st birthday!"

i18n.t('birthday', { count: 3 })
// → "It's my cat's 3rd birthday!"

i18n.t('place', { position: 22 })
// → "You finished 22nd!"
```

### Number Formatting

Format numbers according to locale:

```json
{
  "price": "The price is: {value, number}",
  "currency": "Total: {amount, number, ::currency/USD}",
  "percent": "Discount: {value, number, ::percent}",
  "compact": "Population: {count, number, ::compact-short}"
}
```

```javascript
i18n.t('price', { value: 1234.56 })
// → "The price is: 1,234.56" (en) or "The price is: 1 234,56" (cs, grouped by a no-break space)

i18n.t('currency', { amount: 99.99 })
// → "Total: $99.99"

i18n.t('percent', { value: 0.15 })
// → "Discount: 15%"

i18n.t('compact', { count: 1500000 })
// → "Population: 1.5M"
```

### Date and Time Formatting

Format dates according to locale:

```json
{
  "today": "Today is: {date, date}",
  "full": "Date: {date, date, ::yyyyMMdd}",
  "time": "Time: {timestamp, time, ::HHmm}",
  "datetime": "Last seen: {value, date, ::MMMddyyyy} at {value, time, ::HHmmss}"
}
```

```javascript
i18n.t('today', { date: new Date() })
// → "Today is: 1/15/2024" (en) or "Today is: 15. 1. 2024" (cs)

i18n.t('full', { date: new Date(2024, 0, 15) })
// → "Date: 01/15/2024" (en) or "Date: 15. 01. 2024" (cs)
// A skeleton picks the fields; the locale orders and separates them.

i18n.t('time', { timestamp: new Date(2024, 0, 15, 14, 30) })
// → "Time: 14:30" (HH asks for a 24-hour clock)
```

### Nested Messages

Combine multiple formats:

```json
{
  "notification": "{count, plural, =0 {No new messages} one {One new message from {sender}} other {# new messages, latest from {sender}}}",
  "cart": "Your cart has {items, plural, =0 {no items} one {# item} other {# items}} totaling {total, number, ::currency/USD}"
}
```

```javascript
i18n.t('notification', { count: 1, sender: 'Alice' })
// → "One new message from Alice"

i18n.t('notification', { count: 5, sender: 'Bob' })
// → "5 new messages, latest from Bob"

i18n.t('cart', { items: 3, total: 149.97 })
// → "Your cart has 3 items totaling $149.97"
```

## Parser Options

Configure the parser with Intl.MessageFormat options, plus `onReport`:

```typescript
import parser from '@sveltekit-i18n/parser-icu';

const config = {
  parser: parser({
    onReport: (report) => console.warn(report.message, report.error),
    // Optional MessageFormat options
    ignoreTag: false,
    captureLocation: false,
    // See: https://formatjs.io/docs/intl-messageformat/#intlmessageformat-constructor
  }),
};
```

`onReport` is required, `null` included: this package writes to no channel of its own, so where a diagnostic goes is stated by whoever builds the parser. Pass `null` to discard reports.

A report carries `code`, the `key` and `locale` the call was made for, a one-sentence `message`, and the `error` the formatter threw where there was one:

| `code` | When |
| --- | --- |
| `failed-message` | The message could not be compiled (malformed ICU syntax) or formatted (a payload variable is missing). The raw message is returned; a leaf that is not text and cannot become any renders as the empty string. |
| `unserializable-output` | A payload value, or a tag callback, yielded something the message could not be rendered into text with. The pieces are joined and something is lost on the way. |

## Format Options

The third parameter of `i18n.t()` defines named formats for the call, as `intl-messageformat`'s `formats` (`Partial<Formats>`): `Intl` options under a style name, per `number`, `date` and `time`. A message names the style in its placeholder:

```json
{
  "price": "The price is: {value, number, twoDecimals}",
  "published": "Published: {value, date, verbose}"
}
```

```svelte
<script>
  import { get } from '$lib/translations';

  const i18n = get();
</script>

<!-- Number formatting -->
<p>{i18n.t('price', { value: 1234.5 }, {
  number: {
    twoDecimals: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  },
})}</p>
<!-- → "The price is: 1,234.50" -->

<!-- Date formatting -->
<p>{i18n.t('published', { value: new Date(2024, 0, 15) }, {
  date: {
    verbose: { year: 'numeric', month: 'long', day: 'numeric' },
  },
})}</p>
<!-- → "Published: January 15, 2024" -->
```

A style the call does not define falls back to the ones `intl-messageformat` ships (`short`, `medium`, `long` and `full` for dates and times, `integer`, `currency` and `percent` for numbers).

## Caching and Error Handling

Compiled messages are cached per parser instance (least-recently-used, up to 10,000 entries keyed by locale and message), so repeated reads of the same message skip recompilation. Calls that pass per-call [format options](#format-options) bypass the cache, because those options change the compilation.

Every message the parser formats, per-call `formats` included, draws on one set of `Intl` formatters kept per parser instance: one per locale and options, up to 10,000 of each kind, the oldest making room. A per-call style whose options are not plain data (an option inherited from a prototype, or read through a getter) is built for the call instead, so it always shows what it reads. A `formatters` set in the parser options replaces the kept set and is used as it is. A kept formatter goes on showing what the host's `Intl` had when it was built, its locale data and its default time zone: on a host whose default zone changes while it runs (Node with `process.env.TZ` set at runtime), a date or time that names no `timeZone` keeps the zone it was first formatted in.

A key naming no message is nothing to format and yields the empty string; what a missing translation renders as is [`fallbackValue`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#fallbackvalue), which base answers before this parser is called.

If a message cannot be compiled (malformed ICU syntax) or formatted (for example, a payload variable is missing), the parser does not throw. It reports the failure through [`onReport`](#parser-options) and returns the raw message, so one broken translation cannot crash your page. A report channel that throws is contained too.

`parse` always returns a string. `IntlMessageFormat.format()` yields the message in pieces as soon as a value it interpolates is not text - an object in the payload, or a tag callback returning one - and this parser joins them, reporting `unserializable-output`. Rich, non-string output belongs to a parser that declares it (base admits one) or to an extension that renders parts; it is not what this parser promises.

## TypeScript Support

Full TypeScript support with complete type definitions:

```typescript
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';
import type { Config } from '@sveltekit-i18n/parser-icu';

const config: Config = {
  parser: parser({ onReport: null }),
  loaders: [/* ... */],
};

const i18n = new I18n(config);
```

All ICU message format options and configurations are fully typed. Translation keys and their payloads are typed by [`config.schema`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#schema), which [`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen) fills from your catalogue through this parser's extractor - see [Extracting Parameters](#extracting-parameters).

## Extracting Parameters

What a message expects of its payload is fixed when the message is written, so a catalogue can be read for its parameters instead of them being discovered at render time. `extractParamsFactory` is the build-time half of the base parser contract, a named export beside the default one: a message scanner is of no use while rendering, so the package declares `sideEffects: false` and a bundle that never reaches it drops it.

```typescript
import { extractParamsFactory } from '@sveltekit-i18n/parser-icu';

const extractParams = extractParamsFactory();

extractParams('You have {count, plural, =0 {no photos} other {# photos}}.');
// -> [{ name: 'count', kind: 'number', values: ['0'], optional: false }]
```

Each parameter is reported once, in the order the message first names it, and says what every placeholder naming it says together. `name` is the payload key, arbitrary text rather than an identifier, so whatever writes it down quotes it. `kind` is what the placeholder's format narrows the value to:

| Placeholder | `kind` |
| --- | --- |
| `{value}` | `'unknown'` |
| `{value, number, ...}` | `'number'` |
| `{value, date, ...}`, `{value, time, ...}` | `'date'` - a `Date` or milliseconds since the epoch |
| `{value, select, ...}` | `'string'` |
| `{value, plural, ...}`, `{value, selectordinal, ...}` | `'number'` |
| `<value>...</value>` | `'function'` - the callback the payload carries for the tag |

A parameter several placeholders name accepts what all of them say together, and `unknown` is the top of that lattice rather than a member of it: it is what a parameter accepts while nothing has narrowed it, and it drops out the moment something does. So `{value}` alone reports `unknown`, while `{value} of {value, number}` reports `'number'`.

`values` lists a `select`'s option keys and a plural's exact matches (`=0`, `=1`), which are the option keys that are values of the parameter - a plural's `one`/`few`/`other` are categories the locale decides for a number the caller does not choose, and `other` is a fallback branch rather than a value. It is a hint and never a closed set: a value none of them matches takes the `other` branch rather than failing.

`optional` reports a parameter every placeholder naming it puts inside a selector branch, since only some branches of the message use it, and `when` names those branches outermost first so a generator can emit a discriminated payload instead of the flat approximation. Named outside every branch once, the parameter is expected outright.

Build the extractor from the same options `parser()` is built from: an option that changes what a message means changes what it names. `ignoreTag: true` turns `<b>text</b>` into literal text, and the callback the payload carried for it is gone. `formatters` reaches nothing here - extraction formats nothing.

Only the text of a message is scanned. A translation leaf that is not text names no parameters rather than throwing, and neither does a message this parser cannot compile.

This is what types `t` and `l` by key and payload: [`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen), a Vite plugin, runs the config the module it is pointed at exports as `config`, reads every message through the extractor and writes the schema, which it registers for every config that states no [`schema`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#schema) of its own, so on base 3.1 there is nothing to wire ([an older core](https://github.com/sveltekit-i18n/typegen#3-nothing-to-wire-on-a-31-core) takes a cast). It is told which package the extractor comes from and the options the parser is built with:

```javascript
// vite.config.js
typegen({
  config: 'src/lib/translations/index.ts',
  extractParams: { from: '@sveltekit-i18n/parser-icu', options: { ignoreTag: true } },
})
```

The plugin hands `options` to the factory as JSON, so only data reaches the extractor: `formatters` cannot be passed, and it changes nothing extraction reports.

## Examples

### Complete Multi-page App

```typescript
// src/lib/translations/index.ts
import { defineI18n } from '@sveltekit-i18n/base/kit';
import parser from '@sveltekit-i18n/parser-icu';
import type { Config } from '@sveltekit-i18n/parser-icu';

export const config: Config = {
  parser: parser({ onReport: null }),
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

```json
// src/lib/translations/en/common.json
{
  "app.name": "My App",
  "nav.home": "Home",
  "nav.about": "About",
  "items": "You have {count, plural, =0 {no items} one {# item} other {# items}}."
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

## When to Use ICU Parser

### Use parser-icu if:
- ✅ You need industry-standard ICU message format
- ✅ You're migrating from other i18n libraries (react-intl, vue-i18n, etc.)
- ✅ You want comprehensive number/date/time formatting
- ✅ You're comfortable with ICU syntax

### Use parser-curly if:
- ✅ You want one small dependency: the format's reference implementation
- ✅ You prefer simpler, more readable syntax
- ✅ You need a lightweight solution
- ✅ Plural and ordinal selection by CLDR category is all the selection you need

## Comparison

**ICU (parser-icu):**
```json
{
  "items": "You have {count, plural, =0 {no items} one {# item} other {# items}}."
}
```

**Curly (parser-curly):**
```json
{
  "items": "You have {{count:plural; 0:no items; one:{{count:number}} item; other:{{count:number}} items;}}."
}
```

Both select by the locale's plural categories. ICU's `other` catches every category a message leaves out, while a Curly message writes each category its locale uses. Choose based on your preference and requirements.

## More Resources

- 📖 [ICU Message Format Guide](https://unicode-org.github.io/icu/userguide/format_parse/messages/) – Official ICU documentation
- 📚 [FormatJS Documentation](https://formatjs.io/docs/intl-messageformat/) – intl-messageformat docs
- 🌐 [sveltekit-i18n.github.io](https://sveltekit-i18n.github.io) – The documentation site, with a live playground
- 🎨 [All Parsers](https://github.com/sveltekit-i18n/parsers) – Parser overview
- 💡 [Examples](https://github.com/sveltekit-i18n/lib/tree/master/examples) – Working examples
- 📋 [Changelog](https://github.com/sveltekit-i18n/parsers/blob/master/parser-icu/CHANGELOG.md) – Version history

## Issues

If you're facing issues with this parser, create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).

## Sponsor

You can support the maintenance of this package through
[GitHub Sponsors](https://github.com/sponsors/sveltekit-i18n).

## License

MIT
