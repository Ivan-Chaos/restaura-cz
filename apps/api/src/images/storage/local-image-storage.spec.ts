import { mkdtemp, readFile, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DISH_PREFIX, LOGO_PREFIX, newDishKey, newLogoKey } from '../keys.js';
import { LocalImageStorage } from './local-image-storage.js';

describe('LocalImageStorage', () => {
  let directory: string;
  let storage: LocalImageStorage;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'restaura-images-'));
    storage = new LocalImageStorage(directory, 'http://localhost:3001/dev-images');
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('writes an object and reads the same bytes back', async () => {
    const key = newLogoKey();
    const body = Buffer.from('rendered logo bytes');

    await storage.put(key, body, 'image/png');

    expect(await readFile(join(directory, key))).toEqual(body);
  });

  it('creates the prefix directory on first write', async () => {
    await storage.put(newDishKey(), Buffer.from('x'), 'image/jpeg');
    const listed = [];
    for await (const object of storage.list(DISH_PREFIX)) listed.push(object.key);
    expect(listed).toHaveLength(1);
  });

  it('removes an object', async () => {
    const key = newLogoKey();
    await storage.put(key, Buffer.from('x'), 'image/png');

    await storage.delete([key]);

    const listed = [];
    for await (const object of storage.list(LOGO_PREFIX)) listed.push(object.key);
    expect(listed).toEqual([]);
  });

  it('treats deleting a missing object as success, so a retry converges', async () => {
    await expect(storage.delete([newLogoKey()])).resolves.toBeUndefined();
  });

  it('lists an empty prefix rather than failing when nothing was ever written', async () => {
    const listed = [];
    for await (const object of storage.list(DISH_PREFIX)) listed.push(object);
    expect(listed).toEqual([]);
  });

  it('reports each object with its modification time, for the sweep', async () => {
    const key = newDishKey();
    await storage.put(key, Buffer.from('x'), 'image/jpeg');
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    await utimes(join(directory, key), old, old);

    const listed = [];
    for await (const object of storage.list(DISH_PREFIX)) listed.push(object);

    expect(listed).toHaveLength(1);
    expect(listed[0]?.key).toBe(key);
    expect(listed[0]?.lastModified.getTime()).toBeCloseTo(old.getTime(), -3);
  });

  it('builds a public URL under the configured base', () => {
    const key = newLogoKey();
    expect(storage.publicUrl(key)).toBe(`http://localhost:3001/dev-images/${key}`);
  });

  it.each([
    ['a traversal attempt', '../../etc/passwd'],
    ['a traversal inside a valid prefix', 'logos/../../../etc/passwd'],
    ['an unknown prefix', 'uploads/2f1c8b3a-1111-4222-8333-444455556666.png'],
    ['a non-uuid name', 'logos/logo.png'],
  ])('refuses %s as a key', async (_label, key) => {
    await expect(storage.put(key, Buffer.from('x'), 'image/png')).rejects.toThrow(
      /Refusing to use/,
    );
    await expect(storage.delete([key])).rejects.toThrow(/Refusing to use/);
  });
});
