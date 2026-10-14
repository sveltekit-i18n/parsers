import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FluentBundle, FluentResource } from '@fluent/bundle';
import parser, { Parser } from '../../src';
import { readFtl } from '../data/ftl';

const source = readFileSync(new URL('../data/app.ftl', import.meta.url), 'utf8');

const payload = {
  user: 'Jo',
  unreadEmails: 1,
  amount: 3.5,
  date: new Date(Date.UTC(2026, 0, 5)),
  userName: 'Ann',
  photoCount: 3,
  userGender: 'female',
};

// Formatted from the file as it is, as Fluent's own runtime reads it.
const bundle = new FluentBundle('en');

bundle.addResource(new FluentResource(source));

const direct = (key: string) => {
  const [id, attribute] = key.split('.') as [string, string | undefined];
  const message = bundle.getMessage(id)!;
  const pattern = attribute === undefined ? message.value! : message.attributes[attribute];

  return bundle.formatPattern(pattern, payload, []);
};

describe('the `.ftl` loader recipe', () => {
  const { messages, terms } = readFtl(source);

  it('reads every message and attribute, and the terms apart', () => {
    expect(Object.keys(messages)).toEqual([
      'welcome', 'emails', 'price', 'last-login', 'multi', 'shared-photos', 'login-input', 'login-input.placeholder',
      'login-input.aria-label', 'login-input.title', 'attr-only.label', 'brand-says', 'ref', 'escaped', 'blank-lines',
    ]);
    expect(terms).toContain('-brand = Acme');
    expect(terms).toContain('-product = {');
  });

  it('renders each of them as Fluent renders the file, but for a reference to another message', () => {
    const reports: Parser.Report[] = [];
    const { parse } = parser({ onReport: (report) => reports.push(report), terms: { en: terms } });

    Object.entries(messages).forEach(([key, message]) => {
      if (key === 'ref') return;

      expect(parse(message, [payload], 'en', key), key).toBe(direct(key));
    });
    expect(reports).toEqual([]);
    // A message never sees another: a table entry stands alone.
    expect(parse(messages.ref, [payload], 'en', 'ref')).toBe('See \u2068{welcome}\u2069 and \u2068{login-input}\u2069');
  });
});
