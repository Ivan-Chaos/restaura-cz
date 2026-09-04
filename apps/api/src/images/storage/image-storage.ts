/**
 * Where rendered images live.
 *
 * A port rather than a direct client, because three implementations are in use
 * from day one: Cloudflare R2 in every deployed environment, the local disk
 * when the R2 variables are unset (so the upload flow is developable and
 * testable with no credentials and no network), and an in-memory map in the
 * integration suite (so a test can assert *which* objects exist after a
 * cascade, which is the behaviour that actually matters).
 *
 * **The invariant every implementation exists to preserve**: an object under
 * `logos/` or `dishes/` is referenced by exactly one database row for as long
 * as it is meant to exist. Uploading attaches in the same request, so there is
 * never an unattached object; replacing and deleting remove the old key after
 * the row is updated. The two windows that survive a crash — an object written
 * whose row update never landed, and a delete that failed after commit — are
 * closed by the sweep command, not by anything here.
 */

/** One object, as listing reports it. */
export interface StoredObject {
  key: string;
  lastModified: Date;
}

export interface ImageStorage {
  /**
   * Writes an object, replacing any existing one at the same key. Keys are
   * random, so in practice this only ever creates. Throws on failure: a caller
   * that cannot store the bytes must not go on to record them.
   */
  put(key: string, body: Buffer, contentType: string): Promise<void>;

  /**
   * Removes objects. Missing keys are not an error — a delete that runs twice,
   * or after a partially-failed earlier attempt, must still converge.
   */
  delete(keys: string[]): Promise<void>;

  /** The absolute URL a guest's browser fetches this object from. */
  publicUrl(key: string): string;

  /**
   * Every object under a prefix. Used only by the sweep command, which is why
   * it streams: a listing is unbounded and nothing else needs it in memory.
   */
  list(prefix: string): AsyncIterable<StoredObject>;
}

/** Injection token. Feature code injects this, never a concrete adapter. */
export const IMAGE_STORAGE = 'IMAGE_STORAGE';
