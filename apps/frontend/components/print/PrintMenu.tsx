import { Container } from "@/components/layout/Container";
import { MenuFooter } from "@/components/menu/MenuFooter";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { MenuSections } from "@/components/menu/MenuSections";
import type { Menu } from "@/lib/design-system/types";
import type { Presentation } from "@/lib/menu-display/presentation";

import { PoweredBy } from "./PoweredBy";
import { RunningHeader } from "./RunningHeader";

export interface PrintMenuProps {
  menu: Menu;
  presentation: Presentation;
  showBranding: boolean;
  /** The restaurant behind the menu, for the running band. */
  restaurantName: string;
}

/**
 * A menu laid out for paper.
 *
 * The same header, the same sections, the same footer a guest sees — this is
 * `GuestMenu` with the three things that only make sense on a screen removed
 * (the category jump-nav, the language switcher, the light/dark toggle) and the
 * two things that only make sense on paper added (a band repeating the menu's
 * name on every page, and the Restaura line at the very end).
 *
 * Because the body is the shared `MenuSections`, a printed Refined menu cannot
 * drift from the Refined menu on a guest's phone: they are one composition
 * under one theme, differing in page furniture alone.
 */
export function PrintMenu({
  menu,
  presentation,
  showBranding,
  restaurantName,
}: PrintMenuProps) {
  const { establishment, categories } = menu;

  return (
    <div data-slot="print-menu" className="print-document">
      <RunningHeader title={establishment.name} restaurantName={restaurantName} />

      <MenuHeader establishment={establishment} layout={presentation.header} />

      <main>
        <Container size="md">
          <MenuSections categories={categories} presentation={presentation} avoidPageBreaks />
        </Container>
      </main>

      <Container size="md">
        <div className="print-avoid-break">
          <MenuFooter establishment={establishment} />
          {/* Last page only: it sits in normal flow after everything else. */}
          {showBranding ? <PoweredBy className="pt-6" /> : null}
        </div>
      </Container>
    </div>
  );
}
