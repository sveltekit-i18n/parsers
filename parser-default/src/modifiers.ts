import type { Modifier } from './types';

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

export const number: Modifier.T<Intl.NumberFormatOptions> = ({ value, params, defaultValue = '', locale = '' }) => {
  if (!locale) return '';

  const { maximumFractionDigits = 2, ...rest } = params || {};

  return new Intl.NumberFormat(locale, { maximumFractionDigits, ...rest }).format(+value || +defaultValue);
};

export const date: Modifier.T<Intl.DateTimeFormatOptions> = ({ value, params, defaultValue = '', locale = '' }) => {
  if (!locale) return '';

  const { dateStyle = 'medium', timeStyle = 'short', ...rest } = params || {};

  return new Intl.DateTimeFormat(locale, { dateStyle, timeStyle, ...rest }).format(+value || +defaultValue);
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

const findIndex = (currentKey: string) => agoMap.indexOf(agoMap.find((item) => item.key === currentKey) as any);

const autoFormat = (millis: number): [number, Intl.RelativeTimeFormatUnit] => agoMap.reduce(([value, currentKey], { key, multiplier }, index) => {
  if (!currentKey || index === findIndex(currentKey) + 1) {
    const output = Math.round(value / multiplier);

    if (!currentKey || Math.abs(output) >= 1) return [output, key];
  }

  return [value, currentKey];
}, [millis, '' as Intl.RelativeTimeFormatUnit]);

export const ago: Modifier.T<Intl.RelativeTimeFormatOptions & { format: Intl.RelativeTimeFormatUnit | 'auto' }> = ({ value, defaultValue = '', locale = '', params }) => {
  if (!locale) return '';

  const { format = 'auto', numeric = 'auto', ...rest } = params || {};

  const inputValue = (+value || +defaultValue) - Date.now();

  const formatParams = (format ===  'auto') ? autoFormat(inputValue) : [inputValue, format] as [number, Intl.RelativeTimeFormatUnit];

  return new Intl.RelativeTimeFormat(locale, { numeric, ...rest }).format(...formatParams);
};