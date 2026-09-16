import { describe, it } from 'vitest';
import { CONTRACT_CHECKS } from '../../../contract';
import parser from '../../src';

// What base requires of every parser, checked against this one. The
// differential suite certifies that a message renders as i18next renders it;
// this set certifies that the parser can be called the way base calls it.
const subject = {
  parser: parser({ onReport: null }),
  messages: {
    plain: 'Hello!',
    parameterized: 'Hi {{value}}!',
    malformed: 'Hi {{value',
  },
};

describe('base parser contract', () => {
  CONTRACT_CHECKS.forEach(({ name, run }) => it(name, () => run(subject)));
});
