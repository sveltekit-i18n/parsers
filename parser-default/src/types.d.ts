import type { IParser as P } from '@sveltekit-i18n/base';

export namespace IModifier {
  export type ModifierKey = 'lt' | 'lte' | 'eq' | 'gte' | 'gt';

  export type ModifierOption =  Record<'key' | 'value', string>;

  export type Modifier = (value: any, options:ModifierOption[], defaultValue?: string, locale?: string) => string;

  export type DefaultModifiers = Record<ModifierKey, Modifier>;

  export type CustomModifiers = Record<string, Modifier>;
}


export namespace IParser {
  export type CustomModifiers = IModifier.CustomModifiers;

  export type ParserOptions = {
    customModifiers?: CustomModifiers;
  };

  export type ParserParams = [payload?: Record<string | 'default', any>, ...rest: unknown[]];

  export type ParserFactory = P.ParserFactory<ParserOptions, ParserParams>;
}