# Parsers

Message parsers for [sveltekit-i18n](https://github.com/sveltekit-i18n/lib). These parsers handle the interpolation of dynamic values in your translations. While designed for [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base), they can be used with any library – they don't require [Svelte](https://github.com/sveltejs/svelte) or [SvelteKit](https://github.com/sveltejs/kit).

## Available Parsers

### [@sveltekit-i18n/parser-curly](./parser-curly)

The [Curly Message Format](https://curlymessage.dev) — placeholders, defaults, modifiers and comparisons in double curly braces — resolved by [`@curly-message/parser`](https://github.com/curly-message/parsers), the format's reference implementation.

```bash
npm install @sveltekit-i18n/parser-curly
```

**Features:**
- Simple placeholder syntax: `{{name}}`
- Built-in modifiers: `number`, `date`, `currency`, `ago`
- Conditional rendering: `{{count; 1:item; default:items;}}`
- Comparison operators: `eq`, `ne`, `lt`, `gt`, `lte`, `gte`
- Custom modifiers support
- Build-time parameter extraction: `extractParamsFactory`
- One dependency: the format's reference implementation

**Example:**
```json
{
  "greeting": "Hello, {{name}}!",
  "items": "You have {{count:number;}} {{count; 1:item; default:items;}}.",
  "price": "Price: {{value:currency;}}",
  "updated": "Updated {{date:ago;}}"
}
```

[📖 Full documentation](./parser-curly/README.md)

### [@sveltekit-i18n/parser-icu](./parser-icu)

ICU message format parser powered by [`intl-messageformat`](https://www.npmjs.com/package/intl-messageformat).

```bash
npm install @sveltekit-i18n/parser-icu
```

**Features:**
- Industry-standard [ICU message syntax](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
- Plural rules: `{count, plural, one {# item} other {# items}}`
- Select format: `{gender, select, male {He} female {She} other {They}}`
- Number formatting: `{price, number, ::currency/USD}`
- Date/time formatting: `{date, date, ::yyyyMMdd}`
- Build-time parameter extraction: `extractParamsFactory`

**Example:**
```json
{
  "greeting": "Hello, {name}!",
  "items": "You have {count, plural, =0 {no items} one {# item} other {# items}}.",
  "response": "{gender, select, male {He} female {She} other {They}} will respond shortly."
}
```

[📖 Full documentation](./parser-icu/README.md)

### [@sveltekit-i18n/parser-mf2](./parser-mf2)

[Unicode MessageFormat 2](https://unicode.org/reports/tr35/tr35-messageFormat.html) parser powered by [`messageformat`](https://github.com/messageformat/messageformat), the format's reference implementation.

```bash
npm install @sveltekit-i18n/parser-mf2
```

**Features:**
- The Unicode standard's successor to ICU MessageFormat
- Variables and functions: `{$count :integer}`, `{$price :currency currency=USD}`
- Declarations: `.input {$count :integer}`, `.local $total = {$price :number}`
- Selection with plural categories and exact matches: `.match $count` / `0 {{None}}` / `one {{One}}` / `* {{{$count}}}`
- Date, time, currency, percent and unit formatting out of the box
- Build-time parameter extraction: `extractParamsFactory`
### [@sveltekit-i18n/parser-i18next](./parser-i18next)

The [i18next](https://www.i18next.com) interpolation and formatting syntax, for translation files that already exist in it — an adapter over `i18next` itself, so a message renders as it did there.

```bash
npm install @sveltekit-i18n/parser-i18next
```

**Features:**
- i18next placeholders: `{{name}}`, `{{- html}}`, `{{user.name}}`
- Built-in formats with their argument syntax: `{{n, currency(USD)}}`, `{{d, datetime(dateStyle: long)}}`
- Per-call `formatParams` and custom formats
- i18next's own `interpolation` options and `missingInterpolationHandler`
- Build-time parameter extraction: `extractParamsFactory`
- One dependency: `i18next` itself, about 44 kB minified

**Example:**
```json
{
  "greeting": "Hello, {$name}!",
  "items": ".input {$count :integer}\n.match $count\n0 {{You have no items.}}\none {{You have one item.}}\n* {{You have {$count} items.}}",
  "response": ".input {$gender :string}\n.match $gender\nmale {{He will respond shortly.}}\nfemale {{She will respond shortly.}}\n* {{They will respond shortly.}}"
}
```

[📖 Full documentation](./parser-mf2/README.md)
  "greeting": "Hi {{name}}!",
  "price": "{{amount, currency(USD)}}",
  "updated": "{{days, relativetime}}",
  "guests": "{{names, list}}"
}
```

[📖 Full documentation](./parser-i18next/README.md)

## Choosing a Parser

### Use `parser-curly` if:
- You want a small, specified syntax with a conformance set behind it
- You need a lightweight solution
- You prefer simple, readable syntax
- You want to create custom modifiers easily
- Your translation needs are straightforward

### Use `parser-icu` if:
- You need industry-standard ICU message format
- You're migrating from other i18n libraries that use ICU
- You need advanced plural rules for complex languages
- You want built-in number/date/time formatting options
- You're comfortable with ICU syntax

### Use `parser-mf2` if:
- You want the Unicode standard's current message format, MessageFormat 2
- You need selection on several values at once, or a value declared once and formatted in one place
- You want number, date, time, currency, percent and unit formatting stated inside the message
- You want a message format that other tooling, in other languages, reads too
### Use `parser-i18next` if:
- Your translation files are already written for i18next
- You want i18next's own engine rendering them, so nothing changes on the way
- You need its built-in `number`, `currency`, `datetime`, `relativetime` and `list` formats
- A dependency of about 44 kB is a fair price for not rewriting a catalogue

## Using Parsers

### With sveltekit-i18n

The main `sveltekit-i18n` package includes `parser-curly` by default:

```javascript
import { I18n } from 'sveltekit-i18n';

const config = {
  // parser-curly is already included
  loaders: [/* ... */],
};

export const i18n = new I18n(config);
```

### With @sveltekit-i18n/base

Use any parser with the base package:

```javascript
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-curly';
// or: import parser from '@sveltekit-i18n/parser-icu';
// or: import parser from '@sveltekit-i18n/parser-mf2';
// or: import parser from '@sveltekit-i18n/parser-i18next';

const config = {
  parser: parser({
    // parser-specific options
  }),
  loaders: [/* ... */],
};

export const i18n = new I18n(config);
```

## Creating Custom Parsers

You can create your own parser to support any message syntax you need.

### Basic Structure

A parser is a function that returns an object with a `parse` method. What base guarantees before it calls `parse`, and what it requires back, is the [parser contract](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#the-parser-contract); this repository keeps it as a set of checks in [`contract/`](./contract) that every shipped parser runs against itself:

```javascript
const customParser = (config = {}) => ({
  parse: (value, params, locale, key) => {
    // value: translation string from your JSON file
    // params: array of parameters passed to t()
    // locale: current locale (e.g., 'en', 'cs')
    // key: translation key (e.g., 'common.greeting')
    
    // Return interpolated string
    return value;
  },
});
```

### Example: Simple Template Literals

```javascript
const templateParser = () => ({
  parse: (value, params) => {
    const vars = params[0] || {};
    return value.replace(/\${(\w+)}/g, (_, key) => vars[key] ?? key);
  },
});

// Usage in translations:
// { "greeting": "Hello, ${name}!" }
```

### Example: Mustache-style Syntax

```javascript
const mustacheParser = () => ({
  parse: (value, params) => {
    const vars = params[0] || {};
    return value.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
  },
});

// Usage in translations:
// { "greeting": "Hello, {{name}}!" }
```

### Example: Advanced with Modifiers

```javascript
const advancedParser = (config = {}) => ({
  parse: (value, params, locale) => {
    const vars = params[0] || {};
    
    return value.replace(/\{(\w+)(?::(\w+))?\}/g, (match, key, modifier) => {
      const val = vars[key];
      
      if (modifier === 'upper') return String(val).toUpperCase();
      if (modifier === 'lower') return String(val).toLowerCase();
      if (modifier === 'number') return new Intl.NumberFormat(locale).format(val);
      
      return val ?? key;
    });
  },
});

// Usage in translations:
// { "greeting": "Hello, {name:upper}!", "count": "{value:number}" }
```

### Using Your Custom Parser

```javascript
import { I18n } from '@sveltekit-i18n/base';
import customParser from './custom-parser';

const config = {
  parser: customParser(),
  loaders: [/* ... */],
};

export const i18n = new I18n(config);
```

## Parser Configuration

Each parser accepts its own configuration options. Check the specific parser documentation:

- [parser-curly options](./parser-curly/README.md#options)
- [parser-icu options](./parser-icu/README.md#usage)
- [parser-mf2 options](./parser-mf2/README.md#parser-options)
- [parser-i18next options](./parser-i18next/README.md#options)

## Documentation

- 🌐 [sveltekit-i18n.github.io](https://sveltekit-i18n.github.io) – The documentation site, with a live playground
- 📖 [Complete Documentation Index](https://github.com/sveltekit-i18n/lib/tree/master/docs/INDEX.md) – All guides and references
- 🚀 [Getting Started](https://github.com/sveltekit-i18n/lib/tree/master/docs/GETTING_STARTED.md) – Quick tutorial
- 📚 [Best Practices](https://github.com/sveltekit-i18n/lib/tree/master/docs/BEST_PRACTICES.md) – Production patterns

## TypeScript Support

All official parsers include full TypeScript support:

```typescript
import parser from '@sveltekit-i18n/parser-curly';
import type { Config } from '@sveltekit-i18n/parser-curly';

const config: Config = {
  parser: parser({
    // typed options
  }),
  loaders: [/* ... */],
};
```

## Contributing

For general contribution guidelines, see the [Contributing Guide](https://github.com/sveltekit-i18n/lib/blob/master/CONTRIBUTING.md).

For parser-specific contributions and issues, use this repository's [issues](https://github.com/sveltekit-i18n/parsers/issues).

## Sponsor

You can support the maintenance of these packages through
[GitHub Sponsors](https://github.com/sponsors/sveltekit-i18n).

## License

MIT
