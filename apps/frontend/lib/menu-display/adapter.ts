import type { Menu, MenuCategory, MenuItem } from "@/lib/design-system/types";
import type { PublicMenu, PublicMenuSection } from "@/lib/api/types";

/**
 * Maps what the API stores onto what the design system renders.
 *
 * The two models are deliberately different: the API carries only what an owner
 * can currently enter, while the display model also describes photos, dietary
 * markers and availability. Everything not collected yet is simply absent —
 * the menu components already treat those fields as optional — so adding a
 * field later is a change here, not a change to every component.
 */

/**
 * Category ids double as scroll anchors and element ids, so they must be
 * URL- and DOM-safe. Section titles are free text in any language, and two
 * sections may share a title, so the index guarantees uniqueness.
 */
function categoryId(title: string, index: number): string {
  const slug = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug === "" ? `section-${index + 1}` : `${slug}-${index + 1}`;
}

function toItem(
  item: PublicMenuSection["items"][number],
  categorySlug: string,
  index: number,
): MenuItem {
  return {
    id: `${categorySlug}-item-${index + 1}`,
    name: item.name,
    ...(item.description === null ? {} : { description: item.description }),
    // Major units, matching the design system's Money contract: korunas, with
    // hellers as a decimal rather than as a separate unit.
    price: { kind: "single", amount: { amount: item.priceCzk, currency: "CZK" } },
  };
}

function toCategory(section: PublicMenuSection, index: number): MenuCategory {
  const id = categoryId(section.title, index);
  return {
    id,
    name: section.title,
    items: section.items.map((item, itemIndex) => toItem(item, id, itemIndex)),
  };
}

export function toDisplayMenu(menu: PublicMenu): Menu {
  return {
    establishment: { name: menu.name },
    categories: menu.sections.map(toCategory),
  };
}
