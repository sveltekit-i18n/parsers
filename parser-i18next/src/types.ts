import type { Config as BaseConfig, Parser as BaseParser } from '@sveltekit-i18n/base';
import type { Formatter, InitOptions, InterpolationOptions } from 'i18next';

export namespace Parser {
  export type PayloadDefault = Record<string, any>;

  export type Payload<T = PayloadDefault> = T;

  /**
   * The per-call options `t()` takes after the payload. `formatParams` is
   * i18next's own: `Intl` options keyed by placeholder name, layered over the
   * arguments the placeholder's format spells out.
   */
  export type CallOptions = { formatParams?: Record<string, Record<string, unknown>> };

  /**
   * The rest parameters of `t(key, payload?, options?)`: the values the
   * message's placeholders name, then the per-call formatting options.
   */
  export type Params<P = PayloadDefault> = [payload?: Payload<P>, options?: CallOptions];

  /**
   * `failed-message` - the message could not be rendered as text: the engine
   * threw while interpolating it, and it is returned raw, or a leaf that is
   * not text could not be turned into any, and it renders as the empty string.
   */
  export type ReportCode = 'failed-message';

  export type Report = {
    code: ReportCode;
    key: BaseParser.Key;
    locale: BaseParser.Locale;
    /** What happened, in one sentence. */
    message: string;
    /** What the engine threw, where there was a throw. */
    error?: unknown;
  };

  export type OnReport = (report: Report) => void;

  /**
   * A custom format, as i18next's `Formatter.add` takes it: the value, the
   * locale the message is rendered for, and the options the placeholder's
   * arguments, the call and the payload make together.
   */
  export type Format = Parameters<Formatter['add']>[1];

  /**
   * The options `parser()` takes: i18next's own `interpolation` and
   * `missingInterpolationHandler`, the custom `formats` to register, plus
   * where a diagnostic goes. `onReport` is required, `null` included: this
   * package writes to no channel of its own, so where a report goes is stated
   * by whoever builds the parser.
   */
  export type Options = {
    onReport: OnReport | null | undefined;
    interpolation?: InterpolationOptions;
    missingInterpolationHandler?: InitOptions['missingInterpolationHandler'];
    formats?: Record<string, Format>;
  };

  export type T = BaseParser.T<Params, string>;

  export type Factory = (options: Options) => T;

  /**
   * The options `extractParamsFactory()` takes: the `interpolation` options
   * `parser()` takes, so an extractor is built the way the app builds its
   * parser - the prefix, suffix, unescape marker and format separator decide
   * what a placeholder looks like. Extraction formats nothing and reports
   * nothing, so neither `formats` nor `onReport` belongs here.
   */
  export type ExtractOptions = Pick<Options, 'interpolation'>;

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
