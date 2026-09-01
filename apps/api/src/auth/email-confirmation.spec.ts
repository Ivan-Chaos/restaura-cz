import { describe, expect, it } from 'vitest';
import {
  CODE_LENGTH,
  CODE_TTL_MS,
  codeMatches,
  generateCode,
  hashCode,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
} from './email-confirmation.js';

describe('generateCode', () => {
  it('always produces exactly CODE_LENGTH digits', () => {
    // Many draws, because the bug this guards against — dropping the padding on
    // a small number — only shows up on the rare low value.
    for (let draw = 0; draw < 2000; draw += 1) {
      expect(generateCode()).toMatch(new RegExp(`^\\d{${CODE_LENGTH}}$`));
    }
  });

  it('spans the whole range rather than a predictable corner of it', () => {
    const codes = new Set(Array.from({ length: 500 }, generateCode));
    // Collisions are possible but 500 draws from a million should not collapse.
    expect(codes.size).toBeGreaterThan(450);
  });
});

describe('hashCode', () => {
  it('never returns the code itself', () => {
    expect(hashCode('account-1', '123456')).not.toContain('123456');
  });

  it('gives the same code a different hash per account', () => {
    // This is what stops one precomputed table from being matched against
    // every row in the table at once.
    expect(hashCode('account-1', '123456')).not.toBe(hashCode('account-2', '123456'));
  });

  it('is stable for the same inputs', () => {
    expect(hashCode('account-1', '123456')).toBe(hashCode('account-1', '123456'));
  });
});

describe('codeMatches', () => {
  it('accepts the hash of the same code', () => {
    const stored = hashCode('account-1', '123456');
    expect(codeMatches(stored, hashCode('account-1', '123456'))).toBe(true);
  });

  it('rejects the hash of a different code', () => {
    const stored = hashCode('account-1', '123456');
    expect(codeMatches(stored, hashCode('account-1', '123457'))).toBe(false);
  });

  it('rejects a malformed stored hash instead of throwing', () => {
    // timingSafeEqual throws on a length mismatch, which would turn a corrupt
    // row into a 500 rather than a failed verification.
    expect(codeMatches('', hashCode('account-1', '123456'))).toBe(false);
    expect(codeMatches('abcd', hashCode('account-1', '123456'))).toBe(false);
  });
});

describe('policy constants', () => {
  it('caps attempts at the value the CHECK constraint allows', () => {
    // schema.ts declares `attempts between 0 and 5`; a higher cap here would
    // make the database reject the write instead of the code being refused.
    expect(MAX_ATTEMPTS).toBe(5);
  });

  it('expires codes well before the cooldown makes retrying impossible', () => {
    expect(CODE_TTL_MS).toBeGreaterThan(RESEND_COOLDOWN_MS);
  });
});
