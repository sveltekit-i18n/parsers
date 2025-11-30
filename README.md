# Parsers

Message parsers for [sveltekit-i18n](https://github.com/sveltekit-i18n/lib). These parsers handle the interpolation of dynamic values in your translations. While designed for [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base), they can be used with any library – they don't require [Svelte](https://github.com/sveltejs/svelte) or [SvelteKit](https://github.com/sveltejs/kit).

## Available Parsers

### [@sveltekit-i18n/parser-default](./parser-default)

The default parser with a simple, flexible syntax for placeholders and modifiers.

```bash
npm install @sveltekit-i18n/parser-default
```

**Features:**
- Simple placeholder syntax: `{{name}}`
- Built-in modifiers: `number`, `date`, `currency`, `ago`
- Conditional rendering: `{{count; 1:item; default:items;}}`
- Comparison operators: `eq`, `ne`, `lt`, `gt`, `lte`, `gte`
- Custom modifiers support
- No external dependencies

**Example:**
```json
{
  "greeting": "Hello, {{name}}!",
  "items": "You have {{count:number;}} {{count; 1:item; default:items;}}.",
  "price": "Price: {{value:currency;}}",
  "updated": "Updated {{date:ago;}}"
}
```

[📖 Full documentation](./parser-default/README.md)

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

**Example:**
```json
{
  "greeting": "Hello, {name}!",
  "items": "You have {count, plural, =0 {no items} one {# item} other {# items}}.",
  "response": "{gender, select, male {He} female {She} other {They}} will respond shortly."
}
```

[📖 Full documentation](./parser-icu/README.md)

## Choosing a Parser

### Use `parser-default` if:
- You want no external dependencies
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

## Using Parsers

### With sveltekit-i18n

The main `sveltekit-i18n` package includes `parser-default` by default:

```javascript
import i18n from 'sveltekit-i18n';

const config = {
  // parser-default is already included
  loaders: [/* ... */],
};
```

### With @sveltekit-i18n/base

Use any parser with the base package:

```javascript
import i18n from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-default';
// or: import parser from '@sveltekit-i18n/parser-icu';

const config = {
  parser: parser({
    // parser-specific options
  }),
  loaders: [/* ... */],
};
```

## Creating Custom Parsers

You can create your own parser to support any message syntax you need.

### Basic Structure

A parser is a function that returns an object with a `parse` method:

```javascript
const customParser = (config = {}) => ({
  parse: (value, params, locale, key) => {
    // value: translation string from your JSON file
    // params: array of parameters passed to $t()
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
import i18n from '@sveltekit-i18n/base';
import customParser from './custom-parser';

const config = {
  parser: customParser(),
  loaders: [/* ... */],
};

export const { t } = new i18n(config);
```

## Parser Configuration

Each parser accepts its own configuration options. Check the specific parser documentation:

- [parser-default options](./parser-default/README.md#options)
- [parser-icu options](./parser-icu/README.md#usage)

## Documentation

- 📖 [Complete Documentation Index](https://github.com/sveltekit-i18n/lib/tree/master/docs/INDEX.md) – All guides and references
- 🚀 [Getting Started](https://github.com/sveltekit-i18n/lib/tree/master/docs/GETTING_STARTED.md) – Quick tutorial
- 📚 [Best Practices](https://github.com/sveltekit-i18n/lib/tree/master/docs/BEST_PRACTICES.md) – Production patterns

## Examples

See working examples of different parsers:

- [parser-default example](https://github.com/sveltekit-i18n/lib/tree/master/examples/parser-default) – [Live demo](https://parser-default.netlify.app)
- [parser-icu example](https://github.com/sveltekit-i18n/lib/tree/master/examples/parser-icu) – [Live demo](https://parser-icu.netlify.app)

## TypeScript Support

Both official parsers include full TypeScript support:

```typescript
import i18n from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-default';
import type { Config } from '@sveltekit-i18n/parser-default';

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

## License

MIT
