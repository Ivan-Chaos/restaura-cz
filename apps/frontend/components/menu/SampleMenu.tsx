import { useTranslations } from "next-intl";

import { Container } from "@/components/layout/Container";
import { Grid } from "@/components/layout/Grid";
import { AppearanceToggle } from "@/components/theme/AppearanceToggle";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import type { Menu } from "@/lib/design-system/types";
import { PRESENTATIONS, usesCards, type Presentation } from "@/lib/menu-display/presentation";

import { CategoryHeading } from "./CategoryHeading";
import { CategoryNav } from "./CategoryNav";
import { DietaryLegend } from "./DietaryLegend";
import { DishCard } from "./DishCard";
import { DishRow } from "./DishRow";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MenuFooter } from "./MenuFooter";
import { MenuHeader } from "./MenuHeader";
import { MenuPanel } from "./MenuPanel";
import { SpecialsStrip } from "./SpecialsStrip";

/**
 * A whole menu, assembled from nothing but design-system parts.
 *
 * This is the feature's proof: if a complete, accessible, multilingual,
 * re-themeable menu can be built here without one bespoke colour or one
 * hard-coded string, the system works. It is deliberately the same component the
 * documentation shows and the end-to-end tests measure, so the thing documented,
 * the thing tested and the thing shipped cannot diverge.
 *
 * `presentation` (feature 005) chooses the structure — header, nav, section
 * headings, whether a photographed category is a grid of cards or a ledger —
 * and the theme in scope chooses the colours. Both default to the classic look.
 *
 * A Server Component: nothing here needs the browser, so the guest downloads
 * markup, not a renderer.
 */
export interface SampleMenuProps {
  menu: Menu;
  /**
   * Categories rendered compactly rather than as cards. Drinks do not benefit
   * from photographs and read better as a list.
   */
  compactCategoryIds?: string[];
  presentation?: Presentation;
}

export function SampleMenu({
  menu,
  compactCategoryIds = ["drinks"],
  presentation = PRESENTATIONS.classic,
}: SampleMenuProps) {
  const t = useTranslations("Menu");
  const tSample = useTranslations("SampleMenu");
  const { establishment, categories, specials = [] } = menu;

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

      <CategoryNav
        shape={presentation.nav}
        categories={categories.map(({ id, name }) => ({ id, name }))}
        aria-label={t("allergenLegend")}
      />

      <main className="flex-1">
        <Container size="md">
          <SpecialsStrip
            title={tSample("specials")}
            items={specials}
            surface={
              presentation.cards === "glass"
                ? "glass"
                : presentation.cards === "editorial"
                  ? "flat"
                  : "raised"
            }
            priceTreatment={presentation.id === "classic" ? undefined : presentation.price}
          />

          {categories.map((category, index) => {
            const compact = compactCategoryIds.includes(category.id);
            // The classic recipe keeps its original rule: photographed food as
            // cards, drinks as rows. Other recipes decide per layout.
            const layout = compact ? presentation.rows : presentation.cards;
            const asCards =
              presentation.id === "classic" ? !compact : usesCards(layout);

            const body =
              category.items.length === 0 ? (
                <Empty>
                  <EmptyTitle>{t("emptyCategory")}</EmptyTitle>
                  <EmptyDescription>{t("emptyCategoryHint")}</EmptyDescription>
                </Empty>
              ) : asCards ? (
                <Grid cols={{ base: 1, md: 2 }} gap={4}>
                  {category.items.map((item, itemIndex) => (
                    <DishCard
                      key={item.id}
                      item={item}
                      surface={
                        layout === "glass" ? "glass" : layout === "editorial" ? "flat" : "raised"
                      }
                      priceTreatment={presentation.id === "classic" ? undefined : presentation.price}
                      // Only the very first image is worth pre-loading; the
                      // rest are below the fold on every supported viewport.
                      priority={index === 0 && itemIndex === 0}
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
                      priceTreatment={presentation.id === "classic" ? undefined : presentation.price}
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
                  description={category.description}
                  count={category.items.length}
                  style={presentation.section}
                  index={index}
                />
                {presentation.panel ? <MenuPanel>{body}</MenuPanel> : body}
              </section>
            );
          })}

          <DietaryLegend id="allergens" className="scroll-mt-20 py-6" />
        </Container>
      </main>

      <Container size="md">
        <MenuFooter establishment={establishment} />
      </Container>
    </>
  );
}
