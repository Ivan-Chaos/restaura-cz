import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UtensilsIcon } from "lucide-react";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./avatar";

/**
 * Use Avatar for a person or a chef/staff identity — a server's profile photo,
 * a chef's byline on a signature dish, a reviewer's picture on a testimonial.
 * Don't use it for dish photography (use a plain `img` inside `Card`, which
 * needs rectangular framing and full resolution) or as a generic icon
 * container — that's `Empty`'s `EmptyMedia`.
 */
const meta = {
  title: "UI/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A round identity image for a person — a server, chef, or reviewer — with graceful fallback to initials when no photo loads. Not for dish photos or decorative icons; those want rectangular framing or `Empty`'s icon slot instead.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = {
  render: () => (
    <Avatar>
      <AvatarImage
        src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=128&h=128&fit=crop"
        alt="Head chef Tomáš Novák"
      />
      <AvatarFallback>TN</AvatarFallback>
    </Avatar>
  ),
};

export const FallbackInitials: Story = {
  name: "Fallback (image failed to load)",
  render: () => (
    <Avatar>
      <AvatarImage src="/broken-image.jpg" alt="Server Anna Dvořák" />
      <AvatarFallback>AD</AvatarFallback>
    </Avatar>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="sm">
        <AvatarFallback>SM</AvatarFallback>
      </Avatar>
      <Avatar size="default">
        <AvatarFallback>MD</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>LG</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const WithStatusBadge: Story = {
  name: "With status badge",
  render: () => (
    <Avatar>
      <AvatarFallback>ON</AvatarFallback>
      <AvatarBadge aria-label="On shift">
        <UtensilsIcon />
      </AvatarBadge>
    </Avatar>
  ),
};

export const Group: Story = {
  name: "Avatar group (serving staff)",
  render: () => (
    <AvatarGroup>
      <Avatar>
        <AvatarFallback>AD</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>TN</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>PK</AvatarFallback>
      </Avatar>
      <AvatarGroupCount aria-label="2 more staff on shift">
        +2
      </AvatarGroupCount>
    </AvatarGroup>
  ),
};
