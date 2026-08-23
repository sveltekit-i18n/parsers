# 3.0.0
ESM-only build (the CommonJS entry point has been removed), [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) v3 as a peer dependency, [`intl-messageformat`](https://www.npmjs.com/package/intl-messageformat) updated to v11, and Node.js 22 or newer required.

Compiled messages are now cached per parser instance (least-recently-used, up to 10,000 entries), making repeated reads of the same message roughly 7× faster. The parser also fails soft: a message that cannot be compiled or formatted is returned raw with a logged warning instead of throwing.

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
