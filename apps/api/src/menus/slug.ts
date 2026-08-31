import { randomInt } from 'node:crypto';

/** No vowels (avoids accidental words) and no look-alike characters. */
const SUFFIX_ALPHABET = '23456789bcdfghjkmnpqrstvwxz';
const SUFFIX_LENGTH = 6;

/**
 * Czech menu names are full of diacritics. Decomposing to NFD and dropping the
 * combining marks turns "Polévky" into "polevky" rather than losing the
 * accented letters entirely.
 */
export function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');

  // A name written entirely in a non-Latin script slugifies to nothing; the
  // random suffix still makes the address unique.
  return base === '' ? 'menu' : base;
}

function randomSuffix(): string {
  let suffix = '';
  for (let i = 0; i < SUFFIX_LENGTH; i += 1) {
    suffix += SUFFIX_ALPHABET[randomInt(SUFFIX_ALPHABET.length)];
  }
  return suffix;
}

/**
 * Readable enough to share out loud, random enough that nobody can guess a
 * neighbour's menu address.
 */
export function generateSlug(name: string): string {
  return `${slugify(name)}-${randomSuffix()}`;
}
