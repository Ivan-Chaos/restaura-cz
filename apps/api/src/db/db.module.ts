import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import type { Pool } from 'pg';
import { loadEnv } from '../config/env.js';
import { createDatabase, createPool, DATABASE_POOL, DRIZZLE } from './client.js';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: () => createPool(loadEnv().databaseUrl),
    },
    {
      provide: DRIZZLE,
      useFactory: (pool: Pool) => createDatabase(pool),
      inject: [DATABASE_POOL],
    },
  ],
  exports: [DRIZZLE, DATABASE_POOL],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  /** Requires app.enableShutdownHooks(); without it connections outlive the process signal. */
  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
