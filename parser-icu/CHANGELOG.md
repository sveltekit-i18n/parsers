# 3.1.1
Documentation only. The README says that [`@sveltekit-i18n/extension-html`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-html) needs `ignoreTag: true`: without it a tag is this parser's own rich-text syntax, and a message is reported as `failed-message` and returned raw whenever its payload carries no callback for a tag or a tag carries an attribute. The package is tested against `@sveltekit-i18n/base` 3.3.1; the peer range is unchanged. The package itself is unchanged.

# 3.1.0
The `cacheLimit` option, caches that serve more of the calls an app makes, extraction with the parser the runtime compiles with, and `intl-messageformat` 12.
* **`cacheLimit` sets how many compiled messages a parser keeps**, one count across every locale, the least recently used making room: 10,000 by default, as before; `0` compiles on every call, `Infinity` never evicts, and a value that is no count keeps the default. `extractParamsFactory` does not take it, since extraction caches nothing. The README states what an entry takes and when to raise the limit: a server shares one parser across every request, so 20 locales of 1,000 keys each are 20,000 entries.
* **A message compiled with per-call `formats` is cached under that `formats` object**, bounded by the same `cacheLimit` and gone once the object is; before, such a call compiled its message every time. Keep the object where it outlives a render - in `<script module>` or a module of its own.
* **A `formats` object changed in place reaches a message already cached with it only in part.** 3.0.x compiled a message on every call that passed `formats`, so each call read the object as it then stood. Now a message compiled with the object copies its `number`, `date` and `time` maps once and keeps the options of each style by reference, except those of a style named like one `intl-messageformat` ships (`short`, `medium`, `long` or `full` for a date or time, `integer`, `currency` or `percent` for a number), which it copies too: a style added, removed or replaced afterwards, a map replaced, or an option changed inside a style named like a shipped one does not reach the cached message, while an option changed inside any other style does. To change the formats, pass a new object: in Svelte a deep `$state` object keeps its identity when changed, so reassign it, or hold it in `$state.raw` or `$derived`.
* **Every message a parser formats shares one set of `Intl` formatters**, kept per parser instance, per locale and options: up to 1,000 date and time formatters and 10,000 number formats and plural rules, the oldest making room, about 100 MB per parser with every kind at its limit on Node 22. Before, each cached message built its own, and every other call built them again: a cached message now holds some 1.2 KB less of the JavaScript heap (2.8 KB, from 4.0 KB, over the benchmark's messages), and a message with a number, plural or date placeholder formats some three to seven times as fast the first time it is read, and one and a half to two times as fast once cached. A per-call style whose options are not plain data is built for the call, and a `formatters` set in the parser options replaces the kept set and is used as it is. A kept formatter goes on showing what the host's `Intl` had when it was built: on a host whose default zone changes while it runs (Node, Bun or Deno with `process.env.TZ` set at runtime), a date or time that names no `timeZone` keeps the zone it was first formatted in.
* The message cache is kept per locale, then per message, so a hit no longer builds a string as long as the message - a cached message of text, or with one placeholder or a select, is read in some two fifths to three fifths of the time - and a locale and a message holding a NUL character no longer collide: such a call could get the message another call had compiled.
* **`extractParamsFactory` reads a message with the parser `intl-messageformat` compiles it with** ([#46](https://github.com/sveltekit-i18n/parsers/pull/46)). It imported `@formatjs/icu-messageformat-parser` on a range of its own, which a fresh install could resolve past the version `intl-messageformat` pins: extraction then read messages with a parser the runtime did not use, a browser bundle of `parser()` alone carried some 600 B of the second copy, and one with `extractParamsFactory` some 27 KB. It now parses with the parser `intl-messageformat` compiles with, so the direct dependency is gone and extraction reads the AST the runtime compiles, whatever an install holds.
* **The package runs on `intl-messageformat` 12** (`^12.1.3`, from `^11.2.14`). 12's runtime is 11.2.15's; its major is in its declarations, whose class is now generic over typed message values, and this package's own types are unchanged. 12.1.3 brings `@formatjs/icu-messageformat-parser` 3.5.21, which adds some 370 B to a browser bundle of `parser()` over 3.5.18, some 210 B gzipped. An app that depends on `intl-messageformat` 11 itself gets 12 beside it.
* The README links the site's playground, which runs this parser, instead of the examples. The package is tested against `@sveltekit-i18n/base` 3.3.0; the peer range is unchanged.

# 3.0.5
Documentation only. The date and number examples show what `intl-messageformat` renders, the Czech outputs included, and the comparison with `parser-curly` writes its plural with the format's `plural` selection, which it has had since `@curly-message/parser` 3.1. The README's links into the package now name the release's tag, so the npm page of this version keeps showing this version's files. The package is tested against `@sveltekit-i18n/base` 3.1.2; the peer range is unchanged. The package itself is unchanged.

# 3.0.4
Documentation only. The README follows base 3.1: it wires SvelteKit through the core's `/kit` subpath and writes the loaders in 3.1's spelling (`namespace`, one descriptor for several locales), with the 3.0 spelling beside them, and on base 3.1 the schema `@sveltekit-i18n/typegen` generates needs no cast. The package itself is unchanged.

# 3.0.3
The shipped declarations type `parser()`'s options again. The bundled `.d.ts` declared `type Options = Options & { ... }`, which TypeScript resolves to itself: with `skipLibCheck` the options were `any`, so `onReport` was not required and a misspelled option passed, and without it every consumer's `tsc` failed on `TS2456`.

# 3.0.2
The peer range on `@sveltekit-i18n/base` also takes the `3.1.0-next` prereleases, so the core's `next` line installs underneath this package without a peer conflict. Every stable 3.x core the range took before it still takes.

# 3.0.1
A catalogue leaf that is not text and cannot become any - a null-prototype object, or one whose `toString` throws - no longer throws out of `t()` when the engine rejects it: the failure is reported as `failed-message` and the call renders as the empty string, as it already did in `parser-i18next`. The repository's `contract/` set now checks every parser for it.

# 3.0.0
ESM-only build (the CommonJS entry point has been removed), [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) v3 as a peer dependency, [`intl-messageformat`](https://www.npmjs.com/package/intl-messageformat) updated to v11, and Node.js 22 or newer required.

Compiled messages are now cached per parser instance (least-recently-used, up to 10,000 entries), making repeated reads of the same message roughly 7× faster. The parser also fails soft: a message that cannot be compiled or formatted is returned raw instead of throwing. A key naming no message is nothing to format and now yields the empty string rather than the key echoed back: what a missing translation renders as is [`fallbackValue`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#fallbackvalue), which base answers before this parser is called.

`parser(options)` now takes `onReport`, and it is required, `null` included: the parser writes to no channel of its own, so where a diagnostic goes is stated by whoever builds it. The raw `console.warn` is gone. A report carries `code` (`failed-message` or `unserializable-output`), the `key` and `locale` of the call, a one-sentence `message`, and the `error` the formatter threw where there was one; a report channel that throws is contained like any other failure.

`parse` is now declared, and guaranteed, to return a string. `IntlMessageFormat.format()` yields a message in pieces as soon as a value it interpolates is not text - an object in the payload, or a tag callback returning one - and those pieces are now joined, reported as `unserializable-output`, rather than reaching `t()` as an array the declared type denied.

The package also runs base's parser contract checks (the repository's `contract/` set) beside the ICU tests: what a message MEANS is ICU's to certify, that the parser can be called the way base calls it is base's.

`extractParamsFactory` reads the parameters a message names, as a named export beside the default one. Each parameter says the payload key it is named by, what the placeholder's format narrows it to, the values a `select` or an exact plural match names explicitly, and the selector branches it lives under. It is the build-time half of the base parser contract, which is why it is a named export rather than a member of the parser object: a message scanner is of no use while rendering, and the package declares `sideEffects: false` so a bundle that never reaches it drops it. `@formatjs/icu-messageformat-parser`, which `intl-messageformat` compiles messages with, is now a direct dependency: extraction reads the same AST the runtime reads.

# 1.0.8
Readme update.

# 1.0.7
Removed unused type declarations from build.

# 1.0.6
Fixed CommonJS build.

# 1.0.5
Readme update.

# 1.0.4
Readme update to be compatible with Svelte 4.

# 1.0.3
Dependency update.

# 1.0.2
Dependency update.

# 1.0.1
Dependency update.

# 1.0.0
Initial release. Wrapps [`intl-messageformat`](https://www.npmjs.com/package/intl-messageformat) library to be compatible with [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base).

```js
$t('content.placeholder', {/* interpolation payload */}, {/* Intl MessageFormat `formats` go here */});
```
