import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * The rules governing email confirmation codes, gathered here because they are
 * a set: the code's short length is only safe because attempts are capped, and
 * the cap is only usable because a new code can be requested.
 */

/**
 * Long enough that guessing needs the attempt cap to be defeated, short enough
 * to be typed from a phone screen without re-reading.
 */
export const CODE_LENGTH = 6;

/** Fifteen minutes: long enough for a slow inbox, short enough that a leaked code is stale. */
export const CODE_TTL_MS = 15 * 60 * 1000;

/**
 * Failed guesses allowed per issued code. Six digits is a million
 * possibilities, so five tries leaves a 1-in-200,000 chance of a lucky hit —
 * and the cap, not the length, is what makes that true. Mirrored by the
 * `email_confirmation_attempts_range` CHECK constraint.
 */
export const MAX_ATTEMPTS = 5;

/**
 * How long before another code can be requested. Stops the resend button from
 * being an open relay to a stranger's inbox, without needing a rate limiter.
 */
export const RESEND_COOLDOWN_MS = 60 * 1000;

/**
 * A uniformly random code, zero-padded so every code is the same length.
 *
 * `randomInt` and not `Math.random`: this value guards an account, and a
 * predictable generator would make the attempt cap pointless.
 */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

/**
 * The account id is mixed in so that the million possible hashes cannot be
 * precomputed once and then matched against every row in the table — an
 * attacker with a database dump has to attack each account separately.
 */
export function hashCode(accountId: string, code: string): string {
  return createHash('sha256').update(`${accountId}.${code}`).digest('hex');
}

/**
 * Constant-time comparison, so the response cannot be timed to learn how much
 * of a guess was correct.
 */
export function codeMatches(storedHash: string, candidateHash: string): boolean {
  const stored = Buffer.from(storedHash, 'hex');
  const candidate = Buffer.from(candidateHash, 'hex');
  if (stored.length !== candidate.length) return false;
  return timingSafeEqual(stored, candidate);
}
