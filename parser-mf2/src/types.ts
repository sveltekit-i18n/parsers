import type { Config as BaseConfig, Parser as BaseParser } from '@sveltekit-i18n/base';
import type { MessageFormatOptions } from 'messageformat';

export namespace Parser {
  export type PayloadDefault = Record<string, any>;

  export type Payload<T = PayloadDefault> = T;

  /**
   * The rest parameters of `t(key, payload?)`: the values the message's
   * variables name. There is no per-call formatting slot - a MessageFormat 2
   * message states its own formatting, as function options.
   */
  export type Params<P = PayloadDefault> = [payload?: Payload<P>];

  /**
   * `failed-message` - the message could not be compiled (a syntax or data
   * model error) or formatted at all, and is returned raw. `fallback-value` -
   * one expression could not be resolved (a variable the payload lacks, a
   * function nobody registered, a function that rejected its operand or its
   * options), so the output carries MessageFormat 2's fallback for that
   * expression, `{$name}`, while the rest of the message rendered.
   */
  export type ReportCode = 'failed-message' | 'fallback-value';

  export type Report = {
    code: ReportCode;
    key: BaseParser.Key;
    locale: BaseParser.Locale;
    /** What happened, in one sentence. */
    message: string;
    /** What the formatter threw, or handed to its error callback, where there was one. */
    error?: unknown;
  };

  export type OnReport = (report: Report) => void;

  /**
   * The options `parser()` takes: `messageformat`'s own (`bidiIsolation`,
   * `dir`, `localeMatcher`, `functions`), plus where a diagnostic goes.
   * `onReport` is required, `null` included: this package writes to no
   * channel of its own, so where a report goes is stated by whoever builds
   * the parser.
   */
  export type Options = MessageFormatOptions<string> & { onReport: OnReport | null | undefined };

  export type T = BaseParser.T<Params, string>;

  export type Factory = (options: Options) => T;

  /**
   * The options `extractParamsFactory()` takes: the ones `parser()` takes, so
   * an extractor is built from the same bag the app builds its parser from.
   * None of them changes what a message names - the syntax is fixed by the
   * specification, and a custom function narrows nothing - and extraction
   * reports nothing, so `onReport` is not among them.
   */
  export type ExtractOptions = Omit<Options, 'onReport'>;

  /**
   * Reports the parameters a message names. The build-time half of the parser
   * contract, which is why it is a named export rather than a member of the
   * parser object: a message scanner is of no use while rendering, and a
   * bundle that never reaches it drops it.
   */
  export type ExtractParams = BaseParser.ExtractParams;

  export type ExtractParamsFactory = BaseParser.ExtractParamsFactory<ExtractOptions>;
}

/** The base config carrying this parser, typed by the payload the messages expect. */
export type Config<Payload = Parser.PayloadDefault> = BaseConfig.T<Parser.Params<Payload>, string>;
