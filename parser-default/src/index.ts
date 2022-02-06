import * as defaultModifiers from './modifiers';
import type { Parser, ParserParams, ParserOptions, Modifier, ModifierOption, CustomModifiers } from './types';

export { Parser, ParserParams, ParserOptions, Modifier, ModifierOption, CustomModifiers };

const hasPlaceholders = (text:string = '') => /{{(?:(?!{{|}}).)+}}/.test(`${text}`);

const unesc = (text:string) => text.replace(/\\(?=:|;|{|})/g, '');

const placeholders = (text: string, payload: Record<any, any> = {}, customModifiers: CustomModifiers = {}, locale?: string) => text.replace(/{{\s*(?:(?!{{|}}).)+\s*}}/g, (placeholder: string) => {
  const key = unesc(`${placeholder.match(/(?!{|\s).+?(?!\\[:;]).(?=\s*(?:[:;]|}}$))/)}`);
  const value = payload?.[key];
  let [,defaultValue = ''] = placeholder.match(/.+?(?!\\;).;\s*default\s*:\s*([^\s:;].+?(?:\\[:;]|[^;\s}])*)(?=\s*(?:;|}}$))/i) || [];
  defaultValue = defaultValue || payload?.default || '';

  let [,modifierKey = ''] = placeholder.match(/{{\s*(?:[^;]|(?:\\;))+\s*(?:(?!\\:).[:])\s*(?!\s)((?:\\;|[^;])+?)(?=\s*(?:[;]|}}$))/i) || [];

  if (value === undefined && modifierKey !== 'ne') return defaultValue;

  const hasModifier = !!modifierKey;

  const modifiers: CustomModifiers = { ...defaultModifiers, ...(customModifiers || {}) };

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
    }, [] as ModifierOption[],
  );

  if (!hasModifier && !options.length) return `${value}`;

  return modifier(value, options, defaultValue, locale);

});

const interpolate = (text: string, payload: Record<any, any> = {}, customModifiers?: CustomModifiers, locale?: string):string => {
  if (hasPlaceholders(text)) {
    const output = placeholders(text, payload, customModifiers, locale);

    return interpolate(output, payload, customModifiers, locale);
  } else {
    return unesc(`${text}`);
  }
};

const parser: Parser = ({ customModifiers = {} } = {}) => ({
  parse: (text, [payload], locale, key) => {

    if (payload?.default && text === undefined) {
      text = `${payload.default}`;
    }

    if (text === undefined) {
      text = `${key}`;
    }

    return interpolate(text, payload, customModifiers, locale);
  },
});

export default parser;