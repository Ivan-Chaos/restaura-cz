import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`.
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    /**
     * The decorator metadata class-validator and class-transformer read is
     * installed by this import, which `main.ts` performs at boot. A unit test
     * that instantiates a DTO has no boot, so it goes here — once, rather than
     * as a line every DTO spec has to remember.
     */
    setupFiles: ['reflect-metadata'],
  },
});
