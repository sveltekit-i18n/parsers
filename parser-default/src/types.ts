import type { Parser as P, Config as C } from '@sveltekit-i18n/base';
import * as modifiers from './modifiers';

export type CommonProps<CustomModifierProps = Modifier.DefaultProps> = { value: any, props?: CustomModifierProps, locale?: C.Locale, parserOptions?: Parser.Options };

export type Interpolate = (config: CommonProps & { payload?: Parser.Payload }) => string;

export module Modifier {
  export type Key = string;

  export type DefaultKeys = keyof typeof modifiers;

  export type AgoProps = { 'ago'?: (Intl.RelativeTimeFormatOptions & { format?: Intl.RelativeTimeFormatUnit | 'auto' }) };

  export type DateProps = { 'date'?: Intl.DateTimeFormatOptions };

  export type NumberProps = { 'number'?: Intl.NumberFormatOptions };

  export type DefaultProps = NumberProps & AgoProps & DateProps;

  export type Props<T = DefaultProps> = T & DefaultProps;

  export type ModifierOption =  Record<'key' | 'value', string>;

  export type DefaultValue = string | undefined;

  export type T<CustomModifierProps = any> = (config: CommonProps<CustomModifierProps> & { options: ModifierOption[]; defaultValue?: DefaultValue }) => string;

  export type DefaultModifiers = typeof modifiers;

  export type CustomModifiers<K extends string = any, ModifierProps = any> = Record<K, Modifier.T<ModifierProps>>;
}

export module Parser {
  export type Options<Key extends string = Modifier.Key, Props = any> = {
    customModifiers?: Modifier.CustomModifiers<Key, Props>;
    modifierDefaults?: Modifier.DefaultProps;
  } | undefined;

  export type PayloadDefault = { [key in 'default']?: any };

  export type Payload<T = any> = T & PayloadDefault;

  export type Params<P = PayloadDefault, M = Modifier.DefaultProps> = [payload?: Payload<P>, props?: Modifier.Props<M>];

  export type T<Params extends P.Params = Parser.Params> = P.T<Params>;

  export type Factory = <O extends string = string, Props = {}, Payload = {}>(options?: Parser.Options<O, Props>) => Parser.T<Parser.Params<Payload & PayloadDefault, Props & Modifier.DefaultProps>>;
}

export type Config<P = Parser.PayloadDefault, M = Modifier.DefaultProps> = C.T<Parser.Params<P, M>>;