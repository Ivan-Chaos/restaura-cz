import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Button } from "./button";
import { Badge } from "./badge";

/**
 * Card is the dish/menu-item container: a self-contained grouping of image,
 * name, description, price and action. Use it whenever content needs its own
 * visual boundary and optional footer action. Don't use Card for a fleeting
 * overlay (that's `Dialog`/`Sheet`) or for a simple list row that doesn't need
 * a border — a plain flex row with `Separator` is lighter for a dense list.
 */
const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The dish-card container: image, name, description, price, and an 'Add to order' action grouped inside one visual boundary. Use `size=\"sm\"` for a denser list layout. Not for modal/overlay content (`Dialog`/`Sheet`) or a dense list row that doesn't need a border — plain rows with `Separator` are lighter there.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DishCard: Story = {
  name: "Default (dish card)",
  render: () => (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Svíčková na smetaně</CardTitle>
        <CardDescription>
          Slow-braised beef sirloin in root vegetable cream sauce, bread
          dumplings, lingonberries.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">Chef&apos;s pick</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium">245 Kč</p>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Add to order</Button>
      </CardFooter>
    </Card>
  ),
};

export const CompactSize: Story = {
  name: "size=\"sm\" (dense list)",
  render: () => (
    <Card size="sm" className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Chlebíček</CardTitle>
        <CardDescription>Open-faced ham and egg sandwich</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium">65 Kč</p>
      </CardContent>
    </Card>
  ),
};

export const SoldOut: Story = {
  render: () => (
    <Card className="w-full max-w-sm opacity-60">
      <CardHeader>
        <CardTitle>Kachní confit</CardTitle>
        <CardDescription>Duck leg confit with red cabbage</CardDescription>
        <CardAction>
          <Badge variant="destructive">Sold out</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium">315 Kč</p>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled>
          Sold out
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const WithoutFooter: Story = {
  render: () => (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Today&apos;s soup</CardTitle>
        <CardDescription>Ask your server for today&apos;s selection</CardDescription>
      </CardHeader>
    </Card>
  ),
};
