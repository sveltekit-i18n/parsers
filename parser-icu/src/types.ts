import type { Parser as P, Config as C } from '@sveltekit-i18n/base';
import { Options, Formats } from 'intl-messageformat';

export module Parser {
  export type PayloadDefault = Record<string, any>;

  export type Payload<T = PayloadDefault> = T;

  export type Params<P = PayloadDefault> = [payload?: Payload<P>, formats?: Partial<Formats>];

  export type T = P.T<Params>;

  export type Factory = (options?: Options) => Parser.T;
}

export type Config<Payload = Parser.PayloadDefault> = C.T<Parser.Params<Payload>>;