import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { AppError } from '../common/app-error.js';
import { DRIZZLE, type DrizzleDb } from '../db/client.js';
import { menu, menuItem, menuSection } from '../db/schema.js';
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
}

export interface PublicMenuView {
  name: string;
  visualVariant: string;
  sections: { title: string; items: PublicMenuItem[] }[];
}

/** The transaction handle Drizzle hands to `db.transaction`. */
type Tx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];
/** Anything that can run a query: the pool, or a transaction. */
type Executor = DrizzleDb | Tx;

@Injectable()
export class MenusService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

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
          .select({
            id: menuItem.id,
            sectionId: menuItem.sectionId,
            name: menuItem.name,
            description: menuItem.description,
            priceCzk: menuItem.priceCzk,
            position: menuItem.position,
          })
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
          .map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            priceCzk: item.priceCzk,
            position: item.position,
          })),
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
    await this.requireOwnedMenu(this.db, accountId, menuId);
    // Sections and items go with it through ON DELETE CASCADE.
    await this.db.delete(menu).where(eq(menu.id, menuId));
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
    const [found] = await this.db
      .select({ id: menu.id, name: menu.name, visualVariant: menu.visualVariant })
      .from(menu)
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
      })
      .from(menuSection)
      .leftJoin(menuItem, eq(menuItem.sectionId, menuSection.id))
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
        });
      }
    }

    return { name: found.name, visualVariant: found.visualVariant, sections };
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
    await this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);
      await this.requireSection(tx, menuId, sectionId);

      // Items in the section go with it through ON DELETE CASCADE.
      await tx.delete(menuSection).where(eq(menuSection.id, sectionId));
      await this.writeSectionPositions(tx, await this.sectionIdsInOrder(tx, menuId));
      await this.touchMenu(tx, menuId);
    });
  }

  // ---------------------------------------------------------------- items

  async addItem(
    accountId: string,
    menuId: string,
    sectionId: string,
    values: { name: string; description?: string; priceCzk: number },
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
          position: siblings.length,
        })
        .returning();
      if (!row) throw new Error('Item insert returned no row');

      await this.touchMenu(tx, menuId);
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        priceCzk: row.priceCzk,
        position: row.position,
      };
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
        .select({
          id: menuItem.id,
          name: menuItem.name,
          description: menuItem.description,
          priceCzk: menuItem.priceCzk,
          position: menuItem.position,
        })
        .from(menuItem)
        .where(eq(menuItem.id, copy.id))
        .limit(1);
      if (!row) throw new Error('Duplicated item vanished inside its own transaction');
      return row;
    });
  }

  async updateItem(
    accountId: string,
    menuId: string,
    sectionId: string,
    itemId: string,
    patch: { name?: string; description?: string | null; priceCzk?: number; position?: number },
  ): Promise<ItemView> {
    return this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);
      await this.requireSection(tx, menuId, sectionId);
      await this.requireItem(tx, sectionId, itemId);

      const fields = {
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.priceCzk !== undefined ? { priceCzk: patch.priceCzk } : {}),
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
        .select({
          id: menuItem.id,
          name: menuItem.name,
          description: menuItem.description,
          priceCzk: menuItem.priceCzk,
          position: menuItem.position,
        })
        .from(menuItem)
        .where(eq(menuItem.id, itemId))
        .limit(1);
      if (!row) throw AppError.notFound();
      return row;
    });
  }

  async deleteItem(
    accountId: string,
    menuId: string,
    sectionId: string,
    itemId: string,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      await this.requireOwnedMenu(tx, accountId, menuId);
      await this.requireSection(tx, menuId, sectionId);
      await this.requireItem(tx, sectionId, itemId);

      await tx.delete(menuItem).where(eq(menuItem.id, itemId));
      await this.writeItemPositions(tx, await this.itemIdsInOrder(tx, sectionId));
      await this.touchMenu(tx, menuId);
    });
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
    return executor
      .select({
        id: menuItem.id,
        name: menuItem.name,
        description: menuItem.description,
        priceCzk: menuItem.priceCzk,
        position: menuItem.position,
      })
      .from(menuItem)
      .where(eq(menuItem.sectionId, sectionId))
      .orderBy(asc(menuItem.position), asc(menuItem.id))
      .limit(MAX_ITEMS_PER_MENU);
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
