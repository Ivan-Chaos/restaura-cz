import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated artefacts.
    "storybook-static/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
  {
    // Ordering components are documentation-only in this phase: the product is
    // menus, and the guest menu must expose zero ordering affordances
    // (spec SC-012). They exist so a later revision can add ordering without a
    // second visual language — but nothing routable may import them yet.
    // Delete this block when ordering ships.
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/components/ordering/*", "**/components/ordering/*"],
              message:
                "Ordering components are documentation-only in this phase (spec SC-012). They must not be reachable from a route.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
