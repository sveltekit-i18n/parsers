import type { Config as BaseConfig, Parser as BaseParser } from '@sveltekit-i18n/base';
import type { FluentFunction, TextTransform } from '@fluent/bundle';

export namespace Parser {
  export type PayloadDefault = Record<string, any>;

  export type Payload<T = PayloadDefault> = T;

  /**
   * The rest parameters of `t(key, payload?)`: the variables the message
   * names. There is no per-call formatting slot - a Fluent message states its
   * own formatting, as the options of `NUMBER()` and `DATETIME()`.
   */
  export type Params<P = PayloadDefault> = [payload?: Payload<P>];

  /**
   * `failed-message` - the message could not be compiled as one Fluent
   * pattern, or nothing of it could be formatted, and it is returned raw.
   * `fallback-value` - one placeable could not be resolved (a variable the
   * payload lacks or holds a value Fluent does not format, a term the locale's
   * `terms` lack, a reference to another message, a function nobody
   * registered or one that threw), so the output carries Fluent's fallback
   * for that placeable, `{$name}`, while the rest of the message rendered. A
   * number or a date `Intl` cannot format - for the options of a
   * `FluentNumber` or a `FluentDateTime`, or for the locale - renders
   * unformatted instead: the number, or the date as ISO text.
   */
  export type ReportCode = 'failed-message' | 'fallback-value';

  export type Report = {
    code: ReportCode;
    key: BaseParser.Key;
    locale: BaseParser.Locale;
    /** What happened, in one sentence. */
    message: string;
    /** What Fluent threw, or collected while formatting, where there was one. */
    error?: unknown;
  };

  export type OnReport = (report: Report) => void;

  /**
   * The options `parser()` takes: `@fluent/bundle`'s own (`functions`,
   * `useIsolating`, `transform`), the terms of each locale, where a diagnostic
   * goes and how many compiled messages are kept. `onReport` is required,
   * `null` included: this package writes to no channel of its own, so where a
   * report goes is stated by whoever builds the parser.
   */
  export type Options = {
    onReport: OnReport | null | undefined;
    /**
     * Fluent source per locale, holding the terms (`-brand = Acme`) every
     * message of that locale can reference. A locale is matched without
     * regard to case. Only terms are read: a message the source defines is
     * left out.
     */
    terms?: Record<string, string>;
    /** Functions a message can call beside `NUMBER` and `DATETIME`, by name. */
    functions?: Record<string, FluentFunction>;
    /**
     * Whether a placeable is wrapped in the isolating marks FSI and PDI, in a
     * message holding more than the placeable. `true` by default.
     */
    useIsolating?: boolean;
    /**
     * Applied to every piece of text Fluent resolves - the message's, its
     * variants' and the terms' it references - never to a variable's value,
     * a string literal or what a function returns.
     */
    transform?: TextTransform;
    /**
     * How many compiled messages the parser keeps, the least recently used
     * making room. `10000` by default; `0` compiles on every call, `Infinity`
     * never evicts. A value that is no count keeps the default.
     */
    cacheLimit?: number;
  };

  export type T = BaseParser.T<Params, string>;

  export type Factory = (options: Options) => T;

  /**
   * The options `extractParamsFactory()` takes: the ones `parser()` takes, so
   * an extractor is built from the same bag the app builds its parser from.
   * Only `functions` changes what a message names: a function of that bag
   * named `NUMBER` replaces the builtin, whose variant keys are then no values
   * of its argument.
   * Extraction caches, reports and formats nothing, so neither `cacheLimit`
   * nor `onReport` is among them.
   */
  export type ExtractOptions = Omit<Options, 'onReport' | 'cacheLimit'>;

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
