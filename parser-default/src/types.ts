import type { Parser as P, Config as C } from '@sveltekit-i18n/base';

export type CommonParams<CustomModifierParams = Modifier.DefaultParams> = { value: any, params?: Modifier.Params<CustomModifierParams>, locale?: string };

export type Interpolate = (config: CommonParams & { payload?: Parser.Payload, customModifiers?: Modifier.CustomModifiers }) => string;

export module Modifier {
  export type DefaultParams = { [key: keyof any]: any } & any;
  export type Params<T = Modifier.DefaultParams> = T | undefined;

  export type ModifierKey = 'lt' | 'lte' | 'eq' | 'gte' | 'gt';

  export type ModifierOption =  Record<'key' | 'value', string>;

  export type T<CustomModifierParams = Modifier.DefaultParams> = (config: CommonParams<CustomModifierParams> & { options: Modifier.ModifierOption[]; defaultValue?: string }) => string;

  export type DefaultModifiers<K extends string = ModifierKey, M = Modifier.T> = Record<K, M>;

  export type CustomModifiers = DefaultModifiers<string>;
}

export module Parser {
  export type CustomModifiers = Modifier.CustomModifiers;

  export type Options = {
    customModifiers?: CustomModifiers;
  } | undefined;

  export type Payload<T = Record<string, any>> = { [key in 'default']?: any } & T;

  export type Params<P = Payload, O = Modifier.Params> = [payload?: P, props?: O];

  export type T = P.ParserFactory<Options, Params>;
}

export type Config = C.T<Parser.Params>;