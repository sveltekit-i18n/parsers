import { createParser } from '@curly-message/parser';
import type { Config, Modifier, Parser, Report } from './types';

export type { Config, Modifier, Parser, Report };

const parser: Parser.Factory = (options) => {
  const { resolve } = createParser(options);

  return { parse: (value, [payload, props], locale, key) => resolve(value, { payload, props, locale, key }) };
};

export default parser;
