import type { Parser } from './types';

export const getModifierDefaults = <T>(key: keyof T, parserOptions: Parser.Options) => {
  const { modifierDefaults } = parserOptions || {};
  const { [key]: output } = modifierDefaults || {};

  return (output || {}) as Required<T>[keyof T];
};