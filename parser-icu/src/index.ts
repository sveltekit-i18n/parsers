import { IntlMessageFormat } from 'intl-messageformat';
import type { Parser, Config } from './types';

export type { Parser, Config };


const parser: Parser.Factory = (parserOptions) => ({
  parse: (message, [payload, formats], locale, key) => {

    if (message === undefined) {
      return `${key}`;
    }

    return new IntlMessageFormat(message, locale, formats, parserOptions).format(payload);
  },
});

export default parser;