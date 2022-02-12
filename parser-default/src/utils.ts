import { Modifier } from '.';
import type { Parser } from './types';

export const getModifierDefaults = <T>(key: keyof Modifier.Defaults, parserOptions: Parser.Options) => {
  const { modifierDefaults } = parserOptions || {};
  const { [key]: output } = modifierDefaults || {};

  return (output || {}) as T;
};