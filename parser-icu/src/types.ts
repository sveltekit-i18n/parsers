import type { Parser as P, Config as C } from '@sveltekit-i18n/base';
import { Options, Formats } from 'intl-messageformat';

export module Parser {
  export type PayloadDefault = Record<string, any>;

  export type Payload<T = PayloadDefault> = T;

  export type Params<P = PayloadDefault> = [payload?: Payload<P>, formats?: Partial<Formats>];

  export type T = P.T<Params>;

  export type Factory = (options?: Options) => Parser.T;

  /**
   * The options `extractParamsFactory()` takes: the same ones `parser()` takes,
   * so an extractor is built the way the app builds its parser - `ignoreTag`
   * turns `<b>x</b>` into literal text and the callback the payload carried
   * for it is gone. Extraction formats nothing, so `formatters` reaches
   * nothing.
   */
  export type ExtractOptions = Options;

  /**
   * Reports the parameters a message names. The build-time half of the parser
   * contract, which is why it is a named export rather than a member of the
   * parser object: a message scanner is of no use while rendering, and a
   * bundle that never reaches it drops it.
   */
  export type ExtractParams = P.ExtractParams;

  export type ExtractParamsFactory = P.ExtractParamsFactory<ExtractOptions>;
}

export type Config<Payload = Parser.PayloadDefault> = C.T<Parser.Params<Payload>>;