import i18n from '@sveltekit-i18n/base';
import parser, { Config } from '../../src';

const TRANSLATIONS = { en: { greeting: 'Hi {{applicationName}}!' } };

type Payload = { applicationName: string };

describe('payload typing', () => {
  it('accepts a named payload key when no payload type is declared', async () => {
    const config = { initLocale: 'en', parser: parser(), translations: TRANSLATIONS };
    const { t, loadConfig } = new i18n(config);

    await loadConfig(config);

    expect(t.get('greeting', { applicationName: 'App' })).toBe('Hi App!');
  });

  it('accepts a named payload key through an annotated config', async () => {
    const config: Config = { initLocale: 'en', parser: parser(), translations: TRANSLATIONS };
    const { t, loadConfig } = new i18n(config);

    await loadConfig(config);

    expect(t.get('greeting', { applicationName: 'App' })).toBe('Hi App!');
  });

  it('accepts a payload declared apart from the call', async () => {
    const config = { initLocale: 'en', parser: parser(), translations: TRANSLATIONS };
    const { t, loadConfig } = new i18n(config);

    await loadConfig(config);

    const payload = { applicationName: 'App' };

    expect(t.get('greeting', payload)).toBe('Hi App!');
  });

  it('keeps the `default` payload key', async () => {
    const config = { initLocale: 'en', parser: parser(), translations: TRANSLATIONS };
    const { t, loadConfig } = new i18n(config);

    await loadConfig(config);

    expect(t.get('common.undefined', { default: 'FALLBACK' })).toBe('FALLBACK');
  });

  it('rejects a typo against a declared payload type', async () => {
    const config: Config<Payload> = { initLocale: 'en', parser: parser(), translations: TRANSLATIONS };
    const { t, loadConfig } = new i18n(config);

    await loadConfig(config);

    // @ts-expect-error `aplicationName` is not a key of the declared payload
    expect(t.get('greeting', { aplicationName: 'App' })).toBe('Hi !');
  });

  it('rejects arguments beyond the payload and the modifier props', async () => {
    const config = { initLocale: 'en', parser: parser(), translations: TRANSLATIONS };
    const { t, loadConfig } = new i18n(config);

    await loadConfig(config);

    // @ts-expect-error `t` takes a payload and modifier props only
    expect(t.get('greeting', { applicationName: 'App' }, {}, 'extra')).toBe('Hi App!');
  });
});
