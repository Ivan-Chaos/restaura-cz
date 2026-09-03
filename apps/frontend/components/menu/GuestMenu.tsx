import { Container } from "@/components/layout/Container";
import { Grid } from "@/components/layout/Grid";
import { AppearanceToggle } from "@/components/theme/AppearanceToggle";
import type { Menu } from "@/lib/design-system/types";
import { PRESENTATIONS, usesCards, type Presentation } from "@/lib/menu-display/presentation";

import { CategoryHeading } from "./CategoryHeading";
import { CategoryNav } from "./CategoryNav";
import { DishCard } from "./DishCard";
import { DishRow } from "./DishRow";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MenuFooter } from "./MenuFooter";
import { MenuHeader } from "./MenuHeader";
import { MenuPanel } from "./MenuPanel";

export interface GuestMenuProps {
  menu: Menu;
  /** The structural recipe (feature 005). Defaults to the classic composition. */
  presentation?: Presentation;
}

/**
 * A published menu as a guest sees it, assembled from design-system parts.
 *
 * Deliberately not `SampleMenu`. That component is the design system's
 * showcase: it always renders a specials strip and the full dietary and
 * allergen legend, because its fixture always has that data. A menu built in
 * the editor has none of it yet, and printing a legend for allergens nobody
 * declared would tell guests something untrue. When the editor starts
 * collecting photos, markers and allergens, this composition grows to match —
 * the components are already there.
 *
 * The `presentation` recipe decides structure — header layout, nav shape,
 * section heading, whether dishes are rows or cards — while the theme in scope
 * decides every colour and face. Dishes here carry no photograph, so the
 * recipe's `rows` layout applies; the glass and editorial recipes still ask for
 * cards, because a card is their unit even without a picture.
 *
 * A Server Component: the guest downloads markup, not a renderer.
 */
export function GuestMenu({ menu, presentation = PRESENTATIONS.classic }: GuestMenuProps) {
  const { establishment, categories } = menu;
  const hasContent = categories.some((category) => category.items.length > 0);
  const layout = presentation.rows;
  const cards = usesCards(layout);

  return (
    <>
      <MenuHeader
        establishment={establishment}
        layout={presentation.header}
        actions={
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <AppearanceToggle />
          </div>
        }
      />

      {/* Jumping between sections only helps once there is more than one. */}
      {categories.length > 1 ? (
        <CategoryNav
          shape={presentation.nav}
          categories={categories.map(({ id, name }) => ({ id, name }))}
        />
      ) : null}

      <main className="flex-1">
        <Container size="md">
          {categories.map((category, index) => {
            const body = cards ? (
              <Grid cols={{ base: 1, md: 2 }} gap={4}>
                {category.items.map((item) => (
                  <DishCard
                    key={item.id}
                    item={item}
                    surface={layout === "glass" ? "glass" : "flat"}
                    priceTreatment={presentation.price}
                  />
                ))}
              </Grid>
            ) : (
              <div>
                {category.items.map((item) => (
                  <DishRow
                    key={item.id}
                    item={item}
                    layout={layout}
                    priceTreatment={presentation.price}
                  />
                ))}
              </div>
            );

            return (
              <section
                key={category.id}
                id={category.id}
                aria-labelledby={`${category.id}-heading`}
                className="scroll-mt-20 py-6"
              >
                <CategoryHeading
                  id={`${category.id}-heading`}
                  name={category.name}
                  count={category.items.length}
                  style={presentation.section}
                  index={index}
                />
                {presentation.panel ? <MenuPanel>{body}</MenuPanel> : body}
              </section>
            );
          })}

          {/* An owner may publish an empty menu; that is a choice, not an error. */}
          {!hasContent && categories.length === 0 ? <div className="py-6" /> : null}
        </Container>
      </main>

      <Container size="md">
        <MenuFooter establishment={establishment} />
      </Container>
    </>
  );
}
