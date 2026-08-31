import { Container } from "@/components/layout/Container";
import { AppearanceToggle } from "@/components/theme/AppearanceToggle";
import type { Menu } from "@/lib/design-system/types";

import { CategoryHeading } from "./CategoryHeading";
import { CategoryNav } from "./CategoryNav";
import { DishRow } from "./DishRow";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MenuFooter } from "./MenuFooter";
import { MenuHeader } from "./MenuHeader";

export interface GuestMenuProps {
  menu: Menu;
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
 * A Server Component: the guest downloads markup, not a renderer.
 */
export function GuestMenu({ menu }: GuestMenuProps) {
  const { establishment, categories } = menu;
  const hasContent = categories.some((category) => category.items.length > 0);

  return (
    <>
      <MenuHeader
        establishment={establishment}
        actions={
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <AppearanceToggle />
          </div>
        }
      />

      {/* Jumping between sections only helps once there is more than one. */}
      {categories.length > 1 ? (
        <CategoryNav categories={categories.map(({ id, name }) => ({ id, name }))} />
      ) : null}

      <main className="flex-1">
        <Container size="md">
          {categories.map((category) => (
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
              />

              {/*
                Dishes here carry no photograph, so rows read better than cards
                and cost the guest nothing to download.
              */}
              <div>
                {category.items.map((item) => (
                  <DishRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          ))}

          {/* An owner may publish an empty menu; that is a choice, not an error. */}
          {!hasContent && categories.length === 0 ? <div className="py-6" /> : null}
        </Container>
      </main>

      <MenuFooter establishment={establishment} />
    </>
  );
}
