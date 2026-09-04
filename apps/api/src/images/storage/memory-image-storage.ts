import type { ImageStorage, StoredObject } from './image-storage.js';

interface Entry {
  body: Buffer;
  contentType: string;
  lastModified: Date;
}

/**
 * The integration suite's storage.
 *
 * Not a mock: it implements the port faithfully, so the tests exercise the real
 * ordering of put/update/delete rather than asserting that a stub was called.
 * What it adds over the disk adapter is inspection — `keys()` is how a test
 * proves that deleting a section actually removed its dishes' photographs, and
 * that a replaced logo's old object is gone rather than merely dereferenced.
 */
export class MemoryImageStorage implements ImageStorage {
  private readonly objects = new Map<string, Entry>();

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { body, contentType, lastModified: new Date() });
  }

  async delete(keys: string[]): Promise<void> {
    for (const key of keys) this.objects.delete(key);
  }

  publicUrl(key: string): string {
    return `http://images.test/${key}`;
  }

  async *list(prefix: string): AsyncIterable<StoredObject> {
    for (const [key, entry] of this.objects) {
      if (key.startsWith(prefix)) yield { key, lastModified: entry.lastModified };
    }
  }

  // ------------------------------------------------------- test affordances

  keys(): string[] {
    return [...this.objects.keys()].sort();
  }

  has(key: string): boolean {
    return this.objects.has(key);
  }

  read(key: string): Buffer | undefined {
    return this.objects.get(key)?.body;
  }

  contentType(key: string): string | undefined {
    return this.objects.get(key)?.contentType;
  }

  /** Backdates an object, so the sweep's age rule can be tested without waiting. */
  backdate(key: string, lastModified: Date): void {
    const entry = this.objects.get(key);
    if (entry) entry.lastModified = lastModified;
  }

  clear(): void {
    this.objects.clear();
  }
}
