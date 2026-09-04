import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadImageStorageEnv } from './env.js';

/**
 * The image-storage group is all-or-nothing on purpose: a half-configured
 * bucket fails on the first upload, in production, hours after the deploy that
 * caused it. Failing at boot with the missing names is the whole point, so it
 * is worth a test.
 */
describe('loadImageStorageEnv', () => {
  const NAMES = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'IMAGE_PUBLIC_URL',
  ] as const;

  const FULL = {
    R2_ACCOUNT_ID: 'acc123',
    R2_ACCESS_KEY_ID: 'key123',
    R2_SECRET_ACCESS_KEY: 'secret123',
    R2_BUCKET: 'restaura-images',
    IMAGE_PUBLIC_URL: 'https://img.example.com/',
  };

  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(NAMES.map((name) => [name, process.env[name]]));
    for (const name of NAMES) delete process.env[name];
  });

  afterEach(() => {
    for (const name of NAMES) {
      if (saved[name] === undefined) delete process.env[name];
      else process.env[name] = saved[name];
    }
  });

  it('falls back to local disk when nothing is set, so the flow works offline', () => {
    const env = loadImageStorageEnv(3001, '/srv/api');

    expect(env.kind).toBe('local');
    if (env.kind !== 'local') throw new Error('unreachable');
    expect(env.directory).toMatch(/[\\/]srv[\\/]api[\\/]\.images$/);
    expect(env.publicUrl).toBe('http://localhost:3001/dev-images');
  });

  it('uses the configured port in the local public URL', () => {
    const env = loadImageStorageEnv(4000, '/srv/api');
    expect(env.publicUrl).toBe('http://localhost:4000/dev-images');
  });

  it('reads R2 when every variable is set, trimming the trailing slash', () => {
    Object.assign(process.env, FULL);

    const env = loadImageStorageEnv(3001);

    expect(env).toEqual({
      kind: 'r2',
      accountId: 'acc123',
      accessKeyId: 'key123',
      secretAccessKey: 'secret123',
      bucket: 'restaura-images',
      publicUrl: 'https://img.example.com',
    });
  });

  it.each(NAMES)('refuses to boot when only %s is missing', (missing) => {
    Object.assign(process.env, FULL);
    delete process.env[missing];

    expect(() => loadImageStorageEnv(3001)).toThrow(new RegExp(`Missing: ${missing}`));
  });

  it('names every missing variable, not just the first', () => {
    process.env.R2_BUCKET = 'restaura-images';

    expect(() => loadImageStorageEnv(3001)).toThrow(
      /Missing: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, IMAGE_PUBLIC_URL/,
    );
  });

  it('treats a blank value as unset rather than as configured', () => {
    Object.assign(process.env, FULL);
    process.env.R2_BUCKET = '   ';

    expect(() => loadImageStorageEnv(3001)).toThrow(/Missing: R2_BUCKET/);
  });
});
