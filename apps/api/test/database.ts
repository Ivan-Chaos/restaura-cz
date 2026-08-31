import { Client } from 'pg';
import { loadEnv } from '../src/config/env.js';
import { runMigrations } from '../src/db/migrate.js';

/**
 * Tests run against a real Postgres — mocking it would prove nothing about the
 * constraints and cascades the schema relies on — but never against the
 * development database, which they would truncate.
 */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  const url = new URL(loadEnv().databaseUrl);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}

/** Creates the test database if it is missing, then brings it up to date. */
export async function ensureTestDatabase(): Promise<string> {
  const url = testDatabaseUrl();
  const databaseName = decodeURIComponent(new URL(url).pathname.slice(1));

  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    const existing = await admin.query('select 1 from pg_database where datname = $1', [
      databaseName,
    ]);
    if (existing.rowCount === 0) {
      // Identifiers cannot be parameterised; the name comes from our own
      // configuration, not from a request.
      await admin.query(`create database "${databaseName.replace(/"/g, '""')}"`);
    }
  } finally {
    await admin.end();
  }

  // Also proves, on every run, that migrations apply cleanly from empty.
  await runMigrations(url);
  return url;
}

/**
 * Empties every table between tests. Restarting identities keeps failures
 * reproducible, and the cascade follows the same foreign keys production does.
 */
export async function truncateAll(databaseUrl: string): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      'truncate table "menu_item", "menu_section", "menu", "session", "restaurant_profile", "owner_account" restart identity cascade',
    );
  } finally {
    await client.end();
  }
}
