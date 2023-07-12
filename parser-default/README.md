[![npm version](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-default.svg)](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-default) ![](https://github.com/sveltekit-i18n/parsers/workflows/Tests/badge.svg) [![Tests](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-default.yml/badge.svg)](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-default.yml)
[![Netlify Status](https://api.netlify.com/api/v1/badges/61a65082-1dc8-4c2a-94f2-0334c005dad0/deploy-status)](https://app.netlify.com/sites/parser-default/deploys)

# @sveltekit-i18n/parser-default
This parser is ment be used together with [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base), but can be used with other libraries as well. In fact, it does not require [Svelte](https://github.com/sveltejs/svelte) or [SvelteKit](https://github.com/sveltejs/kit).

## Preview
You can see this parser in action on [Netlify](https://parser-default.netlify.app).

## Options
### `modifierDefaults`?: __Modifier.Defaults__
You can specify default values for built-in modifiers using this prop. Configuration is available for these modifiers:

`number`?: __Intl.NumberFormatOptions__\
`date`?: __Intl.DateTimeFormatOptions__\
`ago`?: __Intl.RelativeTimeFormatOptions & { format?: Intl.RelativeTimeFormatUnit | 'auto' }__
`currency`?: __Intl.NumberFormatOptions & { ratio?: number }__

### `customModifiers`?: __Record<string, Modifier.T>__
You can use this property to include your own set of modifiers.

For example custom modifier `eqAbs`...
```javascript
const customModifiers = {
  eqAbs: ({ value, options, defaultValue, locale }) => options.find(({ key }) => Math.abs(+key) === Math.abs(value))?.value || defaultValue
}

```

...can be used in the definitions like this:

```hbs
{{placeholder:eqAbs; 10:Value is absolutely equal to ten.; default:Value is not absolutely equal to ten.;}}
```
Read more about [Modifiers](#modifiers).


## Syntax

Every [placeholder](#placeholders) or [modifier](#modifiers) starts with `{{` and ends with `}}` and can be included in your translations like this:
 
```jsonc
{
  "simple_prop": "Some value",
  "module": {
    "placeholder": "Title with {{placeholder}}.",
    "placeholder_with_default_value": "{{placeholder; default:Default value;}}.",
    "modifier": "{{gender; female:She; male:He;}} has a dog.",
    "combined": "You have {{number:gt; 0:{{number}} new {{number; 1:message; default:messages;}}!; default:no messages.;}}"
  }
} 
```

### Placeholders

Placeholders work as a connection between static translations and dynamic content. They are usually replaced by dynamic values, which are the same for all language mutations.

Placeholder notation looks like this:
```hbs
{{placeholder}}

<!-- or: -->
{{placeholder;}}
```

You can also use `default` value. This value is used in case there is no appropriate value in translation payload. 

```hbs
{{placeholder; default:This is a default value;}}
```

The `default` value can be also set dynamically using the translation payload in your `.svelte` file. For example:

```javascript
$t(`error.${code}`, { default: $t('error.default') });
```
This value is used in case no `default` value is defined within the placeholder definition itself. For more, see `Dynamic default` section in [parser-default example](https://github.com/sveltekit-i18n/lib/tree/master/examples/parser-default) app.

### Modifiers
Modifiers don't represent the payload value directly, but they can use it for further calculations. Currently, these modifiers are in place:

`eq` – input value is equal to the value in your definition (string comparison, case insensitive).\
`ne` – input value is not equal to the value in your definition (string comparison, case insensitive).\
`lt` – input value is lower than the value in your definition.\
`lte` – input value is lower than or equal to the value in your definition.\
`gt` – input value is greater than the value in your definition.\
`gte` – input value is greater than or equal to the value in your definition.\
`number` – input value is converted to locale formatted number string.\
`date` – input value is converted to locale date string.\
`ago` – input value is converted to locale relative date string.\
`currency` – input value is converted to locale relative currency string.

Each modifier returns a string value based on these input properties:

`value`: __any__ – interpolated placeholder value\
`options`: __{key: string; value: string;}[]__ – parsed interpolation options from the definition\
`props`?: __any__ – modifier properties\
`defaultValue`?: __string__ – default value\
`locale`?: __string__ – current locale

When placeholder value is not matched and you don't specify the `default` value, modifier returns an empty string.

Modifier notation looks like this:
```hbs
{{placeholder:modifier; placeholderVal1:Interpolation value 1; placeholderVal2:Interpolation value 2; ... ; default:Default value;}}
```

In case you don't specify the modifier, but interpolation options are set, `eq` modifier is used by default:

```hbs
{{placeholder; placeholder_value:Interpolation value;}}
```

For example this definition...
```jsonc
// `content` translation definition
{
  "modifier_date": "{{value:date;}}"
}
```

...you can execute like this:
```javascript
// svelte file

$t('content.modifier_date', { value: Date.now() }, { timeStyle: 'full' });

// $t(`key`, ...params: [payload, props]);
```

You are allowed to use nested `placeholders` and `modifiers` within your modifier definition or include your own modifiers in [Options](#options)! See `parser-default` [example](https://github.com/sveltekit-i18n/lib/tree/master/examples/parser-default).


__Note that `;`, `:`, `{` and `}` characters are used as placeholder identifiers and separators, so you shouldn't use them within your definition keys and values. You should use their escaped form insead (`\\;`, `\\:`, `\\{` or `\\}`).__

## More info
[Examples](https://github.com/sveltekit-i18n/lib/tree/master/examples)\
[Changelog](https://github.com/sveltekit-i18n/parsers/blob/master/parser-default/CHANGELOG.md)

## Issues
If you are facing issues with this parser, create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).
