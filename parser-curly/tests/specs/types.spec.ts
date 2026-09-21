import { describe, expect, it } from 'vitest';
import i18n from '@sveltekit-i18n/base';
import type { Parser as BaseParser } from '@sveltekit-i18n/base';
import parser, { Config, extractParamsFactory, Parser } from '../../src';

const TRANSLATIONS = { en: { greeting: 'Hi {{applicationName}}!' } };

type Payload = { applicationName: string };
type Props = { test?: { unit?: string } };

// The base core is a runes module compiled by the consumer's bundler, so it
// cannot be constructed under plain Node. These closures are never invoked —
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

  it('keeps the `default` payload key', () => {
    const check = () => {
      const instance = new i18n({ initLocale: 'en', parser: parser({ onReport: null }), translations: TRANSLATIONS });

      instance.t('common.undefined', { default: 'FALLBACK' });
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

  it('types the props slot by the second `Config` argument', () => {
    const check = () => {
      const config: Config<Payload, Props> = { initLocale: 'en', parser: parser({ onReport: null }), translations: TRANSLATIONS };
      const instance = new i18n(config);

      instance.t('greeting', { applicationName: 'App' }, { test: { unit: 'kg' }, number: { maximumFractionDigits: 1 } });
      // @ts-expect-error `unti` is not a property of the declared `test` props
      instance.t('greeting', { applicationName: 'App' }, { test: { unti: 'kg' } });
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

  it('rejects arguments beyond the payload and the modifier props', () => {
    const check = () => {
      const instance = new i18n({ initLocale: 'en', parser: parser({ onReport: null }), translations: TRANSLATIONS });

      // @ts-expect-error `t` takes a payload and modifier props only
      instance.t('greeting', { applicationName: 'App' }, {}, 'extra');
    };

    expect(check).toBeInstanceOf(Function);
  });
});

// A catalogue migrating off version 1 reads a suspect's `found` to decide what
// to rewrite, so the kinds it may hold have to be nameable.
describe('migration typing', () => {
  it('names the kinds a suspect value holds', () => {
    const seen: Parser.SuspectKind[] = [];
    const onSuspectValue: Parser.OnSuspectValue = ({ found }) => { seen.push(...found); };

    // @ts-expect-error a value holds a placeholder or an escape, nothing else
    const beyond: Parser.SuspectKind = 'modifier';

    expect(parser({ onReport: null, onSuspectValue })).toHaveProperty('parse');
    expect(seen).toEqual([]);
    expect(beyond).toBe('modifier');
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

  it('takes the options `parser()` takes, without requiring `onReport`', () => {
    const options: Parser.ExtractOptions = { customModifiers: { test: ({ value }) => value }, onReport: null };

    expect(extractParamsFactory(options)(TRANSLATIONS.en.greeting)).toHaveLength(1);
    expect(extractParamsFactory({ customModifiers: options.customModifiers })(TRANSLATIONS.en.greeting)).toHaveLength(1);
    expect(extractParamsFactory()(TRANSLATIONS.en.greeting)).toHaveLength(1);
  });

  it('reads the props a declared table names', () => {
    const extractParams = extractParamsFactory<Props, 'test'>({
      customModifiers: { test: ({ value, props }) => `${value}${props.unit ?? ''}` },
      modifierDefaults: { test: { unit: 'kg' } },
    });

    expect(extractParams(TRANSLATIONS.en.greeting)).toHaveLength(1);
  });

  it('rejects an option bag the parser does not read', () => {
    // @ts-expect-error the extractor is built from the parser's options, which name no `messages`
    expect(extractParamsFactory({ messages: {} })(TRANSLATIONS.en.greeting)).toHaveLength(1);
  });
});
