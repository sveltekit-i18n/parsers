import type { Modifier } from './types';
import { getModifierDefaults } from './utils';

export const eq: Modifier.T = ({ value, options = [], defaultValue = '' }) => (options.find(
  ({ key }) => `${key}`.toLowerCase() === `${value}`.toLowerCase(),
) || {}).value || defaultValue;

export const ne: Modifier.T = ({ value, options = [], defaultValue = '' }) => (options.find(
  ({ key }) => `${key}`.toLowerCase() !== `${value}`.toLowerCase(),
) || {}).value || defaultValue;

export const lt: Modifier.T = ({ value, options = [], defaultValue = '' }) => {
  const sortedOptions = options.sort((a, b) => +a.key - +b.key);

  return (sortedOptions.find(
    ({ key }) => +value < +key,
  ) || {}).value || defaultValue;
};

export const gt: Modifier.T = ({ value, options = [], defaultValue = '' }) => {
  const sortedOptions = options.sort((a, b) => +b.key - +a.key);

  return (sortedOptions.find(
    ({ key }) => +value > +key,
  ) || {}).value || defaultValue;
};

export const lte: Modifier.T = ({ value, options = [], defaultValue = '' }) => eq({ value, options, defaultValue: lt({ value, options, defaultValue }) });

export const gte: Modifier.T = ({ value, options = [], defaultValue = '' }) => eq({ value, options, defaultValue: gt({ value, options, defaultValue }) });

export const number: Modifier.T<Modifier.NumberProps> = ({ value, props, defaultValue = '', locale = '', parserOptions }) => {
  if (!locale) return '';

  const { maximumFractionDigits: maximumFractionDigitsDefault, ...defaults } = getModifierDefaults<Modifier.NumberProps>('number', parserOptions);
  const { maximumFractionDigits = maximumFractionDigitsDefault || 2, ...rest } = props?.number || {};

  return new Intl.NumberFormat(locale, { ...defaults, maximumFractionDigits, ...rest }).format(+value || +defaultValue);
};

export const date: Modifier.T<Modifier.DateProps> = ({ value, props, defaultValue = '', locale = '', parserOptions }) => {
  if (!locale) return '';


  const { ...defaults } = getModifierDefaults<Modifier.DateProps>('date', parserOptions);
  const { ...rest } = props?.date || {};

  return new Intl.DateTimeFormat(locale, { ...defaults, ...rest }).format(+value || +defaultValue);
};

const agoMap = [
  { key:'second', multiplier:1000 },
  { key:'minute', multiplier:60 },
  { key:'hour', multiplier:60 },
  { key:'day', multiplier:24 },
  { key:'week', multiplier:7 },
  { key:'month', multiplier:13 / 3 },
  { key:'year', multiplier:12 },
] as { key: Intl.RelativeTimeFormatUnit, multiplier: number }[];

const testResolution = (defKey: string = '', testKey: string = '') => new RegExp(`^${defKey}s?$`).test(testKey);

const findIndex = (currentKey: string) => agoMap.indexOf(agoMap.find(({ key }) => testResolution(key, currentKey)) as any);

const agoFormat = (millis: number, resolution?: Intl.RelativeTimeFormatUnit | 'auto'): [number, Intl.RelativeTimeFormatUnit] => agoMap.reduce(([value, currentKey], { key, multiplier }, index) => {
  if (testResolution(currentKey, resolution)) return [value, currentKey];

  if (!currentKey || index === findIndex(currentKey) + 1) {
    const output = Math.round(value / multiplier);

    if (!currentKey || Math.abs(output) >= 1 || resolution !== 'auto') return [output, key];
  }

  return [value, currentKey];
}, [millis, '' as Intl.RelativeTimeFormatUnit]);

export const ago: Modifier.T<Modifier.AgoProps> = ({ value, defaultValue = '', locale = '', props, parserOptions }) => {
  if (!locale) return '';

  const { format: formatDefault, numeric: numericDefault, ...defaults } = getModifierDefaults<Modifier.AgoProps>('ago', parserOptions);
  const { format = formatDefault || 'auto', numeric = numericDefault || 'auto', ...rest } = props?.ago || {};

  const inputValue = +value || +defaultValue;
  const formatParams = agoFormat(inputValue, format);

  return new Intl.RelativeTimeFormat(locale, { ...defaults, numeric, ...rest }).format(...formatParams);
};