import { describe, expect, it } from 'vitest';
import {
  contentTypeForKey,
  DISH_PREFIX,
  isStorageKey,
  LOGO_PREFIX,
  newDishKey,
  newLogoKey,
} from './keys.js';

describe('storage keys', () => {
  it('puts logos and dishes under their own prefixes', () => {
    expect(newLogoKey().startsWith(LOGO_PREFIX)).toBe(true);
    expect(newDishKey().startsWith(DISH_PREFIX)).toBe(true);
  });

  it('ends each key with the extension its rendition is stored as', () => {
    expect(newLogoKey()).toMatch(/\.png$/);
    expect(newDishKey()).toMatch(/\.jpg$/);
    expect(contentTypeForKey(newLogoKey())).toBe('image/png');
    expect(contentTypeForKey(newDishKey())).toBe('image/jpeg');
  });

  it('never repeats a key', () => {
    const keys = new Set(Array.from({ length: 500 }, () => newLogoKey()));
    expect(keys.size).toBe(500);
  });

  it('accepts the keys it generates', () => {
    expect(isStorageKey(newLogoKey())).toBe(true);
    expect(isStorageKey(newDishKey())).toBe(true);
  });

  it.each([
    ['a traversal attempt', 'logos/../../etc/passwd'],
    ['a nested path', 'logos/a/b.png'],
    ['the wrong extension for the prefix', 'logos/2f1c8b3a-1111-4222-8333-444455556666.jpg'],
    ['an unknown prefix', 'uploads/2f1c8b3a-1111-4222-8333-444455556666.png'],
    ['a non-uuid name', 'logos/logo.png'],
    ['an empty key', ''],
  ])('rejects %s', (_label, key) => {
    expect(isStorageKey(key)).toBe(false);
  });
});
