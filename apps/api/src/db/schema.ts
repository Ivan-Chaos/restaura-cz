import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * The schema is the source of truth for data integrity. Every rule the domain
 * depends on is a constraint here, not only a validation rule in a DTO: the DTO
 * gives the owner a friendly message, the constraint is what makes the rule
 * true.
 */

export const ownerAccount = pgTable(
  'owner_account',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Stored as entered; uniqueness is case-insensitive via the index below. */
    email: text('email').notNull(),
    /** Argon2id PHC string. */
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('owner_account_email_lower_idx').on(sql`lower(${table.email})`),
  ],
);

export const session = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id')
    .notNull()
    .references(() => ownerAccount.id, { onDelete: 'cascade' }),
  /** SHA-256 of the opaque cookie token. The raw token exists only in the cookie. */
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const menu = pgTable(
  'menu',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => ownerAccount.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    status: text('status').notNull().default('draft'),
    /** Stubbed to 'default' for now so future variants need no migration. */
    visualVariant: text('visual_variant').notNull().default('default'),
    /** NULL until first publish; assigned once and never changed, so printed QR codes keep working. */
    publicSlug: text('public_slug'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('menu_account_id_idx').on(table.accountId),
    uniqueIndex('menu_public_slug_idx')
      .on(table.publicSlug)
      .where(sql`${table.publicSlug} is not null`),
    check('menu_name_length', sql`char_length(${table.name}) between 1 and 120`),
    check('menu_status_valid', sql`${table.status} in ('draft', 'published')`),
  ],
);

export const menuSection = pgTable(
  'menu_section',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    menuId: uuid('menu_id')
      .notNull()
      .references(() => menu.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('menu_section_menu_position_idx').on(table.menuId, table.position),
    check('menu_section_title_length', sql`char_length(${table.title}) between 1 and 120`),
  ],
);

export const menuItem = pgTable(
  'menu_item',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sectionId: uuid('section_id')
      .notNull()
      .references(() => menuSection.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    /** Whole korunas. Menus are never priced in hundredths. */
    priceCzk: integer('price_czk').notNull(),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('menu_item_section_position_idx').on(table.sectionId, table.position),
    check('menu_item_name_length', sql`char_length(${table.name}) between 1 and 200`),
    check(
      'menu_item_description_length',
      sql`${table.description} is null or char_length(${table.description}) <= 2000`,
    ),
    check('menu_item_price_non_negative', sql`${table.priceCzk} >= 0`),
  ],
);

export type OwnerAccountRow = typeof ownerAccount.$inferSelect;
export type MenuRow = typeof menu.$inferSelect;
export type MenuSectionRow = typeof menuSection.$inferSelect;
export type MenuItemRow = typeof menuItem.$inferSelect;
