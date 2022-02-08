import * as defaultModifiers from './modifiers';
import type { IParser, IModifier, Interpolate } from './types';

export { IParser, IModifier };

const hasPlaceholders = (value: any) => typeof value === 'string' && /{{(?:(?!{{|}}).)+}}/.test(`${value}`);

const unesc = (value :any) => typeof value === 'string' ? `${value}`.replace(/\\(?=:|;|{|})/g, '') : value;

const placeholders: Interpolate = ({ value: text, props, payload = {}, customModifiers = {}, locale }) => `${text}`.replace(/{{\s*(?:(?!{{|}}).)+\s*}}/g, (placeholder) => {
  const key = unesc(placeholder.match(/(?!{|\s).+?(?!\\[:;]).(?=\s*(?:[:;]|}}$))/));
  const value = payload?.[key];
  let [,defaultValue = ''] = placeholder.match(/.+?(?!\\;).;\s*default\s*:\s*([^\s:;].+?(?:\\[:;]|[^;\s}])*)(?=\s*(?:;|}}$))/i) || [];
  defaultValue = defaultValue || payload?.default || '';

  let [,modifierKey = ''] = placeholder.match(/{{\s*(?:[^;]|(?:\\;))+\s*(?:(?!\\:).[:])\s*(?!\s)((?:\\;|[^;])+?)(?=\s*(?:[;]|}}$))/i) || [];

  if (value === undefined && modifierKey !== 'ne') return defaultValue;

  const hasModifier = !!modifierKey;

  const modifiers: IModifier.CustomModifiers = { ...defaultModifiers, ...(customModifiers || {}) };

  modifierKey = Object.keys(modifiers).includes(modifierKey) ? modifierKey : 'eq';

  const modifier = modifiers[modifierKey];
  const options = (
    placeholder.match(/[^\s:;{](?:[^;]|\\[;])+[^\s:;}]/gi) || []
  ).reduce(
    (acc, option, i) => {
      // NOTE: First item is placeholder and modifier
      if (i > 0) {
        const optionKey = unesc(`${option.match(/(?:(?:\\:)|[^:])+/)}`.trim());
        const optionValue = `${option.match(/(?:(?:\\:)|[^:])+$/)}`.trim();

        if (optionKey && optionKey !== 'default' && optionValue) return ([ ...acc, { key: optionKey, value: optionValue }]);
      }

      return acc;
    }, [] as IModifier.ModifierOption[],
  );

  if (!hasModifier && !options.length) return `${value}`;

  return modifier({ value, options, props, defaultValue, locale });

});

const interpolate: Interpolate = ({ value, props, payload = {}, customModifiers, locale }) => {
  if (hasPlaceholders(value)) {
    const output = placeholders({ value, payload, props, customModifiers, locale });

    return interpolate({ value: output, payload, props, customModifiers, locale });
  } else {
    return unesc(value);
  }
};

// TODO: Add Payload and Custom modifiers generic types
const parser: IParser.ParserFactory = ({ customModifiers = {} } = {}) => ({
  parse: (value, [payload, props], locale, key) => {

    if (payload?.default && value === undefined) {
      value = `${payload.default}`;
    }

    if (value === undefined) {
      value = `${key}`;
    }

    return interpolate({ value, payload, props, customModifiers, locale });
  },
});

export default parser;