import type { ImageModel, Menu, MenuCategory, MenuItem } from "@/lib/design-system/types";
import type { ImageRef, PublicMenu, PublicMenuSection } from "@/lib/api/types";

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

/**
 * A stored image as the design system wants it (feature 006).
 *
 * The alt text is supplied by the caller rather than stored, because what an
 * image depicts is already written down: a dish photo is described by the dish
 * name and a logo by the restaurant name. Asking owners to type it again would
 * collect a worse version of something we already have.
 *
 * `null` and `undefined` both mean "no image", so an older API that omits the
 * field entirely degrades to the no-image presentation rather than to a crash.
 */
export function toImageModel(
  ref: ImageRef | null | undefined,
  alt: string,
): ImageModel | undefined {
  if (!ref) return undefined;
  return { src: ref.url, alt, width: ref.width, height: ref.height };
}

function toItem(
  item: PublicMenuSection["items"][number],
  categorySlug: string,
  index: number,
): MenuItem {
  const image = toImageModel(item.image, item.name);

  return {
    id: `${categorySlug}-item-${index + 1}`,
    name: item.name,
    ...(item.description === null ? {} : { description: item.description }),
    ...(image ? { image } : {}),
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
  // The logo belongs to the restaurant, so it is described by the restaurant's
  // name — not by the menu's, which may be "Lunch" and depicts nothing.
  const logo = toImageModel(menu.logo, menu.restaurantName);

  return {
    establishment: {
      name: menu.name,
      ...(logo ? { logo } : {}),
    },
    categories: menu.sections.map(toCategory),
  };
}
