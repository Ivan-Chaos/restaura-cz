import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { withThemeByDataAttribute } from "@storybook/addon-themes";
import { NextIntlClientProvider } from "next-intl";
import { useEffect } from "react";

import cs from "../messages/cs.json";
import de from "../messages/de.json";
import en from "../messages/en.json";
import { THEMES } from "../lib/design-system/themes";

import "../app/globals.css";
import "./preview.css";

const MESSAGES = { cs, en, de } as const;
type Locale = keyof typeof MESSAGES;

/**
 * Menu theme ids, derived from the registry rather than hard-coded, so adding a
 * theme puts it in the toolbar automatically.
 */
const THEME_OPTIONS = Object.fromEntries(
  THEMES.map((theme) => [theme.id, theme.id]),
) as Record<string, string>;

/**
 * Locale toolbar.
 *
 * German is the length benchmark (roughly 30% longer than English) and Czech
 * exercises the diacritics the fonts must carry, so every component can be
 * judged against its worst-case strings without leaving the story.
 */
const withLocale: Decorator = (Story, context) => {
  const locale = (context.globals.locale ?? "cs") as Locale;
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={MESSAGES[locale]}
      timeZone="Europe/Prague"
    >
      <Story />
    </NextIntlClientProvider>
  );
};

/**
 * Appearance toolbar — toggles the `.dark` class on the preview root, exactly
 * as `next-themes` does in the app.
 *
 * This is hand-written rather than `withThemeByClassName` because both of
 * addon-themes' decorators read the *same* `theme` global, so stacking them
 * would make the two axes fight over one control. Theme and appearance are
 * independent by design (spec FR-009), and the toolbar has to reflect that.
 */
function AppearanceRoot({
  appearance,
  children,
}: {
  appearance: "light" | "dark";
  children: React.ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", appearance === "dark");
    root.style.colorScheme = appearance;
  }, [appearance]);

  return <>{children}</>;
}

const withAppearance: Decorator = (Story, context) => (
  <AppearanceRoot
    appearance={(context.globals.appearance ?? "light") as "light" | "dark"}
  >
    <Story />
  </AppearanceRoot>
);

const preview: Preview = {
  decorators: [
    withLocale,
    withAppearance,
    /**
     * Menu theme — a `data-theme` attribute on the root, exactly as
     * `<ThemeScope>` applies it in the app.
     */
    withThemeByDataAttribute({
      themes: THEME_OPTIONS,
      defaultTheme: "warm",
      attributeName: "data-theme",
    }),
  ],

  globalTypes: {
    appearance: {
      description: "Light or dark appearance",
      toolbar: {
        title: "Appearance",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: "Content locale",
      toolbar: {
        title: "Locale",
        icon: "globe",
        items: [
          { value: "cs", title: "Čeština (default)" },
          { value: "en", title: "English" },
          { value: "de", title: "Deutsch (longest)" },
        ],
        dynamicTitle: true,
      },
    },
  },

  initialGlobals: {
    locale: "cs",
    appearance: "light",
    theme: "warm",
  },

  parameters: {
    /**
     * Mount the App Router mock for every story.
     *
     * Navigation goes through `@/i18n/navigation`, which wraps `next-intl`'s
     * `createNavigation`, which calls `next/navigation`'s `useRouter`. That hook
     * asserts an App Router is mounted, so without this any component that can
     * change locale or link somewhere throws in Storybook — which would push us
     * toward the wrong fix of weakening the component to suit the workbench.
     */
    nextjs: { appDirectory: true },

    // Accessibility is a merge gate, not a suggestion: a violation fails the
    // story's test run (spec FR-012, SC-007).
    a11y: { test: "error" },

    // Storybook's own background switcher would fight the theme tokens.
    backgrounds: { disable: true },

    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },

    options: {
      storySort: {
        order: [
          "Documentation",
          ["Getting Started", "Foundations", "Theming", "Accessibility"],
          "Layout",
          "UI",
          "Menu",
          "Forms",
          "Ordering (future)",
          "Examples",
        ],
      },
    },
  },
};

export default preview;
