import type { StorybookConfig } from "@storybook/nextjs-vite";

/**
 * Storybook is the design system's documentation (spec FR-021–FR-024) *and* its
 * component test suite — every story is executed headlessly by the Vitest addon,
 * so documentation coverage and test coverage cannot drift apart.
 *
 * Framework note: `@storybook/nextjs-vite`, not `@storybook/nextjs`. The webpack
 * framework does not resolve against Next 16; the Vite one is what Storybook 10
 * supports for Next 16 + Vitest 4.
 */
const config: StorybookConfig = {
  stories: [
    "../.storybook/docs/**/*.mdx",
    "../components/**/*.stories.@(ts|tsx)",
  ],

  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@storybook/addon-vitest",
  ],

  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },

  docs: {
    // Every primitive tagged `autodocs` gets a generated API page named
    // consistently, so the sidebar reads the same for all of them.
    defaultName: "Docs",
  },

  staticDirs: ["../public"],

  typescript: {
    // Props tables are generated from the TypeScript types, so a component's
    // documented API is its actual API.
    reactDocgen: "react-docgen-typescript",
  },
};

export default config;
