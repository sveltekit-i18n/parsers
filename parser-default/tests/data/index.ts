import parser, { Parser } from '../../src';

import type { Config } from '@sveltekit-i18n/base';

export { default as TRANSLATIONS } from './translations';

export const CONFIG: Config.T<Parser.Params> = {
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
      loader: async () => (import('../data/translations/en/common.json')),
    },
    {
      key: 'route1',
      locale: 'EN',
      routes: [/./],
      loader: async () => (import('../data/translations/en/route.json')),
    },
    {
      key: 'route2',
      locale: 'EN',
      routes: ['/path#hash?a=b&c=d'],
      loader: async () => (import('../data/translations/en/route.json')),
    },
    {
      key: 'common',
      locale: 'cs',
      loader: async () => (import('../data/translations/cs/common.json')),
    },
  ],
};