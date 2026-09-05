/**
 * Naming a downloaded document.
 *
 * The owner will find this file in a downloads folder next to a hundred others,
 * so it carries the menu's own name. The slug rule matches the one the API uses
 * for public addresses (`apps/api/src/menus/slug.ts`) — Czech menu names are
 * full of diacritics, and "Polévky" must become "polevky" rather than losing
 * its letters or arriving as percent-escapes in a file manager.
 */

const MAX_SLUG_LENGTH = 60;

export function slugForFilename(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");

  // A name written entirely in a non-Latin script slugifies to nothing.
  return slug === "" ? "menu" : slug;
}

/** `<menu name>-<localized suffix>.pdf`, safe on every common file system. */
export function documentFilename(menuName: string, suffix: string): string {
  return `${slugForFilename(menuName)}-${slugForFilename(suffix)}.pdf`;
}

/**
 * The `Content-Disposition` value.
 *
 * Both forms on purpose: `filename` for anything old that only reads ASCII, and
 * RFC 5987's `filename*` for everything current. Our slug is ASCII already, so
 * the two agree — the second form is what keeps that true if the rule ever
 * relaxes.
 */
export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Reads the name back off a response, so the browser-side download uses the
 * name the server chose rather than a second guess at it. Prefers the encoded
 * form, which is the authoritative one when both are present.
 */
export function filenameFromDisposition(
  header: string | null,
  fallback: string,
): string {
  if (!header) return fallback;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // A malformed header is not worth failing a download over.
    }
  }

  const plain = /filename="([^"]+)"/i.exec(header);
  return plain?.[1] ?? fallback;
}
