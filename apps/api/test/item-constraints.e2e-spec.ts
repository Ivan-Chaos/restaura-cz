import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureTestDatabase } from './database.js';

/**
 * What the schema refuses on its own, with the application taken out of the way.
 *
 * Every other suite reaches the database through HTTP, so a green run proves
 * the DTOs are doing their job and says nothing about the CHECK constraints
 * underneath them. Delete the `@IsIn` decorators and those suites still pass.
 * This one writes raw SQL as a client with no validation layer at all, which is
 * the only way to hold the schema to the constitution's claim that data
 * integrity lives in Postgres and not only in application code.
 *
 * `23514` is `check_violation`. Asserting the SQLSTATE rather than the message
 * keeps the test independent of the constraint's wording and of the server's
 * locale.
 */
describe('menu_item constraints, enforced by Postgres itself', () => {
  let client: Client;
  let sectionId: string;

  beforeAll(async () => {
    const url = await ensureTestDatabase();
    client = new Client({ connectionString: url });
    await client.connect();

    // A section to hang the rows on, written the same way: no service, no DTO.
    const account = await client.query<{ id: string }>(
      `insert into owner_account (email, password_hash) values ($1, $2) returning id`,
      [`constraints-${Date.now()}@example.com`, 'x'],
    );
    const menu = await client.query<{ id: string }>(
      `insert into menu (account_id, name) values ($1, $2) returning id`,
      [account.rows[0]!.id, 'Constraint fixtures'],
    );
    const section = await client.query<{ id: string }>(
      `insert into menu_section (menu_id, title, position) values ($1, $2, 0) returning id`,
      [menu.rows[0]!.id, 'Polévky'],
    );
    sectionId = section.rows[0]!.id;
  });

  afterAll(async () => {
    await client?.end();
  });

  /** Inserts a dish with one column overridden, and reports what Postgres said. */
  async function insertWith(column: string, value: unknown): Promise<string | undefined> {
    try {
      await client.query(
        `insert into menu_item (section_id, name, price_czk, position, ${column})
         values ($1, 'Kulajda', 89, 0, $2)`,
        [sectionId, value],
      );
      return undefined;
    } catch (error) {
      return (error as { code?: string }).code;
    }
  }

  it.each([
    ['an unknown dietary marker', 'dietary', ['spicy']],
    ['a marker that is merely misspelt', 'dietary', ['vegann']],
    ['an allergen below the legend', 'allergens', [0]],
    ['an allergen above the legend', 'allergens', [15]],
    ['a spice level off the scale', 'spice_level', 4],
    ['a negative spice level', 'spice_level', -1],
    ['an unknown warning', 'warnings', ['containsBees']],
    ['an availability nobody defined', 'availability', 'maybe'],
  ])('refuses %s', async (_label, column, value) => {
    expect(await insertWith(column, value)).toBe('23514');
  });

  it('refuses a null inside a set, which containment alone would not catch', async () => {
    // A CHECK that evaluates to NULL passes, so this is worth pinning rather
    // than assuming: `array['vegan', null] <@ array[...]` is false, not null.
    expect(await insertWith('dietary', ['vegan', null])).toBe('23514');
  });

  it('refuses more entries than the catalogue holds', async () => {
    // Cardinality is a defensive cap in the spirit of MAX_ITEMS_PER_MENU: the
    // whole catalogue is honestly tickable, more than it never is.
    const tooMany = Array.from({ length: 15 }, (_, i) => (i % 14) + 1);
    expect(await insertWith('allergens', tooMany)).toBe('23514');
  });

  it.each([
    ['every dietary marker at once', 'dietary', [
      'vegetarian', 'vegan', 'glutenFree', 'lactoseFree', 'halal', 'kosher', 'lenten',
    ]],
    ['every allergen at once', 'allergens', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]],
    ['every warning at once', 'warnings', [
      'containsAlcohol', 'rawOrUndercooked', 'mayContainBones', 'servedVeryHot', 'containsCaffeine',
    ]],
    ['the empty set', 'dietary', []],
    ['the top of the spice scale', 'spice_level', 3],
    ['a hidden dish', 'availability', 'hidden'],
  ])('accepts %s', async (_label, column, value) => {
    expect(await insertWith(column, value)).toBeUndefined();
  });
});
