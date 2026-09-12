import { createExtractor } from '@curly-message/parser';
import type { Modifier, Parser, Report } from './types';

export type { Modifier, Parser, Report };

/**
 * Builds the extractor the base library's build-time contract describes, from
 * the same options `parser()` takes. The format's own scanner answers it: what
 * a message expects of its payload is fixed when the message is written, so a
 * catalogue is read for its parameters rather than them being discovered at
 * render time.
 */
export const extractParamsFactory: Parser.ExtractParamsFactory = createExtractor;
