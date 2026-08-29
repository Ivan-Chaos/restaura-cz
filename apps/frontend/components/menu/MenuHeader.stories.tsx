import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AppearanceToggle } from "@/components/theme/AppearanceToggle";
import type { Establishment } from "@/lib/design-system/types";

import { MenuHeader } from "./MenuHeader";

const meta = {
  title: "Menu/MenuHeader",
  component: MenuHeader,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof MenuHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

const base: Establishment = {
  name: "U Zlaté lžíce",
  tagline: "Poctivá česká kuchyně od roku 1932",
};

const withLogo: Establishment = {
  ...base,
  logo: { src: "/file.svg", alt: "Logo restaurace U Zlaté lžíce", width: 48, height: 48 },
};

const withHours: Establishment = {
  ...withLogo,
  openingHours: [
    { label: "Po–Pá", hours: "11:00 – 23:00" },
    { label: "So–Ne", hours: "12:00 – 22:00" },
  ],
};

export const Default: Story = {
  args: { establishment: withHours },
};

export const WithoutLogo: Story = {
  args: { establishment: { ...withHours, logo: undefined } },
};

export const WithoutTagline: Story = {
  args: { establishment: { ...withHours, tagline: undefined } },
};

export const WithoutOpeningHours: Story = {
  args: { establishment: withLogo },
};

// `LanguageSwitcher` also belongs here in the real app (see the sample route),
// but it calls `useRouter`/`usePathname` from `@/i18n/navigation`, which
// currently crashes under Storybook's `next/navigation` mock ("invariant
// expected app router to be mounted") — see `LanguageSwitcher.stories.tsx`.
// This story sticks to `AppearanceToggle` so it demonstrates a real,
// non-empty `actions` slot without depending on that unrelated breakage.
export const WithActions: Story = {
  args: {
    establishment: withHours,
    actions: <AppearanceToggle />,
  },
};

/** German runs longer than Czech or English and has no soft hyphenation help
 * from the browser by default — this is the worst case for header overflow. */
export const LongNameNarrowViewport: Story = {
  globals: { locale: "de", viewport: { value: "mobile1" } },
  args: {
    establishment: {
      ...withHours,
      name: "Gasthaus Zum Goldenen Löffel und Ratskeller am alten Marktplatz",
      tagline:
        "Traditionelle böhmische Küche mit hausgemachten Knödeln seit 1932",
    },
  },
};
