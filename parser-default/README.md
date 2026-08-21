[![npm version](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-default.svg)](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-default) ![](https://github.com/sveltekit-i18n/parsers/workflows/Tests/badge.svg) [![Tests](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-default.yml/badge.svg)](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-default.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/61a65082-1dc8-4c2a-94f2-0334c005dad0/deploy-status)](https://app.netlify.com/sites/parser-default/deploys)

# @sveltekit-i18n/parser-default

A lightweight, flexible message parser for [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base). This parser supports placeholders, modifiers, and conditional rendering without any external dependencies.

**[Live Demo](https://parser-default.netlify.app)** – See it in action

## Features

- 🎯 **Simple syntax** – Easy-to-read placeholder format
- 🔧 **Built-in modifiers** – Number, date, currency, relative time formatting
- ⚖️ **Comparison operators** – Conditional rendering based on values
- 🎨 **Custom modifiers** – Create your own interpolation logic
- 🪶 **No external dependencies** – Lightweight and fast
- 🔄 **Nested support** – Placeholders and modifiers can be nested
- 📝 **TypeScript** – Full type support

## Installation

```bash
npm install @sveltekit-i18n/parser-default
```

This parser is included by default in [sveltekit-i18n](https://github.com/sveltekit-i18n/lib).

## Usage

### With @sveltekit-i18n/base

```javascript
import i18n from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-default';

const config = {
  parser: parser({
    // optional configuration
  }),
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
  ],
};

export const { t } = new i18n(config);
```

### With sveltekit-i18n

```javascript
import i18n from 'sveltekit-i18n';

const config = {
  // parser-default is already included
  loaders: [/* ... */],
};
```

## Syntax

All placeholders and modifiers are wrapped in double curly braces: `{{...}}`

### Basic Placeholders

Replace a value in your translation:

```json
{
  "greeting": "Hello, {{name}}!",
  "message": "You have {{count}} new messages."
}
```

```javascript
$t('greeting', { name: 'Alice' })
// → "Hello, Alice!"

$t('message', { count: 5 })
// → "You have 5 new messages."
```

### Default Values

Provide a fallback when value is missing:

```json
{
  "welcome": "Welcome, {{name; default:Guest;}}!"
}
```

```javascript
$t('welcome', { name: 'Bob' })
// → "Welcome, Bob!"

$t('welcome', {})
// → "Welcome, Guest!"
```

You can also set dynamic defaults:

```javascript
$t('welcome', { default: $t('common.anonymous') })
// Uses translation from 'common.anonymous' as default
```

> **Note:** `default` is a reserved payload key — it is the fallback for *every*
> placeholder in the message that resolves to no value, and `{{default}}` reads
> that same fallback rather than a placeholder of its own. An inline
> `default:...;` takes precedence over it.

### Modifiers

Modifiers transform values before displaying them.

#### Number Formatting

```json
{
  "price": "Total: {{amount:number;}}",
  "population": "Population: {{count:number;}}"
}
```

```javascript
$t('price', { amount: 1234.56 })
// → "Total: 1,234.56" (locale-dependent)

$t('population', { count: 1000000 })
// → "Population: 1,000,000"
```

#### Date Formatting

```json
{
  "published": "Published: {{date:date;}}",
  "time": "Time: {{timestamp:date;}}"
}
```

```javascript
$t('published', { date: new Date() }, { dateStyle: 'full' })
// → "Published: Monday, January 1, 2024"

$t('time', { timestamp: Date.now() }, { timeStyle: 'short' })
// → "Time: 10:30 AM"
```

#### Relative Time (Ago)

```json
{
  "updated": "Updated {{time:ago;}}",
  "posted": "Posted {{timestamp:ago;}}"
}
```

```javascript
$t('updated', { time: Date.now() - 3600000 })
// → "Updated 1 hour ago"

$t('posted', { timestamp: Date.now() - 86400000 })
// → "Posted 1 day ago"
```

#### Currency

```json
{
  "cost": "Cost: {{amount:currency;}}",
  "total": "Total: {{price:currency;}}"
}
```

```javascript
$t('cost', { amount: 99.99 }, { style: 'currency', currency: 'USD' })
// → "Cost: $99.99"

$t('total', { price: 1299 }, { style: 'currency', currency: 'EUR' })
// → "Total: €1,299.00"
```

### Conditional Rendering

Use modifiers with conditions to render different text based on values.

#### Equality (eq)

```json
{
  "status": "{{state; active:Online; inactive:Offline; default:Unknown;}}"
}
```

```javascript
$t('status', { state: 'active' })
// → "Online"

$t('status', { state: 'inactive' })
// → "Offline"

$t('status', { state: 'pending' })
// → "Unknown"
```

#### Simple Pluralization

```json
{
  "items": "You have {{count}} {{count; 1:item; default:items;}}."
}
```

```javascript
$t('items', { count: 1 })
// → "You have 1 item."

$t('items', { count: 5 })
// → "You have 5 items."
```

#### Comparison Operators

Available operators: `eq`, `ne`, `lt`, `lte`, `gt`, `gte`

```json
{
  "stock": "{{count:gt; 0:In stock ({{count}}); default:Out of stock;}}",
  "age": "{{age:gte; 18:Adult; default:Minor;}}",
  "temp": "{{degrees:lt; 0:Freezing; default:Above freezing;}}"
}
```

```javascript
$t('stock', { count: 5 })
// → "In stock (5)"

$t('stock', { count: 0 })
// → "Out of stock"

$t('age', { age: 25 })
// → "Adult"

$t('temp', { degrees: -5 })
// → "Freezing"
```

### Nested Placeholders

Placeholders and modifiers can be nested:

```json
{
  "notification": "You have {{count:gt; 0:{{count}} new {{count; 1:message; default:messages;}}!; default:no messages.;}}"
}
```

```javascript
$t('notification', { count: 1 })
// → "You have 1 new message!"

$t('notification', { count: 5 })
// → "You have 5 new messages!"

$t('notification', { count: 0 })
// → "You have no messages."
```

> **Note:** Nesting is resolved by re-interpolating the output, up to 10 passes.
> A payload value that references its own placeholder (`{{value}}` resolving to
> `'{{value}}'`) would never settle, and a chain of more than 10 references does
> not resolve in time either. Both stop at the cap, where the parser reports a
> truncated excerpt of the unresolved string through `console.warn` and returns
> that string. A pass whose output would exceed 100 000 characters is likewise
> discarded and reported — a payload value that multiplies its own placeholder
> grows geometrically and would reach hundreds of megabytes within the pass cap.

## Options

Configure the parser with custom defaults and modifiers:

```javascript
import parser from '@sveltekit-i18n/parser-default';

const config = {
  parser: parser({
    modifierDefaults: {
      // Default Intl.NumberFormat options
      number: {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
      // Default Intl.DateTimeFormat options
      date: {
        dateStyle: 'medium',
      },
      // Default Intl.RelativeTimeFormat options
      ago: {
        numeric: 'auto',
        format: 'auto', // time unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year' | 'auto'
      },
      // Default currency options
      currency: {
        style: 'currency',
        currency: 'USD',
        ratio: 1, // conversion ratio
      },
    },
    customModifiers: {
      // Add your own modifiers
    },
  }),
};
```

### Custom Modifiers

Create your own modifiers for specialized formatting:

```javascript
const config = {
  parser: parser({
    customModifiers: {
      // Absolute value equality
      eqAbs: ({ value, options, defaultValue }) => 
        options.find(({ key }) => Math.abs(+key) === Math.abs(+value))?.value || defaultValue,
      
      // Uppercase transform
      upper: ({ value }) => String(value).toUpperCase(),
      
      // Truncate text
      truncate: ({ value, props }) => {
        const maxLength = props?.maxLength || 50;
        return String(value).length > maxLength 
          ? String(value).slice(0, maxLength) + '...'
          : String(value);
      },
    },
  }),
};
```

Use in translations:

```json
{
  "score": "{{value:eqAbs; 10:Perfect score!; default:Not quite.;}}",
  "title": "{{text:upper;}}",
  "description": "{{text:truncate;}}"
}
```

```javascript
$t('score', { value: -10 })
// → "Perfect score!"

$t('title', { text: 'hello world' })
// → "HELLO WORLD"

$t('description', { text: 'Very long text...' }, { maxLength: 20 })
// → "Very long text......"
```

## TypeScript

Full TypeScript support with complete type definitions:

```typescript
import i18n from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-default';
import type { Config } from '@sveltekit-i18n/parser-default';

const config: Config = {
  parser: parser({
    modifierDefaults: {
      number: {
        minimumFractionDigits: 2,
      },
    },
  }),
  loaders: [/* ... */],
};
```

All parser options and modifier configurations are fully typed.

### Typing the payload

Left bare, `Config` accepts any payload key. Pass the payload type your
translations take to have `$t` check it:

```typescript
import type { Config } from '@sveltekit-i18n/parser-default';

type Payload = { applicationName: string };

const config: Config<Payload> = {
  parser: parser(),
  loaders: [/* ... */],
};

$t('common.welcome', { applicationName: 'My app' })
// → ok

$t('common.welcome', { aplicationName: 'My app' })
// → type error: typo caught
```

The second type argument types the props your custom modifiers take.

## Special Characters

The following characters have special meaning: `;`, `:`, `{`, `}`

To use them literally in your translations, escape them with double backslash:

```json
{
  "formula": "E = mc\\{squared\\}",
  "ratio": "Ratio\\: 3\\:1",
  "note": "End with semicolon\\;"
}
```

## Examples

See the [parser-default example](https://github.com/sveltekit-i18n/lib/tree/master/examples/parser-default) for a complete working application.

**[Live Demo](https://parser-default.netlify.app)** – Interactive examples

## Comparison with Other Parsers

### vs. ICU Message Format

**parser-default:**
```json
{
  "items": "You have {{count}} {{count; 1:item; default:items;}}."
}
```

**ICU:**
```json
{
  "items": "You have {count} {count, plural, one {item} other {items}}."
}
```

- `parser-default` has simpler syntax
- ICU has more advanced plural rules for complex languages
- `parser-default` has no external dependencies
- ICU is an industry standard

Choose `parser-default` for simplicity, ICU for standards compliance.

## More Resources

- 📚 [All Parsers](https://github.com/sveltekit-i18n/parsers) – Parser overview
- 🎨 [Examples](https://github.com/sveltekit-i18n/lib/tree/master/examples) – Working examples
- 📖 [Changelog](./CHANGELOG.md) – Version history

## Issues

If you're facing issues with this parser, create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).

## License

MIT
