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
      loader: () => import('../data/translations/en/common.json'),
    },
    {
      key: 'route1',
      locale: 'EN',
      routes: [/./],
      loader: () => import('../data/translations/en/route.json'),
    },
    {
      key: 'route2',
      locale: 'EN',
      routes: ['/path#hash?a=b&c=d'],
      loader: () => import('../data/translations/en/route.json'),
    },
    {
      key: 'common',
      locale: 'cs',
      loader: () => import('../data/translations/cs/common.json'),
    },
  ],
};