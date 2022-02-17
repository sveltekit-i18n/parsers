# 1.0.2
This version includes these changes:
* fixed `ago` modifier plural formats (until this version only singular was accepted)

```js
$t('content.ago', { value: -1000 * 60 * 60 }, { ago: { format: 'minutes' } });
```

# 1.0.1
This version includes these changes:
* `ago` modifier now takes positive or negative milliseconds from `Date.now()` instead of `timestamp`

# 1.0.0
Initial release. This parser is extracted from [sveltekit-i18n](https://github.com/sveltekit-i18n/lib)`@1.5.4` to standalone library enhanced with better typings.

```js
$t('content.placeholder', {/* interpolation payload */}, {/* modifier `props` */});
```
