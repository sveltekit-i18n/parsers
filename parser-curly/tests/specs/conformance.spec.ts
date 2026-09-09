import { describe, expect, it } from 'vitest';
import { plan } from '@curly-message/conformance';
import { adapter } from '../conformance/adapter';

// The conformance set, one test per case it plans for this implementation.
// The adapter claims every level, so nothing the set ships may be skipped.
describe('conformance', () => {
  const { cases, skipped } = plan(adapter);

  it('plans every case the set ships', () => {
    expect(skipped).toEqual([]);
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const planned of cases) {
    it(`${planned.id} (section ${planned.section})`, () => {
      expect(planned.execute()).toEqual({ ok: true });
    });
  }
});
