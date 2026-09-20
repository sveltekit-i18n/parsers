import { describe, expect, it } from 'vitest';
import { cst } from '../../src';
import type { Cst } from '../../src';
import { TRANSLATIONS } from '../data';

const leaves = (node: Cst.Node): Cst.Node[] => ('nodes' in node ? node.nodes.flatMap(leaves) : [node]);

const initLocale = 'en';

// What the tree says about a message is pinned by the reference
// implementation, and the format's conformance set drives it; these tests
// cover what this package adds: the describer reached through the package's
// own entry point, taking a message and no options.
describe('cst', () => {
  it('describes a message as the parts it is written from', () => {
    const tree = cst(TRANSLATIONS[initLocale].common.greeting);

    expect(tree.nodes.map(({ type }) => type)).toEqual(['text', 'placeholder', 'text']);
  });

  it('spans the whole message, leaf by leaf', () => {
    const message = TRANSLATIONS[initLocale].common.greeting;
    const tree = cst(message);

    expect(leaves(tree).map(({ start, end }) => message.slice(start, end)).join('')).toBe(message);
  });

  it('reads the key a placeholder names', () => {
    const [, placeholder] = cst(TRANSLATIONS[initLocale].common.greeting).nodes;
    const key = (placeholder as Cst.Placeholder).nodes.find((node) => node.type === 'key');

    expect(key).toMatchObject({ name: 'name' });
  });
});
