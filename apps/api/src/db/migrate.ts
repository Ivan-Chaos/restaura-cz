import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { loadEnv } from '../config/env.js';
import { createDatabase, createPool } from './client.js';

const migrationsFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

/**
 * Applies every pending migration. Safe to run repeatedly: Drizzle records
 * applied migrations and skips them, so a fresh database and an up-to-date one
 * both end in the same state.
 */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = createPool(databaseUrl);
  try {
    await migrate(createDatabase(pool), { migrationsFolder });
  } finally {
    await pool.end();
  }
}

const entry = process.argv[1];
const isCliEntry = entry !== undefined && import.meta.url === pathToFileURL(entry).href;

if (isCliEntry) {
  const { databaseUrl } = loadEnv();
  await runMigrations(databaseUrl);
  console.log('Migrations applied.');
}
