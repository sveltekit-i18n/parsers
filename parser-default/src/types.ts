import type { Parser as P, Config as C } from '@sveltekit-i18n/base';

export type CommonProps = { value: any, props?: Modifier.Props, locale?: string };

export type Interpolate = (props: CommonProps & { payload?: Parser.Payload, customModifiers?: Modifier.CustomModifiers }) => string;

export module Modifier {
  export type Props = Intl.RelativeTimeFormat | Intl.NumberFormatOptions | undefined;

  export type ModifierKey = 'lt' | 'lte' | 'eq' | 'gte' | 'gt';

  export type ModifierOption =  Record<'key' | 'value', string>;

  export type T = (props: CommonProps & { options: Modifier.ModifierOption[]; defaultValue?: string }) => string;

  export type DefaultModifiers<K extends string = ModifierKey> = Record<K, T>;

  export type CustomModifiers = DefaultModifiers<string>;
}

export module Parser {
  export type CustomModifiers = Modifier.CustomModifiers;

  export type Options = {
    customModifiers?: CustomModifiers;
  };

  export type Payload<T = Record<string, any>> = { [key in 'default']?: any } & T;

  export type Params<P = Payload, O = Modifier.Props> = [payload?: P, props?: O];

  export type T = P.ParserFactory<Options, Params>;
}

export type Config = C.T<Parser.Params>;