import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Pool } from 'pg';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import { createPool, DATABASE_POOL } from '../src/db/client.js';
import { ensureTestDatabase, truncateAll } from './database.js';

export interface TestApp {
  app: INestApplication;
  /** HTTP handler for supertest. */
  server: ReturnType<INestApplication['getHttpServer']>;
  /** Empties every table. Call between tests. */
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

/**
 * Boots the real application — same modules, same pipes, same error filter — so
 * tests exercise what callers actually get, and points it at the test database
 * by replacing the pool rather than by relying on environment precedence.
 */
export async function createTestApp(): Promise<TestApp> {
  const databaseUrl = await ensureTestDatabase();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE_POOL)
    .useFactory({ factory: (): Pool => createPool(databaseUrl) })
    .compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  return {
    app,
    server: app.getHttpServer(),
    reset: () => truncateAll(databaseUrl),
    close: () => app.close(),
  };
}
