import type { Parser as P, Config as C } from '@sveltekit-i18n/base';
import * as modifiers from './modifiers';

export type CommonProps<CustomModifierProps = Modifier.DefaultProps> = { value: any, props?: CustomModifierProps, locale?: C.Locale };

export type Interpolate = (config: CommonProps & { payload?: Parser.Payload, customModifiers?: Modifier.CustomModifiers }) => string;

export module Modifier {
  export type ModifierKey = keyof typeof modifiers;

  export type AgoProps = (Intl.RelativeTimeFormatOptions & { format?: Intl.RelativeTimeFormatUnit | 'auto' });

  export type DateProps = Intl.DateTimeFormatOptions;

  export type NumberProps = Intl.NumberFormatOptions;

  export type DefaultProps = NumberProps & AgoProps & DateProps;

  export type Props<T = DefaultProps> = T & DefaultProps;

  export type ModifierOption =  Record<'key' | 'value', string>;

  export type DefaultValue = string | undefined;

  export type T<CustomModifierProps = any> = (config: CommonProps<CustomModifierProps> & { options: ModifierOption[]; defaultValue?: DefaultValue }) => string;

  export type DefaultModifiers = typeof modifiers;

  export type CustomModifiers<K extends string = any, ModifierProps = any> = Record<K, Modifier.T<ModifierProps>>;
}

export module Parser {
  export type Options<K extends string = Modifier.ModifierKey, P = Modifier.DefaultProps> = {
    customModifiers?: Modifier.CustomModifiers<K, P>;
  } | undefined;

  export type PayloadDefault = { [key in 'default']?: string };

  export type Payload<T = any> = T;

  export type Params<P = PayloadDefault, M = Modifier.DefaultProps> = [payload?: Payload<P>, props?: Modifier.Props<M>];

  export type T<Params extends P.Params = Parser.Params> = P.T<Params>;

  export type Factory = <O extends string = string, Props = Modifier.DefaultProps, Payload = Parser.PayloadDefault>(options?: Parser.Options<O, Props>) => Parser.T<Parser.Params<Payload & PayloadDefault, Props & Modifier.DefaultProps>>;
}

export type Config<P = Parser.PayloadDefault, M = Modifier.DefaultProps> = C.T<Parser.Params<P, M>>;