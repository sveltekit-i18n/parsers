import type { IParser as P } from '@sveltekit-i18n/base';

export type CommonProps = { value: any, props?: IModifier.Props, locale?: string };

export type Interpolate = (props: CommonProps & { payload?: IParser.Payload, customModifiers?: IModifier.CustomModifiers }) => string;

export namespace IModifier {
  export type Props = Intl.RelativeTimeFormat | Intl.NumberFormatOptions | undefined;

  export type ModifierKey = 'lt' | 'lte' | 'eq' | 'gte' | 'gt';

  export type ModifierOption =  Record<'key' | 'value', string>;

  export type Modifier = (props: CommonProps & { options: IModifier.ModifierOption[]; defaultValue?: string }) => string;

  export type DefaultModifiers<K extends string = ModifierKey> = Record<K, Modifier>;

  export type CustomModifiers = DefaultModifiers<string>;
}

export namespace IParser {
  export type CustomModifiers = IModifier.CustomModifiers;

  export type Options = {
    customModifiers?: CustomModifiers;
  };

  export type Payload<Value = any> = Record<string | 'default', Value>;

  export type Params<P = Payload, O = IModifier.Props> = [payload?: P, props?: O, ...rest: unknown[]];

  export type ParserFactory = P.ParserFactory<Options, Params>;
}