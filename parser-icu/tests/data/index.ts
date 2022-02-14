import parser from '../../src';
import type { Config } from '../../src/types';

export const CONFIG: Config = {
  initLocale: 'en',
  parser: parser(),
  loaders: [
    {
      key: 'common',
      locale: 'EN',
      loader: () => import('./common.json'),
    },
  ],
};