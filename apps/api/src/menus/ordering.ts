/**
 * Sibling ordering, kept pure so the tricky part is testable without a
 * database. Positions are always the dense range 0..n-1; callers persist the
 * returned order by index.
 */

export interface Positioned {
  id: string;
}

/**
 * Returns `siblings` with `id` moved to `target`, clamped into range. Returns
 * the list unchanged when the row is already there.
 */
export function moveWithin<T extends Positioned>(siblings: T[], id: string, target: number): T[] {
  const from = siblings.findIndex((sibling) => sibling.id === id);
  if (from === -1) return siblings;

  const clamped = Math.min(Math.max(target, 0), siblings.length - 1);
  if (clamped === from) return siblings;

  const reordered = [...siblings];
  const [moved] = reordered.splice(from, 1);
  if (moved === undefined) return siblings;
  reordered.splice(clamped, 0, moved);
  return reordered;
}
