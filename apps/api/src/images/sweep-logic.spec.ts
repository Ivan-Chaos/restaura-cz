import { describe, expect, it } from 'vitest';
import { ORPHAN_GRACE_MS, selectOrphans } from './sweep-logic.js';

const NOW = new Date('2026-09-03T12:00:00.000Z');

function object(key: string, ageMs: number) {
  return { key, lastModified: new Date(NOW.getTime() - ageMs) };
}

const HOUR = 60 * 60 * 1000;

/**
 * The sweep exists for two failure windows that no amount of care inside a
 * request can close: an object written whose row update never landed, and a
 * delete that failed after the row was already updated. Its whole job is to
 * distinguish those from an upload that is merely still in progress.
 */
describe('selectOrphans', () => {
  it('collects an unreferenced object once it is old enough', () => {
    const objects = [object('dishes/old.jpg', ORPHAN_GRACE_MS + HOUR)];

    expect(selectOrphans(objects, new Set(), NOW)).toEqual(['dishes/old.jpg']);
  });

  it('leaves a young unreferenced object alone, because it may still be arriving', () => {
    // An upload writes the object and attaches it a moment later. Sweeping in
    // that gap would delete the picture out from under a request that is about
    // to succeed.
    const objects = [object('dishes/new.jpg', HOUR)];

    expect(selectOrphans(objects, new Set(), NOW)).toEqual([]);
  });

  it('never collects an object a row points at, however old', () => {
    const objects = [object('logos/kept.png', ORPHAN_GRACE_MS * 30)];

    expect(selectOrphans(objects, new Set(['logos/kept.png']), NOW)).toEqual([]);
  });

  it('leaves an object exactly at the cutoff, so the boundary is not off by one', () => {
    const objects = [object('dishes/edge.jpg', ORPHAN_GRACE_MS)];

    expect(selectOrphans(objects, new Set(), NOW)).toEqual([]);
  });

  it('sorts the wheat from the chaff in one pass', () => {
    const objects = [
      object('logos/referenced.png', ORPHAN_GRACE_MS * 2),
      object('dishes/orphan.jpg', ORPHAN_GRACE_MS * 2),
      object('dishes/in-flight.jpg', 1000),
      object('logos/orphan.png', ORPHAN_GRACE_MS + 1),
    ];

    expect(selectOrphans(objects, new Set(['logos/referenced.png']), NOW).sort()).toEqual([
      'dishes/orphan.jpg',
      'logos/orphan.png',
    ]);
  });

  it('finds nothing in an empty store', () => {
    expect(selectOrphans([], new Set(), NOW)).toEqual([]);
  });
});
