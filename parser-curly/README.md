[![npm version](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-curly.svg)](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-curly) [![Tests](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-curly.yml/badge.svg)](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-curly.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/61a65082-1dc8-4c2a-94f2-0334c005dad0/deploy-status)](https://app.netlify.com/sites/parser-default/deploys)

# @sveltekit-i18n/parser-curly

The [Curly Message Format](https://github.com/curly-message/spec) for [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base): placeholders, defaults, modifiers and comparisons written in double curly braces. Every message is resolved by [`@curly-message/parser`](https://github.com/curly-message/parsers), the format's reference implementation and this package's only dependency; the package itself unpacks the base library's calling convention and supplies a default diagnostics channel. This README is a practical guide to the syntax — the full grammar and the resolution rules are in the specification repository.

**[Live Demo](https://parser-default.netlify.app)** – See it in action

## Installation

```bash
npm install @sveltekit-i18n/parser-curly
```

This parser is included by default in [sveltekit-i18n](https://github.com/sveltekit-i18n/lib).

**Requirements:** Node.js 22 or newer. Version 3 is ESM-only and expects [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) v3 as a peer dependency.

## Usage

### With @sveltekit-i18n/base

```javascript
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-curly';

const config = {
  parser: parser({
    // Where diagnostics go; `null` states that they go nowhere.
    onReport: null,
  }),
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
  ],
};

export const i18n = new I18n(config);
```

### With sveltekit-i18n

```javascript
import { I18n } from 'sveltekit-i18n';

const config = {
  // parser-curly is already included
  loaders: [/* ... */],
};

export const i18n = new I18n(config);
```

Either way, `i18n.t(key, payload?, props?)` takes the values the placeholders name and the per-call formatting options; the examples below use it.

## Syntax

A placeholder names a payload key and may carry a modifier, options and a default: `{{key:modifier; optionKey:value; default:fallback;}}`. Whitespace around the key, the modifier name, the option keys and the option values is not significant, so `{{value}}`, `{{ value }}` and `{{ value; }}` are the same placeholder.

### Placeholders

```json
{
  "greeting": "Hello, {{name}}!",
  "message": "You have {{count}} new messages."
}
```

```javascript
i18n.t('greeting', { name: 'Alice' })
// → "Hello, Alice!"

i18n.t('message', { count: 5 })
// → "You have 5 new messages."
```

Every value reaches the output as text: a plain object or an array becomes JSON, anything else becomes what `String()` makes of it.

```javascript
i18n.t('greeting', { name: { first: 'Ann' } })
// → "Hello, {"first":"Ann"}!"

i18n.t('greeting', { name: ['Ann', 'Bob'] })
// → "Hello, ["Ann","Bob"]!"
```

### Default Values

```json
{
  "welcome": "Welcome, {{name; default:Guest;}}!"
}
```

```javascript
i18n.t('welcome', { name: 'Bob' })
// → "Welcome, Bob!"

i18n.t('welcome', {})
// → "Welcome, Guest!"

i18n.t('welcome', { default: 'Anonymous' })
// → "Welcome, Anonymous!"
```

`default` is a reserved payload key: the fallback for every placeholder in the message whose value is absent, and `{{default}}` reads it. A placeholder with no value takes the first of these that yields text — the entry's own `default` (see [Payload](#payload)), the payload's `default`, the inline `default:`, the empty string — so the payload's `default` outranks the inline one. Only an absent value falls back: `0`, `false` and the empty string are values. A key that names no message resolves to the payload's `default` as well and, where the payload carries none, to the key itself, echoed verbatim and never read as a message.

### Modifiers

A modifier follows the key after a colon. The formatting modifiers delegate to `Intl` and read their options from the props argument, keyed by the modifier's name — `{ date: { dateStyle: 'full' } }`:

| Modifier | Reads the value as | Options |
| --- | --- | --- |
| `number` | a number | `Intl.NumberFormat` options; at most two fraction digits unless a layer names `maximumFractionDigits`, or a `minimumFractionDigits` above two widens that default |
| `date` | milliseconds since the epoch, or text `Date` parses | `Intl.DateTimeFormat` options |
| `ago` | a signed millisecond delta from now, negative for the past | `Intl.RelativeTimeFormat` options, plus `format`: a unit from `second` to `year`, or `auto` |
| `currency` | a number, multiplied by `ratio` (default `1`) | `Intl.NumberFormat` options in the currency style; `currency` names the code |

```json
{
  "price": "Total: {{amount:number;}}",
  "published": "Published: {{date:date;}}",
  "time": "Time: {{timestamp:date;}}",
  "updated": "Updated {{time:ago;}}",
  "posted": "Posted {{timestamp:ago;}}",
  "cost": "Cost: {{amount:currency;}}"
}
```

```javascript
i18n.t('price', { amount: 1234.56 })
// → "Total: 1,234.56" (locale-dependent)

i18n.t('price', { amount: 1234.56 }, { number: { maximumFractionDigits: 1 } })
// → "Total: 1,234.6"

i18n.t('published', { date: new Date(2024, 0, 1) }, { date: { dateStyle: 'full' } })
// → "Published: Monday, January 1, 2024"

i18n.t('time', { timestamp: new Date(2024, 0, 1, 10, 30) }, { date: { timeStyle: 'short' } })
// → "Time: 10:30 AM"

i18n.t('updated', { time: -3600000 })
// → "Updated 1 hour ago"

i18n.t('posted', { timestamp: -86400000 })
// → "Posted yesterday"

i18n.t('posted', { timestamp: -172800000 }, { ago: { format: 'hour' } })
// → "Posted 48 hours ago"

i18n.t('cost', { amount: 99.99 }, { currency: { currency: 'USD' } })
// → "Cost: $99.99"

i18n.t('cost', { amount: 1999 }, { currency: { currency: 'USD', ratio: 0.01 } })
// → "Cost: $19.99"
```

A value the modifier cannot read — text that is not a number, an empty string, a `Date` object under `number` — takes the fallback and is reported as `failed-modifier`; so does a `currency` placeholder with no currency code or an `ago` whose `format` names no unit. Nothing raises. A `Date` object does work under `date`, to the second, because it reaches the modifier as its `toString` text; pass a timestamp or an ISO string where a placeholder wants one. With no locale — none passed, or the empty string — a formatting modifier resolves to the empty string rather than to the fallback and reports `missing-locale`.

### Comparisons

`eq`, `ne`, `lt`, `lte`, `gt` and `gte` select among the options: the first option whose key satisfies the comparison against the value is the result, and none selected takes the fallback. `eq` and `ne` compare as text, case-insensitively; `lt` and `gt` compare numerically, considering the options in ascending or descending key order; `lte` and `gte` try equality first. A placeholder with options and no modifier compares with `eq`.

```json
{
  "status": "{{state; active:Online; inactive:Offline; default:Unknown;}}",
  "items": "You have {{count}} {{count; 1:item; default:items;}}.",
  "stock": "{{count:gt; 0:In stock ({{count}}); default:Out of stock;}}",
  "age": "{{age:gte; 18:Adult; default:Minor;}}",
  "temp": "{{degrees:lt; 0:Freezing; default:Above freezing;}}",
  "health": "{{state:ne; ok:Problem; default:Fine;}}"
}
```

```javascript
i18n.t('status', { state: 'active' })   // → "Online"
i18n.t('status', { state: 'pending' })  // → "Unknown"
i18n.t('items', { count: 1 })           // → "You have 1 item."
i18n.t('items', { count: 5 })           // → "You have 5 items."
i18n.t('stock', { count: 5 })           // → "In stock (5)"
i18n.t('stock', { count: 0 })           // → "Out of stock"
i18n.t('age', { age: 25 })              // → "Adult"
i18n.t('temp', { degrees: -5 })         // → "Freezing"
i18n.t('health', { state: 'error' })    // → "Problem"
i18n.t('health', {})                    // → "Fine"
```

An absent value never reaches a comparison — it takes the fallback under every modifier, `ne` included. An option written as `key` alone stands for its own key; `key:` declares the empty string. An option value runs to the next unescaped semicolon, so `link:http://example.com` keeps its colons. A comparison with no options (`{{v:eq; default:D}}`) takes the fallback and reports `missing-options`; a placeholder naming a modifier nobody registered takes the fallback and reports `unknown-modifier` — it is never run as `eq`.

### Nested Placeholders

```json
{
  "notification": "You have {{count:gt; 0:{{count}} new {{count; 1:message; default:messages;}}!; default:no messages.;}}"
}
```

```javascript
i18n.t('notification', { count: 1 })
// → "You have 1 new message!"

i18n.t('notification', { count: 5 })
// → "You have 5 new messages!"

i18n.t('notification', { count: 0 })
// → "You have no messages."
```

Nesting is resolved by interpolating the output again, so a payload value may carry a placeholder of its own; the [limits](#limits) bound that.

### Escaping

A backslash cancels the structural meaning of the character after it: `:`, `;`, `{`, `}`, whitespace and the backslash itself. Before any other character the backslash is text, so a regular expression or a Windows path survives as typed. In a JSON catalogue each backslash is written twice (`"\\{\\{"`).

| Message | Result |
| --- | --- |
| `Braces are written \{\{ like this \}\}` | `Braces are written {{ like this }}` |
| `Ratio\: 3\:1\;` | `Ratio: 3:1;` |
| `Hello, {{first\ name}}!` | reads the payload key `first name` |
| `{{count; 1:one\ ; default:none}}` | keeps the trailing space the trimming would take |
| `C:\\temp` | `C:\temp` |
| `\d+` | `\d+` |
| `\{{v}}` | `{{v}}`, text whatever the payload carries |

Escape sequences are removed once, from the finished text, and a payload value is read by the same rule: a value that must keep a backslash before a reserved character doubles it. A placeholder is written on one line — `{{` and `}}` with a line terminator between them are text — and `{{}}` is a placeholder naming no key, which resolves to the fallback.

## Payload

A payload entry may be a wrapper instead of the value: a plain object owning at least one of `value`, `default` and `props` and nothing else. Its `default` is tried before the payload's, and its `props` are the topmost formatting layer.

```javascript
i18n.t('price', { amount: { value: 1234.56, props: { number: { maximumFractionDigits: 1 } } } })
// → "Total: 1,234.6"

i18n.t('greeting', { name: { default: 'stranger' } })
// → "Hello, stranger!"
```

An entry owning any other key is data, wrapper-shaped or not: `{ value: 1, unit: 'kg' }` becomes JSON. Every entry is read as an own enumerable property — nothing on a prototype resolves.

## Options

```javascript
import parser from '@sveltekit-i18n/parser-curly';

const config = {
  parser: parser({
    // The bottom formatting layer, keyed by modifier name. The props a call
    // passes and a wrapper's own props layer over it, property by property.
    modifierDefaults: {
      number: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      date: { dateStyle: 'medium' },
      ago: { numeric: 'auto' },
      currency: { currency: 'USD' },
    },
    // Modifiers by name, over the built-in ones.
    customModifiers: {},
    // Where diagnostics go. Required: a function, or `null` to state that
    // reports go nowhere.
    onReport: (report) => { /* ... */ },
  }),
};
```

The formatting layers compose per property, so a layer overrides only what it names:

```
modifierDefaults  { number: { maximumFractionDigits: 4, useGrouping: false } }
call props        { number: { useGrouping: true } }
wrapper props     { number: { maximumFractionDigits: 1 } }
effective         { maximumFractionDigits: 1, useGrouping: true }  →  "1,234.6"
```

### Custom Modifiers

A modifier is a function of `{ value, options, defaultValue, props, locale }`: the value as text, the options as `[{ key, value }]` in source order, the fallback chain behind `defaultValue` (resolved when read), the props composed under the modifier's own name (an empty object where nothing is configured) and the locale. What it returns becomes text. A modifier that returns nothing leaves the placeholder to its fallback, and so does one that throws, which is reported as `failed-modifier`. An absent value takes the fallback before any modifier runs. A modifier registered under a built-in name replaces it.

```javascript
const config = {
  parser: parser({
    customModifiers: {
      // Absolute value equality
      eqAbs: ({ value, options, defaultValue }) =>
        options.find(({ key }) => Math.abs(+key) === Math.abs(+value))?.value ?? defaultValue,

      // Uppercase transform
      upper: ({ value }) => value.toUpperCase(),

      // Truncate text; `props` is what the call passes under `truncate`
      truncate: ({ value, props }) => {
        const maxLength = props.maxLength ?? 50;

        return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
      },
    },
  }),
};
```

```json
{
  "score": "{{value:eqAbs; 10:Perfect score!; default:Not quite.;}}",
  "title": "{{text:upper;}}",
  "description": "{{text:truncate;}}"
}
```

```javascript
i18n.t('score', { value: -10 })
// → "Perfect score!"

i18n.t('title', { text: 'hello world' })
// → "HELLO WORLD"

i18n.t('description', { text: 'This text is far too long to display' }, { truncate: { maxLength: 20 } })
// → "This text is far too..."
```

### Reports

The format prescribes no diagnostics channel, and neither does this package: `@curly-message/parser` writes nowhere by itself, and `parser()` adds no writer of its own. `onReport` is therefore a required option — a function, or `null` to state that reports go nowhere — so that silence is a decision, never an omission. A host with a logger routes reports to it:

```javascript
parser({ onReport: (report) => logger.warn(report.message, report) })
```

A `Report` carries:

| Field | Meaning |
| --- | --- |
| `code` | `unknown-modifier`, `failed-modifier`, `missing-options`, `unserializable-value`, `missing-locale`, `pass-limit` or `output-limit` |
| `origin` | who fixes it: `message` (the message as written), `payload` (what the call passed) or `limit` (a bound this parser set) |
| `message` | a self-contained English sentence carrying nothing from the payload |
| `key` | the message's key, where the call passed one |
| `limit` | the limit reached, for the two limit reports |
| `text` | the excerpt: the placeholder, or the output that would not settle — cut to 120 code units, with quotes, backslashes and line terminators escaped, so it can be written anywhere |

A report never raises: the placeholder takes its fallback (the empty string for `missing-locale`) and the rest of the message resolves.

## Limits

Resolution is bounded three ways: 10 interpolation passes (a value referencing its own placeholder stops with its placeholders unresolved, reported as `pass-limit`), 100 000 UTF-16 code units of output (a pass that would exceed it is discarded and the last output under the bound stands, reported as `output-limit`) and 100 000 nodes per value conversion (a value past it is read as missing, reported as `unserializable-value`). The specification's conformance set, `@curly-message/conformance`, runs against this package's public API in its tests, at every level the format defines (Core, Intl, Extensions).

## TypeScript

```typescript
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-curly';
import type { Config, Modifier, Report } from '@sveltekit-i18n/parser-curly';

type Payload = { applicationName: string };
type Props = { truncate?: { maxLength?: number } };

const truncate: Modifier.T<{ maxLength?: number }> = ({ value, props }) =>
  value.length > (props.maxLength ?? 50) ? `${value.slice(0, props.maxLength ?? 50)}...` : value;

const config: Config<Payload, Props> = {
  parser: parser({
    customModifiers: { truncate },
    onReport: (report: Report) => { console.warn(report.message); },
  }),
  loaders: [/* ... */],
};

const i18n = new I18n(config);

i18n.t('common.welcome', { applicationName: 'My app' }, { truncate: { maxLength: 20 } })
// → ok

i18n.t('common.welcome', { aplicationName: 'My app' })
// → type error: typo caught
```

`Config<Payload, Props>` types the payload and the props `i18n.t` accepts; left bare, `Config` accepts any payload key and the built-in modifiers' props. A custom modifier types its own props through `Modifier.T<OwnProps>`. The factory's type arguments check the parser options the same way: with `Props` spelled as the second, `parser<Payload, Props>({ ... })`, a `modifierDefaults` entry for a custom modifier is checked; a modifier written inline reads typed `props` once the modifier names are spelled as the third argument too, `parser<Payload, Props, 'truncate'>({ ... })`. `Parser` holds the option and parameter types (`Parser.Options`, `Parser.OnReport`, `Parser.Params`, `Parser.Payload`), `Modifier` the modifier and wrapper types (`Modifier.T`, `Modifier.Wrapper`, `Modifier.Props`), and `Report` is the report.

## Examples

See the [parser-curly example](https://github.com/sveltekit-i18n/lib/tree/master/examples/parser-default) for a complete working application.

**[Live Demo](https://parser-default.netlify.app)** – Interactive examples

## Comparison with Other Parsers

### vs. ICU Message Format

**parser-curly:**
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

- `parser-curly` has simpler syntax
- ICU has more advanced plural rules for complex languages
- `parser-curly` has one dependency, the format's reference implementation, and no others
- ICU is an industry standard

Choose `parser-curly` for simplicity, ICU for standards compliance.

## More Resources

- [All Parsers](https://github.com/sveltekit-i18n/parsers) – Parser overview
- [Curly Message Format](https://github.com/curly-message/spec) – The specification
- [Examples](https://github.com/sveltekit-i18n/lib/tree/master/examples) – Working examples
- [Changelog](./CHANGELOG.md) – Version history

## Issues

If you're facing issues with this parser, create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).

## License

MIT
