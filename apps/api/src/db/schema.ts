import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
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
    /**
     * When the owner proved they can read this address. NULL means unproven,
     * and that is the whole gate signal — a timestamp rather than a boolean
     * because "when" answers questions a flag cannot (how long an account sat
     * unverified, whether a code was used before or after a policy change).
     */
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('owner_account_email_lower_idx').on(sql`lower(${table.email})`),
  ],
);

/**
 * The outstanding email confirmation code for an account, if any.
 *
 * `accountId` is primary key and foreign key, so an account can only ever have
 * one code outstanding: resending replaces the row rather than adding to it,
 * which is what makes the attempt counter and the resend cooldown answerable
 * from a single row instead of a "latest of many" query. The row is deleted on
 * success, so its presence alone means "still waiting".
 *
 * Only the hash is stored, following the same reasoning as `session.tokenHash`:
 * a leaked database must not hand out working codes. The account id is mixed
 * into the hash so one precomputed table cannot be tried against every row at
 * once.
 */
export const emailConfirmation = pgTable(
  'email_confirmation',
  {
    accountId: uuid('account_id')
      .primaryKey()
      .references(() => ownerAccount.id, { onDelete: 'cascade' }),
    /** SHA-256 of `<accountId>.<code>`. The code itself exists only in the email. */
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    /**
     * Failed guesses against this code. The cap is the real defence: six digits
     * is a million possibilities, which is only enough if guessing is bounded.
     */
    attempts: integer('attempts').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('email_confirmation_attempts_range', sql`${table.attempts} between 0 and 5`),
  ],
);

/**
 * The business identity behind an account: what a guest sees on a menu and how
 * they reach the restaurant.
 *
 * `accountId` is both primary key and foreign key, which is what makes the
 * one-profile-per-account rule structural rather than a uniqueness index we
 * have to remember to add. Its *absence* is meaningful too: an account with no
 * row here is incomplete, and the frontend gates the dashboard on exactly that.
 */
export const restaurantProfile = pgTable(
  'restaurant_profile',
  {
    accountId: uuid('account_id')
      .primaryKey()
      .references(() => ownerAccount.id, { onDelete: 'cascade' }),
    restaurantName: text('restaurant_name').notNull(),
    /**
     * One to three numbers, in the order the owner entered them. An array
     * rather than a child table: the list is capped, has no per-entry metadata,
     * and is always read and written whole, so a join would buy nothing. Per
     * entry format is a boundary rule (ProfileDto); the count is an invariant,
     * so it lives here.
     */
    phones: text('phones').array().notNull(),
    /** Free-form address text. Never geocoded, so never parsed into parts. */
    location: text('location').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'restaurant_profile_name_length',
      sql`char_length(${table.restaurantName}) between 1 and 120`,
    ),
    check('restaurant_profile_phones_count', sql`cardinality(${table.phones}) between 1 and 3`),
    check(
      'restaurant_profile_location_length',
      sql`char_length(${table.location}) between 1 and 200`,
    ),
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
    /**
     * Korunas, to at most two decimal places.
     *
     * `numeric` rather than a float because a price is money: binary floating
     * point cannot hold 56.50 exactly, and a menu that prints 56,49 because of
     * it is a bug an owner cannot explain. `mode: 'number'` because the scale
     * is fixed at 2 and no menu price comes close to losing precision in a
     * double, so the whole stack above this row keeps working in korunas.
     */
    priceCzk: numeric('price_czk', { precision: 10, scale: 2, mode: 'number' }).notNull(),
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
export type RestaurantProfileRow = typeof restaurantProfile.$inferSelect;
export type EmailConfirmationRow = typeof emailConfirmation.$inferSelect;
export type MenuRow = typeof menu.$inferSelect;
export type MenuSectionRow = typeof menuSection.$inferSelect;
export type MenuItemRow = typeof menuItem.$inferSelect;
