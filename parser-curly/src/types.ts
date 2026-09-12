import type { Config as BaseConfig, Parser as BaseParser } from '@sveltekit-i18n/base';
import type { Modifier, Parser as CurlyParser, Report } from '@curly-message/parser';

export type { Modifier, Report };

export namespace Parser {
  /**
   * The options `parser()` takes, handed on to `@curly-message/parser`:
   * `customModifiers`, `modifierDefaults` and `onReport`. `onReport` is
   * required, `null` included: this package writes to no channel of its own,
   * so where a report goes is stated by whoever builds the parser.
   */
  export type Options<Key extends string = Modifier.Key, Props = Modifier.DefaultProps> = Omit<CurlyParser.Options<Key, Props>, 'onReport'> & { onReport: OnReport | null | undefined };

  export type OnReport = CurlyParser.OnReport;

  export type PayloadDefault = CurlyParser.PayloadDefault;

  export type Payload<T = any, Props = Modifier.DefaultProps> = CurlyParser.Payload<T, Props>;

  /**
   * The rest parameters of `t(key, payload?, props?)`: the values the message's
   * placeholders name, then the per-call formatting options keyed by modifier
   * name.
   */
  export type Params<P = PayloadDefault, M = Modifier.DefaultProps> = [payload?: Payload<P, M>, props?: Modifier.Props<M>];

  export type T<P extends BaseParser.Params = Params> = BaseParser.T<P, string>;

  export type Factory = <Payload = {}, Props = {}, Key extends string = Modifier.Key>(options: Options<Key, Props>) => T<Params<Payload & PayloadDefault, Props & Modifier.DefaultProps>>;

  /**
   * The options `extractParamsFactory()` takes: the same ones `parser()` takes,
   * so an extractor is built the way the app builds its parser — a custom
   * modifier registered under a name the format defines changes what a message
   * naming it says about its value. `onReport` is not required here, and
   * neither it nor `modifierDefaults` reaches anything: extraction formats
   * nothing and reports nothing.
   */
  export type ExtractOptions<Key extends string = Modifier.Key, Props = Modifier.DefaultProps> = CurlyParser.Options<Key, Props>;

  /**
   * Reports the parameters a message names. The build-time half of the parser
   * contract, which is why it is a named export rather than a member of the
   * parser object: a message scanner is of no use while rendering, and a
   * bundle that never reaches it drops it.
   */
  export type ExtractParams = BaseParser.ExtractParams;

  export type ExtractParamsFactory = <Props = {}, Key extends string = Modifier.Key>(options?: ExtractOptions<Key, Props>) => ExtractParams;
}

/**
 * The base config carrying this parser, typed by the payload the messages
 * expect and by the formatting props a call may pass.
 */
export type Config<P = Parser.PayloadDefault, M = Modifier.DefaultProps> = BaseConfig.T<Parser.Params<P, M>, string>;
