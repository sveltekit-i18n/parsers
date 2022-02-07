# Parsers
A monorepo including [sveltekit-i18n](https://github.com/sveltekit-i18n/lib) message parsers. These parsers are ment be used together with [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base), but can be used with other libraries as well – they does not require [Svelte](https://github.com/sveltejs/svelte) or [SvelteKit](https://github.com/sveltejs/kit).

- [`@sveltekit-i18n/parser-default`](https://github.com/sveltekit-i18n/parsers/edit/master/parser-default) – the default parser used by [sveltekit-i18n](https://github.com/sveltekit-i18n/lib) library


## Creating custom parsers

Every parser is a method consuming a config and returning an object containing `parse` method:

```js
const customParser = (customParserConfig = {}) => ({
  parse: () => '',
});
```

### `parse`: __(text: string | undefined, params: ParserParams, locale: string, key: string) => string__
Parse method deals with interpolation of user payload and returns a string.

__It consumes these parameters:__

`text` – message text to interpolate
`params` – array of rest parameters given by user (e.g. payload variables etc...)
`locale` – locale of translated message
`key` – this key is serialized path to translation (e.g., `home.content.title`)

__Example:__

```js
const parse = (text, params, locale, key) => {
  const fallbackValue = `${key} (${locale})`;

  return interpolate(message, ...params) || fallbackValue;
}
```
