import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNotNull, ne, sql, type SQL } from 'drizzle-orm';
import { AppError } from '../common/app-error.js';
import { DRIZZLE, type DrizzleDb } from '../db/client.js';
import { menu, menuItem, menuSection, restaurantProfile } from '../db/schema.js';
import { processImage, type CropRect } from '../images/image-processor.js';
import { toImageRef, type ImageRef } from '../images/image-ref.js';
import { newDishKey } from '../images/keys.js';
import { IMAGE_STORAGE, type ImageStorage } from '../images/storage/image-storage.js';
import {
  ALLERGEN_NUMBERS,
  DIETARY_IDS,
  WARNING_IDS,
  orderedSubsetOf,
  type AllergenNumber,
  type Availability,
  type DietaryId,
  type PublicAvailability,
  type WarningId,
} from './item-attributes.js';
import { moveWithin } from './ordering.js';
import { generateSlug } from './slug.js';

/**
 * Defensive caps. Nothing the product produces comes near these; they exist so
 * that a single request can never fan out without bound.
 */
const MAX_MENUS_PER_ACCOUNT = 100;
const MAX_SECTIONS_PER_MENU = 100;
const MAX_ITEMS_PER_MENU = 1000;

export type MenuStatus = 'draft' | 'published';

export interface MenuSummary {
  id: string;
  name: string;
  status: MenuStatus;
  publicSlug: string | null;
  updatedAt: string;
}

export interface ItemView {
  id: string;
  name: string;
  description: string | null;
  priceCzk: number;
  position: number;
  /** The dish's photograph, or null — which is the normal state. */
  image: ImageRef | null;
  /** Deduped and in catalogue order, so two dishes with the same claims read identically. */
  dietary: DietaryId[];
  /** EU 1169/2011 numbers, ascending. */
  allergens: AllergenNumber[];
  /** 0–3. */
  spiceLevel: number;
  warnings: WarningId[];
  /** Owner-side only: `hidden` means guests never see this dish. */
  availability: Availability;
}

export interface SectionView {
  id: string;
  title: string;
  position: number;
  items: ItemView[];
}

export interface MenuDetail extends MenuSummary {
  visualVariant: string;
  sections: SectionView[];
}

export interface PublicMenuItem {
  name: string;
  description: string | null;
  priceCzk: number;
  image: ImageRef | null;
  dietary: DietaryId[];
  allergens: AllergenNumber[];
  spiceLevel: number;
  warnings: WarningId[];
  /**
   * Never `hidden`: such a dish is filtered out of this payload entirely, so
   * the type says what the query guarantees.
   */
  availability: PublicAvailability;
}

export interface PublicMenuView {
  name: string;
  /** The restaurant behind the menu, so its logo can be described in words. */
  restaurantName: string;
  visualVariant: string;
  logo: ImageRef | null;
  sections: { title: string; items: PublicMenuItem[] }[];
}

/** The transaction handle Drizzle hands to `db.transaction`. */
type Tx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];
/** Anything that can run a query: the pool, or a transaction. */
type Executor = DrizzleDb | Tx;

@Injectable()
export class MenusService {
  private readonly logger = new Logger(MenusService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(IMAGE_STORAGE) private readonly storage: ImageStorage,
  ) {}

  /**
   * Every column an `ItemView` is built from, in one place.
   *
   * Five queries return a dish, and before this they each listed their own
   * columns — which is five places to forget when a column is added, and
   * exactly how a photo would end up visible in the editor but missing from
   * the guest page.
   */
  private static readonly ITEM_COLUMNS = {
    id: menuItem.id,
    name: menuItem.name,
    description: menuItem.description,
    priceCzk: menuItem.priceCzk,
    position: menuItem.position,
    imageKey: menuItem.imageKey,
    imageWidth: menuItem.imageWidth,
    imageHeight: menuItem.imageHeight,
    dietary: menuItem.dietary,
    allergens: menuItem.allergens,
    spiceLevel: menuItem.spiceLevel,
    warnings: menuItem.warnings,
    availability: menuItem.availability,
  };

  /** One row, one wire shape. Storage keys never leave this method. */
  private toItemView(row: {
    id: string;
    name: string;
    description: string | null;
    priceCzk: number;
    position: number;
    imageKey: string | null;
    imageWidth: number | null;
    imageHeight: number | null;
    dietary: string[];
    allergens: number[];
    spiceLevel: number;
    warnings: string[];
    availability: string;
  }): ItemView {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      priceCzk: row.priceCzk,
      position: row.position,
      image: toImageRef(this.storage, {
        key: row.imageKey,
        width: row.imageWidth,
        height: row.imageHeight,
      }),
      // The columns are plain text and smallint; the CHECK constraints are what
      // make these narrowings true. Same reasoning as `toSummary`'s status.
      dietary: row.dietary as DietaryId[],
      allergens: row.allergens as AllergenNumber[],
      spiceLevel: row.spiceLevel,
      warnings: row.warnings as WarningId[],
      availability: row.availability as Availability,
    };
  }

  // ---------------------------------------------------------------- menus

  async listMenus(accountId: string): Promise<MenuSummary[]> {
    const rows = await this.db
      .select({
        id: menu.id,
        name: menu.name,
        status: menu.status,
        publicSlug: menu.publicSlug,
        updatedAt: menu.updatedAt,
      })
      .from(menu)
      .where(eq(menu.accountId, accountId))
      .orderBy(desc(menu.updatedAt))
      .limit(MAX_MENUS_PER_ACCOUNT);

    return rows.map((row) => this.toSummary(row));
  }

  async createMenu(accountId: string, name: string): Promise<MenuDetail> {
    const [row] = await this.db.insert(menu).values({ accountId, name }).returning();
    if (!row) throw new Error('Menu insert returned no row');
    return { ...this.toSummary(row), visualVariant: row.visualVariant, sections: [] };
  }

  async getMenuDetail(accountId: string, menuId: string): Promise<MenuDetail> {
    const owned = await this.requireOwnedMenu(this.db, accountId, menuId);

    const sections = await this.db
      .select({ id: menuSection.id, title: menuSection.title, position: menuSection.position })
      .from(menuSection)
      .where(eq(menuSection.menuId, menuId))
      .orderBy(asc(menuSection.position), asc(menuSection.id))
      .limit(MAX_SECTIONS_PER_MENU);

    const items = sections.length
      ? await this.db
          .select({ ...MenusService.ITEM_COLUMNS, sectionId: menuItem.sectionId })
          .from(menuItem)
          .where(
            inArray(
              menuItem.sectionId,
              sections.map((section) => section.id),
            ),
          )
          .orderBy(asc(menuItem.position), asc(menuItem.id))
          .limit(MAX_ITEMS_PER_MENU)
      : [];

    return {
      ...this.toSummary(owned),
      visualVariant: owned.visualVariant,
      sections: sections.map((section) => ({
        ...section,
        items: items
          .filter((item) => item.sectionId === section.id)
          .map((item) => this.toItemView(item)),
      })),
    };
  }

  async updateMenu(
    accountId: string,
    menuId: string,
    patch: { name?: string; visualVariant?: string },
  ): Promise<MenuDetail> {
    await this.requireOwnedMenu(this.db, accountId, menuId);

    await this.db
      .update(menu)
      .set({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.visualVariant !== undefined ? { visualVariant: patch.visualVariant } : {}),
        updatedAt: new Date(),
      })
      .where(eq(menu.id, menuId));

    return this.getMenuDetail(accountId, menuId);
  }

  async deleteMenu(accountId: string, menuId: string): Promise<void> {
    let orphaned: string[] = [];

    await this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);

      // The cascade removes the rows that name these objects, so the keys have
      // to be read while those rows still exist.
      orphaned = await this.imageKeysOfItems(
        tx,
        inArray(
          menuItem.sectionId,
          tx.select({ id: menuSection.id }).from(menuSection).where(eq(menuSection.menuId, menuId)),
        ),
      );

      // Sections and items go with it through ON DELETE CASCADE.
      await tx.delete(menu).where(eq(menu.id, menuId));
    });

    await this.forget(orphaned, 'deleting a menu');
  }

  // ----------------------------------------------------------- publishing

  async publish(
    accountId: string,
    menuId: string,
  ): Promise<{ status: MenuStatus; publicSlug: string; publicPath: string }> {
    return this.db.transaction(async (tx) => {
      const owned = await this.requireOwnedMenu(tx, accountId, menuId);

      // Assigned once and kept forever, so a printed QR code survives an
      // unpublish/republish cycle.
      const publicSlug = owned.publicSlug ?? (await this.assignSlug(tx, menuId, owned.name));

      await tx
        .update(menu)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(menu.id, menuId));

      return { status: 'published' as const, publicSlug, publicPath: `/m/${publicSlug}` };
    });
  }

  async unpublish(
    accountId: string,
    menuId: string,
  ): Promise<{ status: MenuStatus; publicSlug: string | null }> {
    const owned = await this.requireOwnedMenu(this.db, accountId, menuId);

    await this.db
      .update(menu)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(menu.id, menuId));

    return { status: 'draft', publicSlug: owned.publicSlug };
  }

  /** The guest-facing read. Draft menus and unknown slugs are equally not found. */
  async getPublicMenu(slug: string): Promise<PublicMenuView> {
    /**
     * An inner join on the profile, not a left join: publishing requires a
     * verified account with a completed profile, so every published menu has
     * one. A menu that somehow does not is unpublishable and is reported as
     * not found, like any other address that leads nowhere.
     *
     * The restaurant's name comes along because the logo needs a text
     * alternative that names the restaurant — a menu called "Polední menu"
     * describes nothing about the mark beside it (feature 006, FR-004).
     */
    const [found] = await this.db
      .select({
        id: menu.id,
        name: menu.name,
        visualVariant: menu.visualVariant,
        restaurantName: restaurantProfile.restaurantName,
        logoKey: restaurantProfile.logoKey,
        logoWidth: restaurantProfile.logoWidth,
        logoHeight: restaurantProfile.logoHeight,
      })
      .from(menu)
      .innerJoin(restaurantProfile, eq(restaurantProfile.accountId, menu.accountId))
      .where(and(eq(menu.publicSlug, slug), eq(menu.status, 'published')))
      .limit(1);

    if (!found) throw AppError.notFound();

    const rows = await this.db
      .select({
        sectionId: menuSection.id,
        sectionTitle: menuSection.title,
        itemName: menuItem.name,
        itemDescription: menuItem.description,
        itemPriceCzk: menuItem.priceCzk,
        itemImageKey: menuItem.imageKey,
        itemImageWidth: menuItem.imageWidth,
        itemImageHeight: menuItem.imageHeight,
        itemDietary: menuItem.dietary,
        itemAllergens: menuItem.allergens,
        itemSpiceLevel: menuItem.spiceLevel,
        itemWarnings: menuItem.warnings,
        itemAvailability: menuItem.availability,
      })
      .from(menuSection)
      .leftJoin(
        menuItem,
        // The hidden filter belongs in the join condition, not in the WHERE: a
        // WHERE clause is evaluated after the left join has produced its rows,
        // so `ne(null, 'hidden')` would be NULL and would discard the all-null
        // row an empty section produces. A section would then vanish both when
        // it has no items and when all of its items are hidden.
        and(eq(menuItem.sectionId, menuSection.id), ne(menuItem.availability, 'hidden')),
      )
      .where(eq(menuSection.menuId, found.id))
      .orderBy(
        asc(menuSection.position),
        asc(menuSection.id),
        asc(menuItem.position),
        asc(menuItem.id),
      )
      .limit(MAX_ITEMS_PER_MENU);

    const sections: PublicMenuView['sections'] = [];
    const indexBySectionId = new Map<string, number>();

    for (const row of rows) {
      let index = indexBySectionId.get(row.sectionId);
      if (index === undefined) {
        index = sections.length;
        indexBySectionId.set(row.sectionId, index);
        sections.push({ title: row.sectionTitle, items: [] });
      }

      // The left join produces one row with null item columns for a section
      // that has no items yet.
      const section = sections[index];
      if (section && row.itemName !== null && row.itemPriceCzk !== null) {
        section.items.push({
          name: row.itemName,
          description: row.itemDescription,
          priceCzk: row.itemPriceCzk,
          image: toImageRef(this.storage, {
            key: row.itemImageKey,
            width: row.itemImageWidth,
            height: row.itemImageHeight,
          }),
          dietary: (row.itemDietary ?? []) as DietaryId[],
          allergens: (row.itemAllergens ?? []) as AllergenNumber[],
          spiceLevel: row.itemSpiceLevel ?? 0,
          warnings: (row.itemWarnings ?? []) as WarningId[],
          // The join already excluded 'hidden', so the narrowing is the query's
          // guarantee rather than an assumption.
          availability: (row.itemAvailability ?? 'available') as PublicAvailability,
        });
      }
    }

    return {
      name: found.name,
      restaurantName: found.restaurantName,
      visualVariant: found.visualVariant,
      logo: toImageRef(this.storage, {
        key: found.logoKey,
        width: found.logoWidth,
        height: found.logoHeight,
      }),
      sections,
    };
  }

  // ------------------------------------------------------------- sections

  async addSection(accountId: string, menuId: string, title: string): Promise<SectionView> {
    return this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);

      const siblings = await this.sectionIdsInOrder(tx, menuId);
      const [row] = await tx
        .insert(menuSection)
        .values({ menuId, title, position: siblings.length })
        .returning();
      if (!row) throw new Error('Section insert returned no row');

      await this.touchMenu(tx, menuId);
      return { id: row.id, title: row.title, position: row.position, items: [] };
    });
  }

  async updateSection(
    accountId: string,
    menuId: string,
    sectionId: string,
    patch: { title?: string; position?: number },
  ): Promise<SectionView> {
    return this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);
      await this.requireSection(tx, menuId, sectionId);

      if (patch.title !== undefined) {
        await tx
          .update(menuSection)
          .set({ title: patch.title })
          .where(eq(menuSection.id, sectionId));
      }

      if (patch.position !== undefined) {
        const siblings = await this.sectionIdsInOrder(tx, menuId);
        await this.writeSectionPositions(tx, moveWithin(siblings, sectionId, patch.position));
      }

      await this.touchMenu(tx, menuId);

      const [row] = await tx
        .select({ id: menuSection.id, title: menuSection.title, position: menuSection.position })
        .from(menuSection)
        .where(eq(menuSection.id, sectionId))
        .limit(1);
      if (!row) throw AppError.notFound();

      return { ...row, items: await this.itemsOfSection(tx, sectionId) };
    });
  }

  async deleteSection(accountId: string, menuId: string, sectionId: string): Promise<void> {
    let orphaned: string[] = [];

    await this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);
      await this.requireSection(tx, menuId, sectionId);

      // Read before the cascade takes the rows that name these objects.
      orphaned = await this.imageKeysOfItems(tx, eq(menuItem.sectionId, sectionId));

      // Items in the section go with it through ON DELETE CASCADE.
      await tx.delete(menuSection).where(eq(menuSection.id, sectionId));
      await this.writeSectionPositions(tx, await this.sectionIdsInOrder(tx, menuId));
      await this.touchMenu(tx, menuId);
    });

    await this.forget(orphaned, 'deleting a section');
  }

  // ---------------------------------------------------------------- items

  async addItem(
    accountId: string,
    menuId: string,
    sectionId: string,
    values: {
      name: string;
      description?: string;
      priceCzk: number;
      dietary?: DietaryId[];
      allergens?: AllergenNumber[];
      spiceLevel?: number;
      warnings?: WarningId[];
      availability?: Availability;
    },
  ): Promise<ItemView> {
    return this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);
      await this.requireSection(tx, menuId, sectionId);

      const siblings = await this.itemIdsInOrder(tx, sectionId);
      const [row] = await tx
        .insert(menuItem)
        .values({
          sectionId,
          name: values.name,
          description: values.description ?? null,
          priceCzk: values.priceCzk,
          // `orderedSubsetOf` returns [] for undefined, so it is the defaulting
          // step as well as the normalising one — there is no `?? []` to forget.
          dietary: orderedSubsetOf(DIETARY_IDS, values.dietary),
          allergens: orderedSubsetOf(ALLERGEN_NUMBERS, values.allergens),
          spiceLevel: values.spiceLevel ?? 0,
          warnings: orderedSubsetOf(WARNING_IDS, values.warnings),
          availability: values.availability ?? 'available',
          position: siblings.length,
        })
        .returning();
      if (!row) throw new Error('Item insert returned no row');

      await this.touchMenu(tx, menuId);
      // A new dish has no photograph. The insert returns every column, so the
      // shared mapper builds the view rather than a second column list.
      return this.toItemView(row);
    });
  }

  /**
   * Copies a dish, landing the copy directly below the original.
   *
   * One endpoint rather than a create followed by a move, because the two
   * halves have to succeed together: a copy that appended itself to the end of
   * the section and then failed to move would leave the owner tidying up after
   * a button they pressed once. The name is copied verbatim — an owner
   * duplicating a dish is about to edit it, and a guessed "Kulajda (copy)"
   * would only be text they have to delete.
   */
  async duplicateItem(
    accountId: string,
    menuId: string,
    sectionId: string,
    itemId: string,
  ): Promise<ItemView> {
    return this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);
      await this.requireSection(tx, menuId, sectionId);

      const [source] = await tx
        .select({
          name: menuItem.name,
          description: menuItem.description,
          priceCzk: menuItem.priceCzk,
          position: menuItem.position,
          dietary: menuItem.dietary,
          allergens: menuItem.allergens,
          spiceLevel: menuItem.spiceLevel,
          warnings: menuItem.warnings,
          availability: menuItem.availability,
        })
        .from(menuItem)
        .where(and(eq(menuItem.id, itemId), eq(menuItem.sectionId, sectionId)))
        .limit(1);
      if (!source) throw AppError.notFound();

      const siblings = await this.itemIdsInOrder(tx, sectionId);
      const [copy] = await tx
        .insert(menuItem)
        .values({
          sectionId,
          name: source.name,
          description: source.description,
          priceCzk: source.priceCzk,
          // Already normalised in the row they came from, so copied verbatim.
          // Not `...ITEM_COLUMNS`: that set carries the image columns, and a
          // copy must leave those NULL or deleting one dish would break the
          // other's photograph.
          dietary: source.dietary,
          allergens: source.allergens,
          spiceLevel: source.spiceLevel,
          // A hidden dish duplicates hidden: the copy is a draft of the same
          // thing, and publishing it is a decision the owner makes on purpose.
          availability: source.availability,
          warnings: source.warnings,
          position: siblings.length,
        })
        .returning();
      if (!copy) throw new Error('Item insert returned no row');

      // Appended, then moved into place: `moveWithin` renumbers the siblings
      // it displaces, which is what keeps positions the dense 0..n-1 range
      // every other read here assumes.
      await this.writeItemPositions(
        tx,
        moveWithin([...siblings, { id: copy.id }], copy.id, source.position + 1),
      );
      await this.touchMenu(tx, menuId);

      const [row] = await tx
        .select(MenusService.ITEM_COLUMNS)
        .from(menuItem)
        .where(eq(menuItem.id, copy.id))
        .limit(1);
      if (!row) throw new Error('Duplicated item vanished inside its own transaction');
      return this.toItemView(row);
    });
  }

  async updateItem(
    accountId: string,
    menuId: string,
    sectionId: string,
    itemId: string,
    patch: {
      name?: string;
      description?: string | null;
      priceCzk?: number;
      position?: number;
      dietary?: DietaryId[];
      allergens?: AllergenNumber[];
      spiceLevel?: number;
      warnings?: WarningId[];
      availability?: Availability;
    },
  ): Promise<ItemView> {
    return this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);
      await this.requireSection(tx, menuId, sectionId);
      await this.requireItem(tx, sectionId, itemId);

      const fields = {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.priceCzk !== undefined ? { priceCzk: patch.priceCzk } : {}),
        // An empty array is a value, not an absence: it clears the set. The
        // column is NOT NULL, so there is no second way to say "declares
        // nothing".
        ...(patch.dietary !== undefined
          ? { dietary: orderedSubsetOf(DIETARY_IDS, patch.dietary) }
          : {}),
        ...(patch.allergens !== undefined
          ? { allergens: orderedSubsetOf(ALLERGEN_NUMBERS, patch.allergens) }
          : {}),
        ...(patch.spiceLevel !== undefined ? { spiceLevel: patch.spiceLevel } : {}),
        ...(patch.warnings !== undefined
          ? { warnings: orderedSubsetOf(WARNING_IDS, patch.warnings) }
          : {}),
        ...(patch.availability !== undefined ? { availability: patch.availability } : {}),
      };
      if (Object.keys(fields).length > 0) {
        await tx.update(menuItem).set(fields).where(eq(menuItem.id, itemId));
      }

      if (patch.position !== undefined) {
        const siblings = await this.itemIdsInOrder(tx, sectionId);
        await this.writeItemPositions(tx, moveWithin(siblings, itemId, patch.position));
      }

      await this.touchMenu(tx, menuId);

      const [row] = await tx
        .select(MenusService.ITEM_COLUMNS)
        .from(menuItem)
        .where(eq(menuItem.id, itemId))
        .limit(1);
      if (!row) throw AppError.notFound();
      return this.toItemView(row);
    });
  }

  async deleteItem(
    accountId: string,
    menuId: string,
    sectionId: string,
    itemId: string,
  ): Promise<void> {
    let orphaned: string[] = [];

    await this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);
      await this.requireSection(tx, menuId, sectionId);
      await this.requireItem(tx, sectionId, itemId);

      // Collected before the row goes: afterwards there is nothing left to say
      // which object belonged to it, and it would be an orphan forever.
      orphaned = await this.imageKeysOfItems(tx, eq(menuItem.id, itemId));

      await tx.delete(menuItem).where(eq(menuItem.id, itemId));
      await this.writeItemPositions(tx, await this.itemIdsInOrder(tx, sectionId));
      await this.touchMenu(tx, menuId);
    });

    await this.forget(orphaned, 'deleting a dish');
  }

  // -------------------------------------------------------- dish photographs

  /**
   * Stores a photograph for a dish, replacing any existing one (feature 006).
   *
   * The same ordering as the logo, for the same reasons: process first so a
   * file that is not an image never reaches storage, write under a new random
   * key so no cache can serve the old picture at the new address, update the
   * row, and only then delete what it displaced.
   */
  async setItemImage(
    accountId: string,
    menuId: string,
    sectionId: string,
    itemId: string,
    file: Buffer,
    crop?: CropRect,
  ): Promise<ItemView> {
    await this.requireOwnedMenu(this.db, accountId, menuId);
    await this.requireSection(this.db, menuId, sectionId);
    await this.requireItem(this.db, sectionId, itemId);

    const rendition = await processImage(file, 'dish', crop);
    const key = newDishKey();

    await this.storage.put(key, rendition.buffer, rendition.contentType);

    let written: { item: ItemView; previousKey: string | null };
    try {
      written = await this.writeItemImage(menuId, itemId, {
        imageKey: key,
        imageWidth: rendition.width,
        imageHeight: rendition.height,
      });
    } catch (error) {
      // The object exists but nothing references it. Removing it here is what
      // keeps a failed save from leaving litter behind.
      await this.forget([key], 'compensating for a failed dish image update');
      throw error;
    }

    await this.forget(written.previousKey ? [written.previousKey] : [], 'replaced dish photo');
    return written.item;
  }

  /** Idempotent: a dish with no photograph is already in the state asked for. */
  async removeItemImage(
    accountId: string,
    menuId: string,
    sectionId: string,
    itemId: string,
  ): Promise<ItemView> {
    await this.requireOwnedMenu(this.db, accountId, menuId);
    await this.requireSection(this.db, menuId, sectionId);
    await this.requireItem(this.db, sectionId, itemId);

    const written = await this.writeItemImage(menuId, itemId, {
      imageKey: null,
      imageWidth: null,
      imageHeight: null,
    });

    await this.forget(written.previousKey ? [written.previousKey] : [], 'removed dish photo');
    return written.item;
  }

  /**
   * Writes the three image columns and reports the key they replaced.
   *
   * One statement, so reading the old key and writing the new one cannot
   * interleave with another request doing the same: whichever lands second owns
   * the row, and the key it displaced is the one it deletes.
   */
  private async writeItemImage(
    menuId: string,
    itemId: string,
    columns: { imageKey: string | null; imageWidth: number | null; imageHeight: number | null },
  ): Promise<{ item: ItemView; previousKey: string | null }> {
    return this.db.transaction(async (tx) => {
      const previous = tx.$with('previous').as(
        tx.select({ imageKey: menuItem.imageKey }).from(menuItem).where(eq(menuItem.id, itemId)),
      );

      const [row] = await tx
        .with(previous)
        .update(menuItem)
        .set(columns)
        .where(eq(menuItem.id, itemId))
        .returning({
          ...MenusService.ITEM_COLUMNS,
          previousKey: sql<string | null>`(select ${previous.imageKey} from ${previous})`,
        });

      if (!row) throw AppError.notFound();

      await this.touchMenu(tx, menuId);

      const { previousKey, ...item } = row;
      return {
        item: this.toItemView(item),
        previousKey: previousKey === columns.imageKey ? null : previousKey,
      };
    });
  }

  /** The stored photographs of every dish matching a condition. */
  private async imageKeysOfItems(executor: Executor, where: SQL): Promise<string[]> {
    const rows = await executor
      .select({ imageKey: menuItem.imageKey })
      .from(menuItem)
      .where(and(where, isNotNull(menuItem.imageKey)))
      .limit(MAX_ITEMS_PER_MENU);

    return rows.map((row) => row.imageKey).filter((key): key is string => key !== null);
  }

  /**
   * Deletes objects nothing references any more, without letting a storage
   * failure undo a database write that already succeeded.
   *
   * The row is the record; an object nothing points at is litter, and litter is
   * what the sweep command collects. So a failure here is logged with the key
   * and swallowed rather than turned into an error for an action that worked.
   */
  private async forget(keys: string[], reason: string): Promise<void> {
    if (keys.length === 0) return;

    try {
      await this.storage.delete(keys);
    } catch (error) {
      this.logger.error(
        `Could not delete ${keys.join(', ')} after ${reason}; the sweep will collect it.`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  // ---------------------------------------------------- ownership lookups

  /**
   * A menu owned by somebody else is reported exactly like one that does not
   * exist: a 403 would confirm the id is real.
   */
  private async requireOwnedMenu(executor: Executor, accountId: string, menuId: string) {
    const [row] = await executor
      .select()
      .from(menu)
      .where(and(eq(menu.id, menuId), eq(menu.accountId, accountId)))
      .limit(1);
    if (!row) throw AppError.notFound();
    return row;
  }

  private async requireSection(executor: Executor, menuId: string, sectionId: string) {
    const [row] = await executor
      .select({ id: menuSection.id })
      .from(menuSection)
      .where(and(eq(menuSection.id, sectionId), eq(menuSection.menuId, menuId)))
      .limit(1);
    if (!row) throw AppError.notFound();
    return row;
  }

  private async requireItem(executor: Executor, sectionId: string, itemId: string) {
    const [row] = await executor
      .select({ id: menuItem.id })
      .from(menuItem)
      .where(and(eq(menuItem.id, itemId), eq(menuItem.sectionId, sectionId)))
      .limit(1);
    if (!row) throw AppError.notFound();
    return row;
  }

  // ------------------------------------------------------------- ordering

  private async sectionIdsInOrder(executor: Executor, menuId: string): Promise<{ id: string }[]> {
    return executor
      .select({ id: menuSection.id })
      .from(menuSection)
      .where(eq(menuSection.menuId, menuId))
      .orderBy(asc(menuSection.position), asc(menuSection.id))
      .limit(MAX_SECTIONS_PER_MENU);
  }

  private async itemIdsInOrder(executor: Executor, sectionId: string): Promise<{ id: string }[]> {
    return executor
      .select({ id: menuItem.id })
      .from(menuItem)
      .where(eq(menuItem.sectionId, sectionId))
      .orderBy(asc(menuItem.position), asc(menuItem.id))
      .limit(MAX_ITEMS_PER_MENU);
  }

  private async writeSectionPositions(
    executor: Executor,
    ordered: { id: string }[],
  ): Promise<void> {
    for (const [position, row] of ordered.entries()) {
      await executor.update(menuSection).set({ position }).where(eq(menuSection.id, row.id));
    }
  }

  private async writeItemPositions(executor: Executor, ordered: { id: string }[]): Promise<void> {
    for (const [position, row] of ordered.entries()) {
      await executor.update(menuItem).set({ position }).where(eq(menuItem.id, row.id));
    }
  }

  private async itemsOfSection(executor: Executor, sectionId: string): Promise<ItemView[]> {
    const rows = await executor
      .select(MenusService.ITEM_COLUMNS)
      .from(menuItem)
      .where(eq(menuItem.sectionId, sectionId))
      .orderBy(asc(menuItem.position), asc(menuItem.id))
      .limit(MAX_ITEMS_PER_MENU);

    return rows.map((row) => this.toItemView(row));
  }

  // -------------------------------------------------------------- helpers

  /**
   * The random suffix makes a collision vanishingly unlikely, but the unique
   * index is the authority, so check rather than assume.
   */
  private async assignSlug(executor: Executor, menuId: string, name: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateSlug(name);

      const [taken] = await executor
        .select({ id: menu.id })
        .from(menu)
        .where(eq(menu.publicSlug, candidate))
        .limit(1);
      if (taken) continue;

      await executor.update(menu).set({ publicSlug: candidate }).where(eq(menu.id, menuId));
      return candidate;
    }
    throw new Error('Could not allocate a unique public slug after 5 attempts');
  }

  private async touchMenu(executor: Executor, menuId: string): Promise<void> {
    await executor.update(menu).set({ updatedAt: new Date() }).where(eq(menu.id, menuId));
  }

  private toSummary(row: {
    id: string;
    name: string;
    status: string;
    publicSlug: string | null;
    updatedAt: Date;
  }): MenuSummary {
    return {
      id: row.id,
      name: row.name,
      status: row.status as MenuStatus,
      publicSlug: row.publicSlug,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
