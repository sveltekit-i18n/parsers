import * as defaultModifiers from './modifiers';
import type { Parser, Modifier, Interpolate, Config } from './types';

export type { Parser, Modifier, Config };

const hasPlaceholders = (value: any) => typeof value === 'string' && /{{(?:(?!{{|}}).)+}}/.test(value);

const unesc = (value: any) => typeof value === 'string' ? value.replace(/\\(?=:|;|{|})/g, '') : value;

const ownValue = (target: any, key?: PropertyKey) => (key !== undefined && !!target && Object.prototype.hasOwnProperty.call(target, key) ? target[key] : undefined);

const placeholders: Interpolate = ({ value: text, props, payload, parserOptions, locale }) => `${text}`.replace(/{{(?:\s*(?!{{|}})\S(?:(?:(?!{{|}})[^\n\r\u2028\u2029])*(?!{{|}})\S)?\s*|[\n\r\u2028\u2029]*[^\S\n\r\u2028\u2029]\s*)}}/g, (placeholder) => {
  const [escapedKey] = placeholder.match(/(?!{|\s)(?:\\[:;]|\\(?![:;])|[^:;\\\n\r\u2028\u2029])*?(?:\\[:;]|\\(?![:;])|[^:;\s\\])(?=\s*(?:[:;]|}}$))/) || [];
  const key = escapedKey === undefined ? undefined : unesc(escapedKey) as keyof Parser.Payload;
  const value = ownValue(payload, key);

  let [, defaultValue = ''] = placeholder.match(/{{(?:[^\\]|\\;|\\(?!;))*?;\s*default\s*:\s*((?:\\[:;]|[^\s:;])(?:\\[:;]|\\(?![:;])|[^;\\])*?)(?=;|}}$)/i) || [];
  defaultValue = defaultValue || ownValue(payload, 'default') || '';

  let [, modifierKey = ''] = placeholder.match(/{{(?:[^;\\]|\\;|\\(?!;))*(?:\\;|[^\\\n\r\u2028\u2029]):\s*(?!\s)((?:\\;|[^;\s])(?:(?:\\;|[^;])*(?:\\;|[^;\s]))?)(?=\s*(?:[;]|}}$))/i) || [];

  if (value === undefined && modifierKey !== 'ne') return defaultValue;

  const hasModifier = !!modifierKey;

  const { customModifiers } = parserOptions || {};
  const modifiers = { ...defaultModifiers, ...(customModifiers || {}) };

  modifierKey = (Object.keys(modifiers).includes(modifierKey) ? modifierKey : 'eq');

  const modifier = modifiers[modifierKey as keyof typeof modifiers];
  const options = (
    placeholder.match(/(?:\\[;]|[^\s:;{}])(?:(?:[^;]|\\[;])*[^:;}])?/gi) as RegExpMatchArray || []
  ).reduce(
    (acc, option, i) => {
      // NOTE: First item is a placeholder and modifier
      if (i > 0) {
        const parts = option.split(/(?<!\\):/);
        const optionKey = unesc(parts[0].trim());
        const optionValue = parts[parts.length - 1].trimStart();

        if (optionKey && optionKey !== 'default' && optionValue) acc.push({ key: optionKey, value: optionValue });
      }

      return acc;
    }, [] as Modifier.ModifierOption[],
  );

  if (!hasModifier && !options.length) return value;

  return modifier({ value, options, props, defaultValue, locale, parserOptions });
});

const MAX_INTERPOLATION_PASSES = 10;

const MAX_INTERPOLATION_LENGTH = 100000;

const MAX_REPORTED_LENGTH = 120;

const excerpt = (value: string) => JSON.stringify(value.length > MAX_REPORTED_LENGTH ? `${value.slice(0, MAX_REPORTED_LENGTH)}...` : value);

const interpolate: Interpolate = ({ value, props, payload, parserOptions, locale }) => {
  let output = value;

  for (let pass = 0; hasPlaceholders(output); pass += 1) {
    if (pass === MAX_INTERPOLATION_PASSES) {
      console.warn(`[i18n]: Interpolation stopped after ${MAX_INTERPOLATION_PASSES} passes. A payload value probably references its own placeholder: ${excerpt(output)}.`);

      break;
    }

    const next = placeholders({ value: output, payload, props, parserOptions, locale });

    if (next.length > MAX_INTERPOLATION_LENGTH) {
      console.warn(`[i18n]: Interpolation stopped before exceeding ${MAX_INTERPOLATION_LENGTH} characters. A payload value probably multiplies its own placeholder: ${excerpt(output)}.`);

      break;
    }

    output = next;
  }

  return unesc(output);
};

const parser: Parser.Factory = (parserOptions) => ({
  parse: (value, [payload, props], locale, key) => {

    const payloadDefault = ownValue(payload, 'default');

    if (payloadDefault && value === undefined) {
      value = payloadDefault;
    }

    if (value === undefined) {
      value = key;
    }

    return interpolate({ value, payload, props, parserOptions, locale });
  },
});

export default parser;