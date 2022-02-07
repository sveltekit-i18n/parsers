import type { IModifier } from './types';

export const findOption = <T = string>(options: IModifier.ModifierOption[], key: string, defaultValue?: string): T => ((options.find((option) => option.key === key))?.value || defaultValue) as any;
