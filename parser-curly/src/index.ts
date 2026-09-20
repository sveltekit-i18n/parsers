import { createParser } from '@curly-message/parser';
import type { Config, Cst, Modifier, Parser, Report } from './types';

export type { Config, Cst, Modifier, Parser, Report };

// The build-time half of the contract is a named export of this entry rather
// than a subpath of its own: the package is ESM and declares
// `sideEffects: false`, so a bundle that never reaches it drops it.
export { extractParamsFactory } from './extract';

// `cst` describes a message rather than resolving one, so it is a named export
// for the same reason, and it is the format's own describer: what an editor
// shows is what the message does.
export { cst } from '@curly-message/parser';

const parser: Parser.Factory = (options) => {
  const { resolve } = createParser(options);

  return { parse: (value, [payload, props], locale, id) => resolve(value, { payload, props, locale, id }) };
};

export default parser;
