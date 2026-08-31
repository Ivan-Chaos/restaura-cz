import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // These suites share one Postgres database and truncate it between tests.
    // Run them one file at a time so a reset never pulls the rug out from
    // under another file's fixtures.
    fileParallelism: false,
    // Integration tests boot Nest and hash passwords with Argon2, which is
    // deliberately slow.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
