import { describe, expect, it } from 'vitest';
import { isPhoneNumber } from './validators.js';

/**
 * The rule is deliberately permissive about *shape* and strict about *content*:
 * an owner may write the number however they print it, but it has to be a
 * number. These cases are the same matrix the frontend's `lib/api/phone.ts`
 * asserts, so the two sides cannot drift.
 */
describe('isPhoneNumber', () => {
  it.each([
    ['international with spaces', '+420 601 234 567'],
    ['international without spaces', '+420601234567'],
    ['national with spaces', '601 234 567'],
    ['grouped with dashes', '601-234-567'],
    ['grouped with parentheses', '(02) 1234 5678'],
    ['surrounding whitespace is trimmed', '  +420 601 234 567  '],
    ['shortest accepted', '123456'],
    ['longest accepted', '+123456789012345'],
  ])('accepts %s', (_label, value) => {
    expect(isPhoneNumber(value)).toBe(true);
  });

  it.each([
    ['empty string', ''],
    ['whitespace only', '   '],
    ['letters', 'call me'],
    ['letters mixed in', '+420 601 ABC 567'],
    ['too few digits', '12345'],
    ['too many digits', '+1234567890123456'],
    ['a plus in the middle', '601+234567'],
    ['an email address', 'owner@example.com'],
  ])('rejects %s', (_label, value) => {
    expect(isPhoneNumber(value)).toBe(false);
  });

  it.each([
    ['a number', 601234567],
    ['null', null],
    ['undefined', undefined],
    ['an array', ['601234567']],
  ])('rejects %s, which is not a string', (_label, value) => {
    expect(isPhoneNumber(value)).toBe(false);
  });
});
