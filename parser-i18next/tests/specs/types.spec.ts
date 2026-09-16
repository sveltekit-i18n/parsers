import { describe, expect, it } from 'vitest';
import i18n from '@sveltekit-i18n/base';
import type { Parser as BaseParser } from '@sveltekit-i18n/base';
import parser, { Config, extractParamsFactory, Parser } from '../../src';

const TRANSLATIONS = { en: { greeting: 'Hi {{applicationName}}!' } };

type Payload = { applicationName: string };

// The base core is a runes module compiled by the consumer's bundler, so it
// cannot be constructed under plain Node. These closures are never invoked -
// the typecheck step (tsc --noEmit, run by pretest) compiles them, which is
// the entire point of this suite.
describe('payload typing', () => {
  it('accepts a named payload key when no payload type is declared', () => {
    const check = () => {
      const instance = new i18n({ initLocale: 'en', parser: parser({ onReport: null }), translations: TRANSLATIONS });

      instance.t('greeting', { applicationName: 'App' });
    };

    expect(check).toBeInstanceOf(Function);
  });

  it('accepts a named payload key through an annotated config', () => {
    const check = () => {
      const config: Config = { initLocale: 'en', parser: parser({ onReport: null }), translations: TRANSLATIONS };
      const instance = new i18n(config);

      instance.t('greeting', { applicationName: 'App' });
    };

    expect(check).toBeInstanceOf(Function);
  });

  it('accepts a payload declared apart from the call', () => {
    const check = () => {
      const instance = new i18n({ initLocale: 'en', parser: parser({ onReport: null }), translations: TRANSLATIONS });
      const payload = { applicationName: 'App' };

      instance.t('greeting', payload);
    };

    expect(check).toBeInstanceOf(Function);
  });

  it('rejects a typo against a declared payload type', () => {
    const check = () => {
      const config: Config<Payload> = { initLocale: 'en', parser: parser({ onReport: null }), translations: TRANSLATIONS };
      const instance = new i18n(config);

      // @ts-expect-error `aplicationName` is not a key of the declared payload
      instance.t('greeting', { aplicationName: 'App' });
    };

    expect(check).toBeInstanceOf(Function);
  });

  it('types the second argument as the per-call options', () => {
    const check = () => {
      const config: Config<Payload> = { initLocale: 'en', parser: parser({ onReport: null }), translations: TRANSLATIONS };
      const instance = new i18n(config);

      instance.t('greeting', { applicationName: 'App' }, { formatParams: { applicationName: { dateStyle: 'long' } } });
      // @ts-expect-error `formatParam` is not an option a call takes
      instance.t('greeting', { applicationName: 'App' }, { formatParam: {} });
    };

    expect(check).toBeInstanceOf(Function);
  });

  it('requires `onReport` to be stated, `null` included', () => {
    const check = () => {
      parser({ onReport: null });
      parser({ onReport: undefined });
      parser({ onReport: (report) => { console.warn(report.message); } });
      // @ts-expect-error `onReport` must be stated
      parser({});
      // @ts-expect-error `onReport` must be stated
      parser();
    };

    expect(check).toBeInstanceOf(Function);
  });

  it('rejects arguments beyond the payload and the options', () => {
    const check = () => {
      const instance = new i18n({ initLocale: 'en', parser: parser({ onReport: null }), translations: TRANSLATIONS });

      // @ts-expect-error `t` takes a payload and the per-call options only
      instance.t('greeting', { applicationName: 'App' }, {}, 'extra');
    };

    expect(check).toBeInstanceOf(Function);
  });
});

// The extractor needs no base instance, so unlike the suite above these run
// for real: the contract it satisfies is a type, and a value that satisfies it
// is the assertion.
describe('extractor typing', () => {
  it('satisfies the build-time half of the base parser contract', () => {
    const contract: BaseParser.ExtractParamsFactory<Parser.ExtractOptions> = extractParamsFactory;
    const specs: readonly BaseParser.ParamSpec[] = contract()(TRANSLATIONS.en.greeting);

    expect(specs).toEqual([{ name: 'applicationName', kind: 'unknown', optional: false }]);
  });

  it('takes the `interpolation` options `parser()` takes, and nothing else', () => {
    const options: Parser.ExtractOptions = { interpolation: { prefix: '{{', suffix: '}}' } };

    expect(extractParamsFactory(options)(TRANSLATIONS.en.greeting)).toHaveLength(1);
    expect(extractParamsFactory()(TRANSLATIONS.en.greeting)).toHaveLength(1);
    // @ts-expect-error the extractor formats nothing and reports nothing
    expect(extractParamsFactory({ formats: {}, onReport: null })(TRANSLATIONS.en.greeting)).toHaveLength(1);
  });
});
