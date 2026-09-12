import { createParser } from '@curly-message/parser';
import type { Config, Modifier, Parser, Report } from './types';

export type { Config, Modifier, Parser, Report };

// The build-time half of the contract is a named export of this entry rather
// than a subpath of its own: the package is ESM and declares
// `sideEffects: false`, so a bundle that never reaches it drops it.
export { extractParamsFactory } from './extract';

const parser: Parser.Factory = (options) => {
  const { resolve } = createParser(options);

  return { parse: (value, [payload, props], locale, key) => resolve(value, { payload, props, locale, key }) };
};

export default parser;
