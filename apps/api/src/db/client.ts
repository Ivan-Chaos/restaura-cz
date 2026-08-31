import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

/**
 * The one way to reach Postgres. Feature code injects `DRIZZLE` and never
 * constructs a pool of its own.
 */
export type DrizzleDb = NodePgDatabase<typeof schema>;

/** Injection token for the Drizzle instance. */
export const DRIZZLE = 'DRIZZLE';

/** Injection token for the underlying pool, needed only for shutdown. */
export const DATABASE_POOL = 'DATABASE_POOL';

export function createPool(databaseUrl: string): Pool {
  return new Pool({ connectionString: databaseUrl });
}

export function createDatabase(pool: Pool): DrizzleDb {
  return drizzle(pool, { schema });
}
