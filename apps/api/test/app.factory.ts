import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Pool } from 'pg';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/bootstrap.js';
import { createPool, DATABASE_POOL, DRIZZLE, type DrizzleDb } from '../src/db/client.js';
import { IMAGE_STORAGE } from '../src/images/storage/image-storage.js';
import { MemoryImageStorage } from '../src/images/storage/memory-image-storage.js';
import { ensureTestDatabase, truncateAll } from './database.js';

export interface TestApp {
  app: INestApplication;
  /** HTTP handler for supertest. */
  server: ReturnType<INestApplication['getHttpServer']>;
  /**
   * The images the app has stored, inspectable.
   *
   * A real implementation of the port rather than a mock, so tests exercise the
   * actual ordering of put/update/delete. What it adds is the ability to ask
   * *which* objects exist — the only way to prove that deleting a section
   * removed its dishes' photographs rather than merely dereferencing them.
   */
  storage: MemoryImageStorage;
  /** The same database the app is using, for tests that drive a maintenance command. */
  db: DrizzleDb;
  /** Empties every table and every stored image. Call between tests. */
  reset: () => Promise<void>;
  close: () => Promise<void>;
}

/**
 * Boots the real application — same modules, same pipes, same error filter — so
 * tests exercise what callers actually get, and points it at the test database
 * by replacing the pool rather than by relying on environment precedence. The
 * image store is replaced for the same reason: a test must not depend on a
 * Cloudflare account, and must not leave files on the developer's disk.
 */
export async function createTestApp(): Promise<TestApp> {
  const databaseUrl = await ensureTestDatabase();
  const storage = new MemoryImageStorage();

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DATABASE_POOL)
    .useFactory({ factory: (): Pool => createPool(databaseUrl) })
    .overrideProvider(IMAGE_STORAGE)
    .useValue(storage)
    .compile();

  const db = moduleRef.get<DrizzleDb>(DRIZZLE);

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  return {
    app,
    server: app.getHttpServer(),
    storage,
    db,
    reset: async () => {
      await truncateAll(databaseUrl);
      storage.clear();
    },
    close: () => app.close(),
  };
}
