import common from './common.json';

// The fixtures spell formats, not language, so one catalogue serves every
// locale the suite renders in.
export const TRANSLATIONS: Record<string, any> = {
  en: { common },
  cs: { common },
  de: { common },
};
