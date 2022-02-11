import type { Parser as P, Config as C } from '@sveltekit-i18n/base';
import * as modifiers from './modifiers';

export type CommonProps<CustomModifierProps extends Modifier.DefaultProps = Modifier.DefaultProps> = { value: any, props?: Modifier.Props<CustomModifierProps>, locale?: string };

export type Interpolate = (config: CommonProps & { payload?: Parser.Payload, customModifiers?: Modifier.CustomModifiers }) => string;

export module Modifier {
  export type ModifierKey = keyof typeof modifiers;

  export type AgoProps = Intl.RelativeTimeFormatOptions & { format?: Intl.RelativeTimeFormatUnit | 'auto' };

  export type DateProps = Intl.DateTimeFormatOptions;

  export type NumberProps = Intl.NumberFormatOptions;

  export type DefaultProps = NumberProps & AgoProps & DateProps;

  export type Props<T = DefaultProps> = T | DefaultProps;

  export type ModifierOption =  Record<'key' | 'value', string>;

  export type T<CustomModifierProps = DefaultProps> = (config: CommonProps<CustomModifierProps> & { options: ModifierOption[]; defaultValue?: string }) => string;

  export type DefaultModifiers = typeof modifiers;

  export type CustomModifiers<K extends string = string, M = Modifier.T> = Record<K, M>;
}

export module Parser {
  export type Options = {
    customModifiers?: Modifier.CustomModifiers;
  } | undefined;

  export type PayloadDefault = { [key: string]: any };

  export type Payload<T = PayloadDefault> = { [key in 'default']?: any } | T;

  export type Params<P = PayloadDefault, O = Modifier.DefaultProps> = [payload?: Payload<P>, props?: Modifier.Props<O & Modifier.DefaultProps>];

  export type T = P.ParserFactory<Options, Params>;
}

export type Config = C.T<Parser.Params>;