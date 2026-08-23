[![npm version](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-icu.svg)](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-icu) [![Tests](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-icu.yml/badge.svg)](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-icu.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/cd425de0-b200-4a6a-8ab6-68cf34b8b6c7/deploy-status)](https://app.netlify.com/sites/parser-icu/deploys)

# @sveltekit-i18n/parser-icu

ICU message format parser for [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base), powered by [`intl-messageformat`](https://www.npmjs.com/package/intl-messageformat). This brings industry-standard [ICU message syntax](https://unicode-org.github.io/icu/userguide/format_parse/messages/) to your SvelteKit applications.

**[Live Demo](https://parser-icu.netlify.app)** – See it in action

## Features

- 🌍 **Industry standard** – ICU message format used worldwide
- 📐 **Advanced plurals** – Complex plural rules for any language
- 🎯 **Select format** – Gender and other categorical selections
- 🔢 **Number formatting** – Locale-aware number display
- 📅 **Date/time formatting** – Full internationalization support
- 🔧 **Flexible** – Rich formatting options
- 📝 **TypeScript** – Full type support

## Installation

```bash
npm install @sveltekit-i18n/parser-icu
```

**Note:** This parser has an external dependency (`intl-messageformat`) which is installed automatically.

**Requirements:** Node.js 22 or newer. Version 3 is ESM-only, expects [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) v3 as a peer dependency, and builds on `intl-messageformat` v11.

## Usage

### Basic Setup

```typescript
// src/lib/translations/index.ts
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';
import type { Config } from '@sveltekit-i18n/parser-icu';

const config: Config = {
  parser: parser({
    // Optional: Intl.MessageFormat options
    // See: https://formatjs.io/docs/intl-messageformat/
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
// → "The price is: 1,234.56" (en) or "1.234,56" (cs)

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
// → "Today is: 1/15/2024" (en) or "15. 1. 2024" (cs)

i18n.t('full', { date: new Date('2024-01-15') })
// → "Date: 20240115"

i18n.t('time', { timestamp: new Date() })
// → "Time: 1430" (2:30 PM)
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

Configure the parser with Intl.MessageFormat options:

```typescript
import parser from '@sveltekit-i18n/parser-icu';

const config = {
  parser: parser({
    // Optional MessageFormat options
    ignoreTag: false,
    captureLocation: false,
    // See: https://formatjs.io/docs/intl-messageformat/#intlmessageformat-constructor
  }),
};
```

## Format Options

Pass formatting options as the third parameter to `i18n.t()`:

```svelte
<script>
  import { i18n } from '$lib/translations';
</script>

<!-- Number formatting -->
<p>{i18n.t('price', { value: 1234.56 }, {
  number: {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }
})}</p>

<!-- Date formatting -->
<p>{i18n.t('date', { value: new Date() }, {
  date: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
})}</p>
```

## Caching and Error Handling

Compiled messages are cached per parser instance (least-recently-used, up to 10,000 entries keyed by locale and message), so repeated reads of the same message skip recompilation. Calls that pass per-call [format options](#format-options) bypass the cache, because those options change the compilation.

If a message cannot be compiled (malformed ICU syntax) or formatted (for example, a payload variable is missing), the parser does not throw. It logs a warning through `console.warn` and returns the raw message, so one broken translation cannot crash your page.

## TypeScript Support

Full TypeScript support with complete type definitions:

```typescript
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';
import type { Config } from '@sveltekit-i18n/parser-icu';

const config: Config = {
  parser: parser(),
  loaders: [/* ... */],
};

const i18n = new I18n(config);
```

All ICU message format options and configurations are fully typed. The library provides type definitions for the parser and configuration, but does not automatically infer translation keys from your JSON files.

## Examples

### Complete Multi-page App

```typescript
// src/lib/translations/index.ts
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';
import type { Config } from '@sveltekit-i18n/parser-icu';

const config: Config = {
  parser: parser(),
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
  "items": "You have {count, plural, =0 {no items} one {# item} other {# items}}."
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

See the [parser-icu example](https://github.com/sveltekit-i18n/lib/tree/master/examples/parser-icu) for a complete working application.

**[Live Demo](https://parser-icu.netlify.app)** – Interactive examples

## When to Use ICU Parser

### Use parser-icu if:
- ✅ You need industry-standard ICU message format
- ✅ You're migrating from other i18n libraries (react-intl, vue-i18n, etc.)
- ✅ You need advanced plural rules for complex languages
- ✅ You want comprehensive number/date/time formatting
- ✅ You're comfortable with ICU syntax

### Use parser-default if:
- ✅ You want zero external dependencies
- ✅ You prefer simpler, more readable syntax
- ✅ You need a lightweight solution
- ✅ Your pluralization needs are basic

## Comparison

**ICU (parser-icu):**
```json
{
  "items": "You have {count, plural, =0 {no items} one {# item} other {# items}}."
}
```

**Default (parser-default):**
```json
{
  "items": "You have {{count}} {{count; 1:item; default:items;}}."
}
```

Both achieve the same result, choose based on your preference and requirements.

## More Resources

- 📖 [ICU Message Format Guide](https://unicode-org.github.io/icu/userguide/format_parse/messages/) – Official ICU documentation
- 📚 [FormatJS Documentation](https://formatjs.io/docs/intl-messageformat/) – intl-messageformat docs
- 🎨 [All Parsers](https://github.com/sveltekit-i18n/parsers) – Parser overview
- 💡 [Examples](https://github.com/sveltekit-i18n/lib/tree/master/examples) – Working examples
- 📋 [Changelog](./CHANGELOG.md) – Version history

## Issues

If you're facing issues with this parser, create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).

## License

MIT
