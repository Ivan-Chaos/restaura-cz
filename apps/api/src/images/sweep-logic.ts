import type { StoredObject } from './storage/image-storage.js';

/**
 * How long an unreferenced object is left alone before it counts as litter.
 *
 * Uploading writes the object first and attaches it a moment later, so a fresh
 * object with no row is almost always a request still in flight rather than a
 * mistake. A day is far longer than any request and far shorter than anyone
 * would notice the storage.
 */
export const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Which stored objects nothing points at any more.
 *
 * Pure, and separated from the command that calls it, because the interesting
 * part is a decision — "unreferenced *and* old enough" — and a decision is
 * worth testing without a bucket and a database to hand.
 */
export function selectOrphans(
  objects: StoredObject[],
  referenced: ReadonlySet<string>,
  now: Date = new Date(),
): string[] {
  const cutoff = now.getTime() - ORPHAN_GRACE_MS;

  return objects
    .filter((object) => !referenced.has(object.key))
    .filter((object) => object.lastModified.getTime() < cutoff)
    .map((object) => object.key);
}
