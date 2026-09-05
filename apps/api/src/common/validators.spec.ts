import { describe, expect, it } from 'vitest';
import { plainToInstance } from 'class-transformer';
import { IsArray, IsEmpty, IsIn, IsOptional, validateSync } from 'class-validator';
import { AllOrNoneOf, OptionalButNotNull, isPhoneNumber } from './validators.js';

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

/**
 * The all-or-none rule exists because a partial group is worse than an absent
 * one: ignoring three of four crop coordinates would store a centre-crop while
 * the owner believed they had chosen a framing.
 */
describe('AllOrNoneOf', () => {
  class Group {
    @IsOptional()
    a?: number;

    @IsOptional()
    b?: number;

    @IsEmpty()
    @AllOrNoneOf(['a', 'b'])
    readonly both?: never;
  }

  function codesFor(body: Record<string, unknown>): string[] {
    return validateSync(plainToInstance(Group, body)).flatMap((error) =>
      Object.keys(error.constraints ?? {}).map((name) => `${error.property}:${name}`),
    );
  }

  it('accepts the whole group', () => {
    expect(codesFor({ a: 1, b: 2 })).toEqual([]);
  });

  it('accepts none of the group', () => {
    expect(codesFor({})).toEqual([]);
  });

  it.each([
    ['only the first', { a: 1 }],
    ['only the second', { b: 2 }],
  ])('rejects %s, reporting against the declaring property', (_label, body) => {
    expect(codesFor(body)).toContain('both:isCrop');
  });
});

/**
 * The distinction this decorator exists for.
 *
 * `@IsOptional()` waves both `undefined` and `null` past every validator below
 * it. For a nullable column that is right — it is how `description: null`
 * clears a description. For a NOT NULL column it is a trap: the null reaches
 * the UPDATE and comes back to the caller as a 500 with nothing actionable in
 * it. These cases pin the two behaviours side by side so the difference stays
 * visible to whoever adds the next PATCH field.
 */
describe('OptionalButNotNull', () => {
  class Patch {
    /** Nullable column: null is a real instruction, so it must pass. */
    @IsOptional()
    @IsArray()
    nullable?: string[] | null;

    /** NOT NULL column with a default: there is no "no value", only the empty one. */
    @OptionalButNotNull()
    @IsArray()
    @IsIn(['vegan', 'kosher'], { each: true })
    required?: string[];
  }

  function codesFor(body: Record<string, unknown>): string[] {
    return validateSync(plainToInstance(Patch, body)).flatMap((error) =>
      Object.keys(error.constraints ?? {}).map((name) => `${error.property}:${name}`),
    );
  }

  it('lets an absent field through, like @IsOptional would', () => {
    expect(codesFor({})).toEqual([]);
  });

  it('lets a valid value through', () => {
    expect(codesFor({ required: ['vegan'] })).toEqual([]);
  });

  it('lets an empty array through, because clearing is a change', () => {
    expect(codesFor({ required: [] })).toEqual([]);
  });

  it('rejects null instead of waving it past', () => {
    expect(codesFor({ required: null })).toContain('required:isArray');
  });

  it('still applies the validators below it', () => {
    expect(codesFor({ required: ['spicy'] })).toContain('required:isIn');
  });

  it('leaves @IsOptional alone: a nullable field still accepts null', () => {
    expect(codesFor({ nullable: null })).toEqual([]);
  });
});
