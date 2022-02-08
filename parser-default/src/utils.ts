import type { Modifier } from './types';

export const findOption = <T = string>(options: Modifier.ModifierOption[], key: string, defaultValue?: string): T => ((options.find((option) => option.key === key))?.value || defaultValue) as any;
