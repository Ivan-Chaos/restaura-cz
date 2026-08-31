import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Container } from "./Container";
import { Grid } from "./Grid";
import { Section } from "./Section";
import { Stack } from "./Stack";

/**
 * Layout primitives carry the page's rhythm. They deliberately expose a fixed
 * scale rather than free-form values: because `--spacing` is multiplied by the
 * active theme's `--density`, the same `gap={4}` tightens automatically in a
 * dense theme. Switch the theme toolbar to `slate` on any story below to see it.
 */
const meta = {
  title: "Layout/Primitives",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-secondary text-secondary-foreground rounded-md p-3 text-sm">
    {children}
  </div>
);

export const Containers: Story = {
  render: () => (
    <div className="bg-background flex flex-col gap-4 py-6">
      {(["sm", "md", "lg", "xl", "full"] as const).map((size) => (
        <Container key={size} size={size}>
          <Box>Container size=&quot;{size}&quot;</Box>
        </Container>
      ))}
    </div>
  ),
};

export const Stacks: Story = {
  render: () => (
    <Container className="bg-background py-6">
      <Stack gap={6}>
        <Stack direction="row" gap={2} wrap>
          <Box>row</Box>
          <Box>gap=2</Box>
          <Box>wraps</Box>
        </Stack>
        <Stack direction="column" gap={4}>
          <Box>column</Box>
          <Box>gap=4</Box>
        </Stack>
        <Stack direction="row" justify="between" align="center">
          <Box>justify</Box>
          <Box>between</Box>
        </Stack>
      </Stack>
    </Container>
  ),
};

export const Grids: Story = {
  render: () => (
    <Container className="bg-background py-6">
      <Grid cols={{ base: 1, sm: 2, lg: 3 }} gap={4}>
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={i}>Cell {i + 1}</Box>
        ))}
      </Grid>
    </Container>
  ),
};

/** A section is a real landmark: heading, optional description, anchor target. */
export const Sections: Story = {
  render: () => (
    <Container className="bg-background">
      <Section
        id="starters"
        title="Starters"
        description="Small plates and soups to begin"
      >
        <Grid cols={{ base: 1, md: 2 }}>
          <Box>Dish</Box>
          <Box>Dish</Box>
        </Grid>
      </Section>
      <Section id="mains" title="Main courses">
        <Box>Dish</Box>
      </Section>
    </Container>
  ),
};

/**
 * The narrowest supported viewport. Nothing may scroll horizontally here
 * (spec SC-008).
 */
export const NarrowViewport: Story = {
  globals: { viewport: { value: "mobile1" } },
  render: () => (
    <Container className="bg-background py-4">
      <Section title="Main courses" description="Slow-cooked classics">
        <Grid cols={{ base: 1, md: 2 }} gap={3}>
          <Box>Svíčková na smetaně</Box>
          <Box>Hovězí guláš</Box>
        </Grid>
      </Section>
    </Container>
  ),
};
