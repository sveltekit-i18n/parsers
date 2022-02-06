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

### `parse`: __(props: { translations: Record<string, Record<string, any>>; key: string; payload?: Record<any, any>; locale?: string; fallbackLocale?: string; }) => string__

Example:

```js
const parse = ({ translations, key, payload, locale, fallbackLocale }) => {
  // Note that in production you should handle `undefined` values here
  const translation = translations[locale] || translations[fallbackLocale];
  const message = translation[key];

  // Assuming you have your interpolation function for given variables...
  return interpolate(message, payload);
}
```
