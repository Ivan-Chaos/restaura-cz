import type { AvailabilityId } from "@/lib/design-system/dietary";
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
 * What this module accepts: the guest payload, or the owner's own `MenuDetail`.
 *
 * They differ in exactly one way that matters here — the owner's carries dishes
 * marked `hidden`, which the public endpoint has already dropped — and dropping
 * those is this module's job, so the input type has to admit them. Saying so in
 * the type rather than casting is what keeps `/preview` and `/print` honest:
 * they feed owner data through the same funnel a guest's page uses.
 */
export type SourceItem = Omit<PublicMenuSection["items"][number], "availability"> & {
  availability: AvailabilityId;
};

export type SourceSection = Omit<PublicMenuSection, "items"> & { items: SourceItem[] };

/** A dish that survived the hidden filter, so it can carry a display availability. */
type VisibleItem = Omit<SourceItem, "availability"> & {
  availability: Exclude<AvailabilityId, "hidden">;
};

export type DisplayMenuSource = Omit<PublicMenu, "sections"> & { sections: SourceSection[] };

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
  item: VisibleItem,
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
    // Spread on presence rather than passed through, because the display model
    // says "absent" where the API says "empty". Every consumer of MenuItem
    // treats these as optional and tests them for truthiness, so handing them
    // an empty array would be a value that means nothing.
    ...(item.dietary?.length ? { dietary: item.dietary } : {}),
    ...(item.allergens?.length ? { allergens: item.allergens } : {}),
    ...(item.warnings?.length ? { warnings: item.warnings } : {}),
    ...(item.spiceLevel ? { spiceLevel: item.spiceLevel as MenuItem["spiceLevel"] } : {}),
    ...(!item.availability || item.availability === "available"
      ? {}
      : { availability: item.availability }),
  };
}

/**
 * A hidden dish is dropped here rather than at each call site.
 *
 * The public endpoint already filters them out, so on the guest page this is a
 * no-op. It is load-bearing everywhere else: `/preview` and `/print/**` build
 * from the owner's own `MenuDetail`, which deliberately still carries hidden
 * dishes so the editor can show them. Without this line an owner would take a
 * dish off the menu and still find it on the PDF.
 */
function isVisible(item: SourceItem): item is VisibleItem {
  return item.availability !== "hidden";
}

function toCategory(section: SourceSection, index: number): MenuCategory {
  const id = categoryId(section.title, index);
  return {
    id,
    name: section.title,
    items: section.items
      .filter(isVisible)
      .map((item, itemIndex) => toItem(item, id, itemIndex)),
  };
}

/**
 * How many dishes a menu would actually put on a page.
 *
 * The print routes refuse to render an empty document, and "empty" has to mean
 * what a guest would see: a menu whose every dish is hidden produces no rows,
 * and answering that with a blank PDF instead of "nothing to print" would look
 * like a broken download rather than a decision the owner made.
 */
export function visibleItemCount(sections: readonly SourceSection[]): number {
  return sections.reduce((total, section) => total + section.items.filter(isVisible).length, 0);
}

export function toDisplayMenu(menu: DisplayMenuSource): Menu {
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
