import type { Parser as P, Config as C } from '@sveltekit-i18n/base';
import type { Formats } from 'intl-messageformat';

// Referenced inline: the declaration bundler folds an import alias back to
// `Options`, which `Parser.Options` then shadows.
type IntlMessageFormatOptions = import('intl-messageformat').Options;

export module Parser {
  export type PayloadDefault = Record<string, any>;

  export type Payload<T = PayloadDefault> = T;

  export type Params<P = PayloadDefault> = [payload?: Payload<P>, formats?: Partial<Formats>];

  /**
   * `failed-message` - the message could not be compiled or formatted and is
   * returned raw. `unserializable-output` - a payload value, or a tag callback,
   * yielded something the message could not be rendered into text with, so the
   * pieces were joined and something was lost on the way.
   */
  export type ReportCode = 'failed-message' | 'unserializable-output';

  export type Report = {
    code: ReportCode;
    key: P.Key;
    locale: P.Locale;
    /** What happened, in one sentence. */
    message: string;
    /** What the underlying formatter threw, where there was a throw. */
    error?: unknown;
  };

  export type OnReport = (report: Report) => void;

  /**
   * The options `parser()` takes: `intl-messageformat`'s own, plus where a
   * diagnostic goes and how many compiled messages are kept. `onReport` is
   * required, `null` included: this package writes to no channel of its own,
   * so where a report goes is stated by whoever builds the parser.
   */
  export type Options = IntlMessageFormatOptions & {
    onReport: OnReport | null | undefined;
    /**
     * How many compiled messages the parser keeps, one count across every
     * locale, the least recently used making room, and as many again for each
     * per-call `formats` object while it lives. `10000` by default; `0`
     * compiles on every call, `Infinity` never evicts. A value that is no
     * count keeps the default.
     */
    cacheLimit?: number;
  };

  export type T = P.T<Params, string>;

  export type Factory = (options: Options) => Parser.T;

  /**
   * The options `extractParamsFactory()` takes: the parse options `parser()`
   * takes, so an extractor is built the way the app builds its parser -
   * `ignoreTag` turns `<b>x</b>` into literal text and the callback the payload
   * carried for it is gone. Extraction formats, caches and reports nothing, so
   * none of `formatters`, `cacheLimit` and `onReport` belongs here.
   */
  export type ExtractOptions = IntlMessageFormatOptions;

  /**
   * Reports the parameters a message names. The build-time half of the parser
   * contract, which is why it is a named export rather than a member of the
   * parser object: a message scanner is of no use while rendering, and a
   * bundle that never reaches it drops it.
   */
  export type ExtractParams = P.ExtractParams;

  export type ExtractParamsFactory = P.ExtractParamsFactory<ExtractOptions>;
}

export type Config<Payload = Parser.PayloadDefault> = C.T<Parser.Params<Payload>, string>;
