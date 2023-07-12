[![npm version](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-icu.svg)](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-icu) ![](https://github.com/sveltekit-i18n/parsers/workflows/Tests/badge.svg) [![Tests](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-icu.yml/badge.svg)](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-icu.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/cd425de0-b200-4a6a-8ab6-68cf34b8b6c7/deploy-status)](https://app.netlify.com/sites/parser-icu/deploys)

# @sveltekit-i18n/parser-icu
This parser implements [`intl-messageformat`](https://www.npmjs.com/package/intl-messageformat) library and brings [ICU message syntax](https://unicode-org.github.io/icu/userguide/format_parse/messages/) to [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base).

## Preview
You can see this parser in action on [Netlify](https://parser-icu.netlify.app).

## Usage

Format your translations to ICU...
```jsonc
// $lib/translations/en/home.json

{
  "plural": "You have {value, plural, =0 {no photos.} =1 {one photo.} other {# photos.}}",
  "select": "{value, select, male {He} female {She} other {They}} will respond shortly.",
  "selectordinal": "It's my cat's {value, selectordinal, one {#st} two {#nd} few {#rd} other {#th}} birthday",
  "number": "The price is: {value, number, ::currency/EUR}",
  "date": "Today is: {value, date, ::yyyyMd}"
}
```

...config `sveltekit-i18n`...
```ts
// $lib/translations/index.ts

import i18n from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';

import type { Config } from '@sveltekit-i18n/parser-icu';

const config: Config<{/* You can add types for your payload here. */}> = {
  parser: parser({
    // Intl MessageFormat `opts` go here
    // see https://formatjs.io/docs/intl-messageformat/#intlmessageformat-constructor
  }),
  loaders: [
    {
      key: 'home',
      locale: 'en',
      routes: ['/'],
      loader: () => import('./en/home.json'), // or you could fetch it from server...
    },
    {
      key: 'home',
      locale: 'it',
      routes: ['/'],
      loader: () => import('./it/home.json'),
    },
    // Other pages and language mutations...
  ],
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
```

...add translations to your app.
```js
/*  ./src/routes/+layout.js */

import { loadTranslations, locale } from '$lib/translations';

/** @type {import('@sveltejs/kit').Load} */
export const load = async ({ url }) => {
  const { pathname } = url;

  const initLocale = 'en'; // get from cookie, user session, ...
  
  await loadTranslations(initLocale, pathname); // keep this just before the `return`

  return {};
}
```

```svelte
<!-- ./src/routes/+page.svelte -->

<script>
  import { t } from '$lib/translations';

  const value = 'female';
</script>

{$t('home.select', { value }, {/* Intl MessageFormat `formats` go here */})}
```

## More info
[Example](https://github.com/sveltekit-i18n/lib/tree/master/examples/parser-icu)\
[Changelog](https://github.com/sveltekit-i18n/parsers/blob/master/parser-icu/CHANGELOG.md)

## Issues
If you are facing difficulties regarding to this implementation of [`intl-messageformat`](https://www.npmjs.com/package/intl-messageformat), create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).
