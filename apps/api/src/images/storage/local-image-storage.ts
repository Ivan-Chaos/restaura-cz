import { mkdir, readdir, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isStorageKey } from '../keys.js';
import type { ImageStorage, StoredObject } from './image-storage.js';

/**
 * Images on the local disk, served by the API's own `/dev-images` route.
 *
 * This is what makes the whole upload feature developable and testable with no
 * Cloudflare account and no network — the same reasoning that lets sign-up work
 * without a Resend key. It is not intended for production: a deployed API has
 * no durable local disk and would be serving image bytes from its own request
 * loop.
 *
 * Keys are validated on every operation even though they are generated
 * internally. A key is the one value in this module that becomes a filesystem
 * path, so treating it as untrusted costs one regex and removes traversal from
 * the threat model entirely.
 */
export class LocalImageStorage implements ImageStorage {
  constructor(
    private readonly directory: string,
    private readonly baseUrl: string,
  ) {}

  private pathFor(key: string): string {
    if (!isStorageKey(key)) throw new Error(`Refusing to use "${key}" as a storage key.`);
    return join(this.directory, key);
  }

  async put(key: string, body: Buffer, _contentType: string): Promise<void> {
    // The content type is implied by the extension here; `/dev-images` reads it
    // back from the key rather than storing it beside the bytes.
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
  }

  async delete(keys: string[]): Promise<void> {
    for (const key of keys) {
      try {
        await unlink(this.pathFor(key));
      } catch (error) {
        // Already gone is the outcome we wanted. Anything else is real.
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }

  publicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  async *list(prefix: string): AsyncIterable<StoredObject> {
    const folder = join(this.directory, prefix);

    let names: string[];
    try {
      names = await readdir(folder);
    } catch (error) {
      // A prefix nobody has written to yet is empty, not broken.
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }

    for (const name of names) {
      const key = `${prefix}${name}`;
      if (!isStorageKey(key)) continue;
      const stats = await stat(join(folder, name));
      yield { key, lastModified: stats.mtime };
    }
  }

  /** Absolute path of an object, for the `/dev-images` route to stream. */
  resolve(key: string): string {
    return this.pathFor(key);
  }
}
