import { isNotNull } from 'drizzle-orm';
import { createDatabase, createPool } from '../db/client.js';
import { menuItem, restaurantProfile } from '../db/schema.js';
import { loadEnv } from '../config/env.js';
import { createImageStorage } from './images.module.js';
import { DISH_PREFIX, LOGO_PREFIX } from './keys.js';
import type { ImageStorage, StoredObject } from './storage/image-storage.js';
import { selectOrphans } from './sweep-logic.js';

/**
 * Deletes stored images that nothing references any more.
 *
 * Uploading attaches in the same request, so in ordinary operation there are no
 * orphans at all and this command finds nothing. It exists for the two windows
 * that a single request cannot close on its own:
 *
 * - the process died between writing an object and recording it, and
 * - a post-commit delete failed and was logged rather than retried.
 *
 * Both leave a file nothing points at. That is harmless but not free, and
 * "zero orphans within a day" is a promise the product makes, so something has
 * to come along and make it true. Run it on a schedule outside the API process;
 * it is idempotent and safe to run at any time.
 *
 *   node dist/images/sweep.js            # delete
 *   node dist/images/sweep.js --dry-run  # report only
 */

/** Every key a row currently points at, across both kinds of image. */
async function referencedKeys(db: ReturnType<typeof createDatabase>): Promise<Set<string>> {
  const [logos, dishes] = await Promise.all([
    db
      .select({ key: restaurantProfile.logoKey })
      .from(restaurantProfile)
      .where(isNotNull(restaurantProfile.logoKey)),
    db.select({ key: menuItem.imageKey }).from(menuItem).where(isNotNull(menuItem.imageKey)),
  ]);

  const keys = new Set<string>();
  for (const row of [...logos, ...dishes]) {
    if (row.key !== null) keys.add(row.key);
  }
  return keys;
}

async function listAll(storage: ImageStorage, prefix: string): Promise<StoredObject[]> {
  const objects: StoredObject[] = [];
  for await (const object of storage.list(prefix)) objects.push(object);
  return objects;
}

export interface SweepOptions {
  dryRun?: boolean;
  /**
   * Where to sweep and what to sweep against. Injectable so the integration
   * suite can run the real sweep over its own store and database rather than
   * over whatever the developer happens to have configured — the alternative
   * being a test that either does nothing or deletes real images.
   */
  storage?: ImageStorage;
  db?: ReturnType<typeof createDatabase>;
}

export async function sweep({ dryRun = false, storage, db }: SweepOptions = {}): Promise<{
  scanned: number;
  orphaned: string[];
}> {
  const injected = storage !== undefined && db !== undefined;
  const env = injected ? undefined : loadEnv();

  const store = storage ?? createImageStorage(env!.imageStorage);
  const pool = injected ? undefined : createPool(env!.databaseUrl);
  const database = db ?? createDatabase(pool!);

  try {
    /**
     * The listing is read *before* the references, deliberately. An object
     * written after the listing is simply not considered this time round; an
     * object attached after the reference read would be a file we might delete
     * while a row points at it. Reading references last makes the set at least
     * as new as the listing, so that cannot happen.
     */
    const objects = [
      ...(await listAll(store, LOGO_PREFIX)),
      ...(await listAll(store, DISH_PREFIX)),
    ];
    const referenced = await referencedKeys(database);

    const orphaned = selectOrphans(objects, referenced);
    if (orphaned.length > 0 && !dryRun) await store.delete(orphaned);

    return { scanned: objects.length, orphaned };
  } finally {
    // Only a pool this function opened is a pool it may close.
    await pool?.end();
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const { scanned, orphaned } = await sweep({ dryRun });

  console.log(
    `Swept ${String(scanned)} stored image(s); ${String(orphaned.length)} unreferenced` +
      `${dryRun ? ' (dry run, nothing deleted)' : ' deleted'}.`,
  );
  for (const key of orphaned) console.log(`  ${dryRun ? 'would delete' : 'deleted'} ${key}`);
}

// Only when run as a command, so importing it in a test does not sweep.
if (process.argv[1]?.endsWith('sweep.js')) {
  await main();
}
