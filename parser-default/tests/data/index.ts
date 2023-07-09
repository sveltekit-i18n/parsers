import parser from '../../src';
import type { Config } from '../../src/types';

export { default as TRANSLATIONS } from './translations';

export const CONFIG: Config = {
  initLocale: 'en',
  parser: parser({
    customModifiers: {
      test: ({ value }) => value,
    },
  }),
  loaders: [
    {
      key: 'common',
      locale: 'EN',
      loader: async () => (await import('../data/translations/en/common.json')).default,
    },
    {
      key: 'route1',
      locale: 'EN',
      routes: [/./],
      loader: async () => (await import('../data/translations/en/route.json')).default,
    },
    {
      key: 'route2',
      locale: 'EN',
      routes: ['/path#hash?a=b&c=d'],
      loader: async () => (await import('../data/translations/en/route.json')).default,
    },
    {
      key: 'common',
      locale: 'cs',
      loader: async () => (await import('../data/translations/cs/common.json')).default,
    },
  ],
};