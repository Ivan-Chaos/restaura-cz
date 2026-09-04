import { randomUUID } from 'node:crypto';

/**
 * Object keys for stored images.
 *
 * A key is a random UUID and never carries an account, menu, section or item
 * id. That is a requirement, not a style choice: stored images are served from
 * a public bucket with no authentication, so a key derived from an id would let
 * anyone who knows one address walk the rest — read a competitor's unpublished
 * dishes, or count a restaurant's menus. Random keys make an address useless
 * without the menu that hands it out.
 *
 * The extension matches the rendition the processor produces, so the storage
 * layer can serve the right `Content-Type` from the key alone.
 */

export const LOGO_PREFIX = 'logos/';
export const DISH_PREFIX = 'dishes/';

/** Keys the storage adapters accept. Anything else is a bug or an attack. */
export const KEY_PATTERN =
  /^(logos\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png|dishes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg)$/;

export function newLogoKey(): string {
  return `${LOGO_PREFIX}${randomUUID()}.png`;
}

export function newDishKey(): string {
  return `${DISH_PREFIX}${randomUUID()}.jpg`;
}

/** Guards the one place a key crosses back into a filesystem path. */
export function isStorageKey(value: string): boolean {
  return KEY_PATTERN.test(value);
}

/** The `Content-Type` a key's rendition was stored with. */
export function contentTypeForKey(key: string): string {
  return key.endsWith('.png') ? 'image/png' : 'image/jpeg';
}
