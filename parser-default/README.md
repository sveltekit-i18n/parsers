[![npm version](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-default.svg)](https://badge.fury.io/js/@sveltekit-i18n%2Fparser-default) ![](https://github.com/sveltekit-i18n/parsers/workflows/Tests/badge.svg) [![Tests](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-default.yml/badge.svg)](https://github.com/sveltekit-i18n/parsers/actions/workflows/tests-parser-default.yml)

# @sveltekit-i18n/parser-default

## Options

### `customModifiers`?: __Record<string, IModifier.Modifier>__
You can use this property to include your own set of modifiers.

For example custom modifier `eqAbs`...
```typescript
{
  eqAbs: (value, options, defaultValue, locale) => options.find(({ key }) => Math.abs(key) === Math.abs(value))?.value || defaultValue
}

```

...can be used in the definitions like this:

```hbs
{{placeholder:eqAbs; key1:value1; key2:value2; default:defaultValue;}}
```
Read more about [Modifiers](#modifiers).


## Syntax

Every [placeholder](#placeholders) or [modifier](#modifiers) starts with `{{` and ends with `}}` and can be included in your translations like this:
 
```jsonc
{
  "prop": "Some value",
  "module": {
    "placeholder": "Title with {{placeholder}}.",
    "placeholder_with_default_value": "{{placeholder; default:Default value;}}.",
    "modifier": "{{gender; female:She; male:He;}} has a dog.",
    "combined": "You have {{number:gt; 0:{{number}} new {{number; 1:message; default:messages;}}!; default:no messages.;}}"
  }
} 
```

### Placeholders

Placeholders work as a connection between static translations and dynamic content. They are usually replaced by dynamic values, which are same for all language mutations.

Placeholder notation looks like this:
```hbs
{{placeholder}}

<!-- or: -->
{{placeholder;}}
```

You can also use `default` value. This value is used in case there is no appropriate value in translation payload. 

```hbs
{{placeholder; default:This is default value;}}
```

The `default` value can be also set dynamically using the translation payload in your `.svelte` file. For example:

```javascript
$t(`error.${code}`, { default: $t('error.default') })
```
This value is used in case no `default` value is defined within the placeholder definition itself. For more, see `Dynamic default` section in [parser-default](https://github.com/sveltekit-i18n/lib/tree/master/examples/parser-default) example.

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
`ago` – input value is converted to locale relative date string.

Each modifier returns a string value based on these input parameters:

1) input value from payload (placeholder value)
2) parsed interpolation options from the definition
3) default value
4) current locale

When placeholder value is not matched and you don't specify the `default` value, modifier returns an empty string.

You can include your own modifiers in [Options](#options)! See `parser-default` example in [Examples](https://github.com/sveltekit-i18n/lib/tree/master/examples).


Modifier definition looks like this:
```hbs
{{placeholder:modifier; placeholderVal1:Interpolation value 1; placeholderVal2:Interpolation value 2; ... ; default:Default value;}}
```

In case you don't specify the modifier, but interpolation options are set, `eq` modifier is used by default:

```hbs
<!-- this modifier definition uses `eq` modifier by default -->
{{placeholder; placeholder_value:Interpolation value;}}
```

You are allowed to use nested `placeholders` and `modifiers` within your modifier definition. 


__NOTE: `;`, `:`, `{` and `}` characters are used as placeholder identifiers and separators, so you shouldn't use them within your definition keys and values. You should use their escaped form insead (`\\;`, `\\:`, `\\{` or `\\}`).__

## Issues
If you are facing issues with this parser, create a ticket [here](https://github.com/sveltekit-i18n/lib/issues).
