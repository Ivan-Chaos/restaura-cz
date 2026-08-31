import { describe, expect, it } from 'vitest';
import { moveWithin } from './ordering.js';

const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

describe('moveWithin', () => {
  it('moves a row forward', () => {
    expect(ids(moveWithin(list, 'a', 2))).toEqual(['b', 'c', 'a']);
  });

  it('moves a row backward', () => {
    expect(ids(moveWithin(list, 'c', 0))).toEqual(['c', 'a', 'b']);
  });

  it('leaves the order alone when the row is already at the target', () => {
    expect(ids(moveWithin(list, 'b', 1))).toEqual(['a', 'b', 'c']);
  });

  it('clamps a target past the end', () => {
    expect(ids(moveWithin(list, 'a', 99))).toEqual(['b', 'c', 'a']);
  });

  it('clamps a negative target', () => {
    expect(ids(moveWithin(list, 'c', -5))).toEqual(['c', 'a', 'b']);
  });

  it('returns the list unchanged for an unknown id', () => {
    expect(ids(moveWithin(list, 'zzz', 0))).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input', () => {
    moveWithin(list, 'a', 2);
    expect(ids(list)).toEqual(['a', 'b', 'c']);
  });

  it('handles a single-element list', () => {
    expect(ids(moveWithin([{ id: 'only' }], 'only', 3))).toEqual(['only']);
  });

  it('handles an empty list', () => {
    expect(moveWithin([], 'a', 0)).toEqual([]);
  });
});
