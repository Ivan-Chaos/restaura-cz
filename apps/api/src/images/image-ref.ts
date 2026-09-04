import type { ImageStorage } from './storage/image-storage.js';

/**
 * A stored image as it crosses the wire.
 *
 * The storage key deliberately does not appear: a key is an internal address,
 * and the only thing a consumer needs is a URL it can put in an `src`. The
 * dimensions travel with it so the page can reserve the right box before the
 * bytes arrive, which is what keeps a photographed menu from shifting as it
 * loads.
 */
export interface ImageRef {
  url: string;
  width: number;
  height: number;
}

/** The image columns as every table that carries one stores them. */
export interface StoredImageColumns {
  key: string | null;
  width: number | null;
  height: number | null;
}

/**
 * Builds the wire shape from a row's three columns, or `null` when there is no
 * image.
 *
 * All three are checked rather than only the key: the database enforces
 * all-or-none with a CHECK, so a partial row cannot exist, but reading as if it
 * might is what makes this function total instead of one that can produce a
 * `width: null` the type says is impossible.
 */
export function toImageRef(storage: ImageStorage, columns: StoredImageColumns): ImageRef | null {
  const { key, width, height } = columns;
  if (key === null || width === null || height === null) return null;

  return { url: storage.publicUrl(key), width, height };
}
