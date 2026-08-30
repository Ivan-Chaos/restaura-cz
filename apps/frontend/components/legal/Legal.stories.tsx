import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import { getLegalDocument } from "@/lib/legal/documents";

import { CookieBanner } from "./CookieBanner";
import { CookieTable } from "./CookieTable";
import { LegalDocument } from "./LegalDocument";

/**
 * The legal surface. Worth stories for the same reason as anything else — the
 * German pass finds prose that overflows, and axe finds a table nobody can
 * navigate — plus one that is specific to this corner: a consent control that
 * makes refusing harder than accepting is the thing regulators actually fine
 * people for, so the banner's buttons are checked rather than eyeballed.
 */
const meta = {
  title: "Legal/Documents",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const PrivacyPolicy: Story = {
  render: () => <LegalDocument document={getLegalDocument("privacy")} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 1 })).toBeVisible();
    // Ten numbered sections, each a real heading a reader can jump between.
    await expect(canvas.getAllByRole("heading", { level: 2 })).toHaveLength(10);
  },
};

export const Terms: Story = {
  render: () => <LegalDocument document={getLegalDocument("terms")} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("heading", { level: 2 })).toHaveLength(11);
  },
};

export const CookiePolicy: Story = {
  render: () => <LegalDocument document={getLegalDocument("cookies")} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The table is the document's substance; it must be a real table.
    await expect(canvas.getByRole("table")).toBeVisible();
    await expect(canvas.getAllByRole("columnheader")).toHaveLength(5);
  },
};

export const StorageTable: Story = {
  render: () => (
    <div className="bg-background p-6">
      <CookieTable />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // One row per documented key, plus the header row.
    await expect(canvas.getAllByRole("row")).toHaveLength(4);
  },
};

/**
 * The notice as it stands today: nothing stored needs permission, so it informs
 * and offers a single honest dismissal rather than staging a choice.
 */
export const Notice: Story = {
  render: () => (
    <div className="bg-background min-h-96">
      <CookieBanner />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = canvas.getByRole("region", { name: /cookie/i });
    await expect(region).toBeVisible();

    // A link to the full policy is not optional — the notice is a summary.
    await expect(canvas.getByRole("link")).toHaveAttribute("href");

    // Dismissing it records a decision, and it does not come back.
    await userEvent.click(canvas.getByRole("button"));
    await expect(
      canvas.queryByRole("region", { name: /cookie/i }),
    ).not.toBeInTheDocument();

    // Clean up, so the next story in this browser starts undecided.
    document.cookie = "restaura-consent=; Max-Age=0; Path=/";
  },
};
