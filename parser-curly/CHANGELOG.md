# 3.0.0
Initial release. `@sveltekit-i18n/parser-curly` implements the [Curly Message Format](https://github.com/curly-message/spec) for [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) v3:
* Every message is resolved by [`@curly-message/parser`](https://github.com/curly-message/parsers), the format's reference implementation and the package's only runtime dependency; the format's conformance set (`@curly-message/conformance`) runs in this package's tests at every level the format defines.
* `parser(options)` takes the reference implementation's options (`customModifiers`, `modifierDefaults`, `onReport`) and returns the parser the base library expects; `parse(value, [payload, props], locale, key)` maps the library's `t(key, payload?, props?)` onto the format's inputs.
* `onReport` receives a `Report` (`code`, `origin`, `message`, `key`, `limit`, `text`) for every diagnostic: `unknown-modifier`, `failed-modifier`, `missing-options`, `unserializable-value`, `missing-locale`, `pass-limit` and `output-limit`. The option is required, `null` included: the parser writes to no channel of its own, so where a report goes is stated by whoever builds the parser.
* `Config`, `Parser`, `Modifier` and `Report` are the exported types.
* ESM only; requires Node.js 22 or newer; `@sveltekit-i18n/base` v3 is a peer dependency.
