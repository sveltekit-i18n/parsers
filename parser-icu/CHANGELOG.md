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
