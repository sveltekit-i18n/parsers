# Parsers
A monorepo including [sveltekit-i18n](https://github.com/sveltekit-i18n/lib) message parsers. These parsers are ment be used together with [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base), but can be used with other libraries as well – they does not require [Svelte](https://github.com/sveltejs/svelte) or [SvelteKit](https://github.com/sveltejs/kit).

- [`@sveltekit-i18n/parser-default`](https://github.com/sveltekit-i18n/parsers/edit/master/parser-default) – the default parser used by [sveltekit-i18n](https://github.com/sveltekit-i18n/lib) library
- [`@sveltekit-i18n/parser-icu`](https://github.com/sveltekit-i18n/parsers/edit/master/parser-icu) – ICU message format parser


## Creating custom parsers

Every parser is a method consuming a config and returning an object containing `parse` method:

```js
const customParser = (customParserConfig = {}) => ({
  parse: () => '',
});
```

### `parse`: __Parser.Parse__
Parse method deals with interpolation of user payload and returns a string.

__It consumes these parameters:__

`value`: __any__ – translation value from definitions\
`params`: __any[]__ – array of rest parameters given by user (e.g. payload variables etc...)\
`locale`: __string__ – locale of translated message\
`key`: __string__ – this key is serialized path to translation (e.g., `home.content.title`)

__Example:__

```js
const parse = (value, params, locale, key) => {
  const fallbackValue = `${key} (${locale})`;

  return interpolate(value, ...params) || fallbackValue;
}
```

## Issues
If you are facing issues with some parser, create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).
