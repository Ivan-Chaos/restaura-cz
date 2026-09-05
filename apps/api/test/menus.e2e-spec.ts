import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ALLERGEN_NUMBERS,
  AVAILABILITIES,
  DIETARY_IDS,
  WARNING_IDS,
} from '../src/menus/item-attributes.js';
import { VISUAL_VARIANTS } from '../src/menus/visual-variants.js';
import { createTestApp, type TestApp } from './app.factory.js';
import { addItem, addSection, createMenu, signUp, type SignedUpOwner } from './helpers.js';

describe('menus (US2)', () => {
  let testApp: TestApp;
  let owner: SignedUpOwner;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  beforeEach(async () => {
    await testApp.reset();
    owner = await signUp(testApp);
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('menu lifecycle', () => {
    it('creates a menu in the draft state with no sections (AS1)', async () => {
      const response = await request(testApp.server)
        .post('/menus')
        .set('Cookie', owner.cookie)
        .send({ name: 'Polední menu' })
        .expect(201);

      expect(response.body.menu).toMatchObject({
        name: 'Polední menu',
        status: 'draft',
        publicSlug: null,
        visualVariant: 'default',
        sections: [],
      });
    });

    it('lists the owner’s menus with their status', async () => {
      await createMenu(testApp, owner.cookie, 'První');
      await createMenu(testApp, owner.cookie, 'Druhé');

      const response = await request(testApp.server)
        .get('/menus')
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.menus).toHaveLength(2);
      expect(response.body.menus[0]).toMatchObject({ status: 'draft', publicSlug: null });
    });

    it('renames a menu', async () => {
      const menuId = await createMenu(testApp, owner.cookie, 'Původní');

      const response = await request(testApp.server)
        .patch(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .send({ name: 'Nový název' })
        .expect(200);

      expect(response.body.menu.name).toBe('Nový název');
    });

    it('deletes a menu and everything in it (AS4)', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      await addItem(testApp, owner.cookie, menuId, sectionId, { name: 'Kulajda', priceCzk: 89 });

      await request(testApp.server)
        .delete(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(204);

      await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(404);
    });

    it('persists content across separate requests (AS6)', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        description: 'S vejcem',
        priceCzk: 89,
      });

      const response = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.menu.sections).toHaveLength(1);
      expect(response.body.menu.sections[0].items[0]).toMatchObject({
        name: 'Kulajda',
        description: 'S vejcem',
        priceCzk: 89,
      });
    });
  });

  describe('sections (AS2)', () => {
    it('appends sections in creation order', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      await addSection(testApp, owner.cookie, menuId, 'Polévky');
      await addSection(testApp, owner.cookie, menuId, 'Hlavní jídla');

      const response = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.menu.sections.map((s: { title: string }) => s.title)).toEqual([
        'Polévky',
        'Hlavní jídla',
      ]);
      expect(response.body.menu.sections.map((s: { position: number }) => s.position)).toEqual([
        0, 1,
      ]);
    });

    it('reorders sections and renumbers the siblings', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      await addSection(testApp, owner.cookie, menuId, 'A');
      await addSection(testApp, owner.cookie, menuId, 'B');
      const thirdId = await addSection(testApp, owner.cookie, menuId, 'C');

      await request(testApp.server)
        .patch(`/menus/${menuId}/sections/${thirdId}`)
        .set('Cookie', owner.cookie)
        .send({ position: 0 })
        .expect(200);

      const response = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.menu.sections.map((s: { title: string }) => s.title)).toEqual([
        'C',
        'A',
        'B',
      ]);
      expect(response.body.menu.sections.map((s: { position: number }) => s.position)).toEqual([
        0, 1, 2,
      ]);
    });

    it('closes the gap in positions after a delete', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      await addSection(testApp, owner.cookie, menuId, 'A');
      const middleId = await addSection(testApp, owner.cookie, menuId, 'B');
      await addSection(testApp, owner.cookie, menuId, 'C');

      await request(testApp.server)
        .delete(`/menus/${menuId}/sections/${middleId}`)
        .set('Cookie', owner.cookie)
        .expect(204);

      const response = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.menu.sections.map((s: { position: number }) => s.position)).toEqual([
        0, 1,
      ]);
    });

    it('deletes the items inside a deleted section', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      await addItem(testApp, owner.cookie, menuId, sectionId, { name: 'Kulajda', priceCzk: 89 });

      await request(testApp.server)
        .delete(`/menus/${menuId}/sections/${sectionId}`)
        .set('Cookie', owner.cookie)
        .expect(204);

      const response = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.menu.sections).toEqual([]);
    });
  });

  describe('items (AS3, AS7)', () => {
    it('accepts an item without a description', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');

      const response = await request(testApp.server)
        .post(`/menus/${menuId}/sections/${sectionId}/items`)
        .set('Cookie', owner.cookie)
        .send({ name: 'Kulajda', priceCzk: 89 })
        .expect(201);

      expect(response.body.item).toMatchObject({
        name: 'Kulajda',
        description: null,
        priceCzk: 89,
        position: 0,
      });
    });

    it('accepts a price of zero', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Doplňky');

      const response = await request(testApp.server)
        .post(`/menus/${menuId}/sections/${sectionId}/items`)
        .set('Cookie', owner.cookie)
        .send({ name: 'Voda', priceCzk: 0 })
        .expect(201);

      expect(response.body.item.priceCzk).toBe(0);
    });

    it('keeps the hellers in a price that has them', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');

      const response = await request(testApp.server)
        .post(`/menus/${menuId}/sections/${sectionId}/items`)
        .set('Cookie', owner.cookie)
        .send({ name: 'Kulajda', priceCzk: 56.5 })
        .expect(201);

      expect(response.body.item.priceCzk).toBe(56.5);

      // And again after a round trip through the column, which is where a
      // float would have turned it into 56.49999999999999.
      const reread = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(reread.body.menu.sections[0].items[0].priceCzk).toBe(56.5);
    });

    it.each([
      ['an empty name', { name: '', priceCzk: 89 }],
      ['a missing name', { priceCzk: 89 }],
      ['a negative price', { name: 'Kulajda', priceCzk: -1 }],
      ['a price with more than two decimals', { name: 'Kulajda', priceCzk: 89.555 }],
      ['a non-numeric price', { name: 'Kulajda', priceCzk: 'free' }],
      ['a missing price', { name: 'Kulajda' }],
      ['an unknown dietary marker', { name: 'Kulajda', priceCzk: 89, dietary: ['spicy'] }],
      ['a dietary marker that is not a list', { name: 'Kulajda', priceCzk: 89, dietary: 'vegan' }],
      ['allergen 0', { name: 'Kulajda', priceCzk: 89, allergens: [0] }],
      ['allergen 15', { name: 'Kulajda', priceCzk: 89, allergens: [15] }],
      ['an allergen sent as text', { name: 'Kulajda', priceCzk: 89, allergens: ['3'] }],
      ['a spice level above the scale', { name: 'Kulajda', priceCzk: 89, spiceLevel: 4 }],
      ['a negative spice level', { name: 'Kulajda', priceCzk: 89, spiceLevel: -1 }],
      ['a fractional spice level', { name: 'Kulajda', priceCzk: 89, spiceLevel: 1.5 }],
      ['an unknown warning', { name: 'Kulajda', priceCzk: 89, warnings: ['containsBees'] }],
      ['an unknown availability', { name: 'Kulajda', priceCzk: 89, availability: 'maybe' }],
    ])('rejects %s', async (_label, body) => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');

      const response = await request(testApp.server)
        .post(`/menus/${menuId}/sections/${sectionId}/items`)
        .set('Cookie', owner.cookie)
        .send(body)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    it('edits an item and can clear its description with null', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      const itemId = await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        description: 'S vejcem',
        priceCzk: 89,
      });

      const response = await request(testApp.server)
        .patch(`/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
        .set('Cookie', owner.cookie)
        .send({ priceCzk: 95, description: null })
        .expect(200);

      expect(response.body.item).toMatchObject({ priceCzk: 95, description: null });
    });

    it('reorders items within a section', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      await addItem(testApp, owner.cookie, menuId, sectionId, { name: 'První', priceCzk: 10 });
      const secondId = await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Druhá',
        priceCzk: 20,
      });

      await request(testApp.server)
        .patch(`/menus/${menuId}/sections/${sectionId}/items/${secondId}`)
        .set('Cookie', owner.cookie)
        .send({ position: 0 })
        .expect(200);

      const response = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.menu.sections[0].items.map((i: { name: string }) => i.name)).toEqual([
        'Druhá',
        'První',
      ]);
    });

    it('deletes an item', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      const itemId = await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
      });

      await request(testApp.server)
        .delete(`/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
        .set('Cookie', owner.cookie)
        .expect(204);

      const response = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.menu.sections[0].items).toEqual([]);
    });
  });

  describe('what a dish declares (allergens, diet, heat, warnings, availability)', () => {
    async function section() {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      return { menuId, sectionId };
    }

    async function reread(menuId: string) {
      const response = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);
      return response.body.menu.sections[0].items[0];
    }

    it('defaults a dish that declares nothing, rather than leaving it null', async () => {
      const { menuId, sectionId } = await section();
      await addItem(testApp, owner.cookie, menuId, sectionId, { name: 'Kulajda', priceCzk: 89 });

      expect(await reread(menuId)).toMatchObject({
        dietary: [],
        allergens: [],
        spiceLevel: 0,
        warnings: [],
        availability: 'available',
      });
    });

    it('keeps every field across a round trip', async () => {
      const { menuId, sectionId } = await section();
      await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
        dietary: ['vegetarian', 'lenten'],
        allergens: [3, 7],
        spiceLevel: 2,
        warnings: ['rawOrUndercooked', 'servedVeryHot'],
        availability: 'limited',
      });

      expect(await reread(menuId)).toMatchObject({
        dietary: ['vegetarian', 'lenten'],
        allergens: [3, 7],
        spiceLevel: 2,
        warnings: ['rawOrUndercooked', 'servedVeryHot'],
        availability: 'limited',
      });
    });

    it('stores a set in catalogue order, whatever order it arrived in', async () => {
      const { menuId, sectionId } = await section();
      await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
        dietary: ['kosher', 'vegan', 'halal'],
        allergens: [11, 1, 7],
      });

      // Two dishes carrying the same claims must read identically, so the order
      // the boxes were ticked in is not part of the data.
      expect(await reread(menuId)).toMatchObject({
        dietary: ['vegan', 'halal', 'kosher'],
        allergens: [1, 7, 11],
      });
    });

    it('collapses a repeated entry instead of storing it twice', async () => {
      const { menuId, sectionId } = await section();
      await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
        dietary: ['vegan', 'vegan'],
        allergens: [7, 7, 7],
      });

      // A CHECK constraint may not contain a subquery, and every SQL spelling
      // of "no repeated element" needs one, so the service normalises instead.
      expect(await reread(menuId)).toMatchObject({ dietary: ['vegan'], allergens: [7] });
    });

    it('clears a set with an empty list', async () => {
      const { menuId, sectionId } = await section();
      const itemId = await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
        dietary: ['vegan'],
        allergens: [7],
      });

      await request(testApp.server)
        .patch(`/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
        .set('Cookie', owner.cookie)
        .send({ dietary: [], allergens: [] })
        .expect(200);

      expect(await reread(menuId)).toMatchObject({ dietary: [], allergens: [] });
    });

    it('counts clearing a set as a change', async () => {
      const { menuId, sectionId } = await section();
      const itemId = await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
        dietary: ['vegan'],
      });

      // An empty array is a value, not an absence, so it must not trip the
      // "this PATCH changes nothing" guard.
      await request(testApp.server)
        .patch(`/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
        .set('Cookie', owner.cookie)
        .send({ dietary: [] })
        .expect(200);
    });

    it.each([
      ['dietary', { dietary: null }],
      ['allergens', { allergens: null }],
      ['spiceLevel', { spiceLevel: null }],
      ['warnings', { warnings: null }],
      ['availability', { availability: null }],
    ])('answers a null %s with a 400, not a 500', async (_label, body) => {
      const { menuId, sectionId } = await section();
      const itemId = await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
      });

      // The column is NOT NULL with a default, so there is no such thing as "no
      // value" here, only the empty one. Without OptionalButNotNull the null
      // sails past validation and comes back as a 23502 dressed up as a 500.
      const response = await request(testApp.server)
        .patch(`/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
        .set('Cookie', owner.cookie)
        .send(body)
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('pins the vocabularies the frontend copies', () => {
      // Copied into apps/frontend/tests/unit/item-attributes.test.ts. The two
      // must agree, or one side is lying to its users.
      expect([...DIETARY_IDS]).toEqual([
        'vegetarian',
        'vegan',
        'glutenFree',
        'lactoseFree',
        'halal',
        'kosher',
        'lenten',
      ]);
      expect([...ALLERGEN_NUMBERS]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
      expect([...WARNING_IDS]).toEqual([
        'containsAlcohol',
        'rawOrUndercooked',
        'mayContainBones',
        'servedVeryHot',
        'containsCaffeine',
      ]);
      expect([...AVAILABILITIES]).toEqual(['available', 'limited', 'soldOut', 'hidden']);
    });

    it('does not offer "spicy" as a marker, because heat is a degree', () => {
      // Two spellings of "this dish is spicy" is exactly the kind of thing that
      // drifts apart; spiceLevel is the one that counts.
      expect(DIETARY_IDS).not.toContain('spicy');
    });
  });

  describe('duplicating an item', () => {
    it('puts the copy directly below the original, fields and all', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      const itemId = await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        description: 'S vejcem',
        priceCzk: 56.5,
      });
      await addItem(testApp, owner.cookie, menuId, sectionId, { name: 'Česnečka', priceCzk: 79 });

      const response = await request(testApp.server)
        .post(`/menus/${menuId}/sections/${sectionId}/items/${itemId}/duplicate`)
        .set('Cookie', owner.cookie)
        .expect(201);

      expect(response.body.item).toMatchObject({
        name: 'Kulajda',
        description: 'S vejcem',
        priceCzk: 56.5,
        position: 1,
      });
      expect(response.body.item.id).not.toBe(itemId);

      const reread = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(reread.body.menu.sections[0].items.map((i: { name: string }) => i.name)).toEqual([
        'Kulajda',
        'Kulajda',
        'Česnečka',
      ]);
      expect(reread.body.menu.sections[0].items.map((i: { position: number }) => i.position)).toEqual(
        [0, 1, 2],
      );
    });

    it('carries the dish’s declarations onto the copy', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      const itemId = await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
        dietary: ['vegetarian', 'lenten'],
        allergens: [3, 7],
        spiceLevel: 2,
        warnings: ['rawOrUndercooked'],
        availability: 'hidden',
      });

      const response = await request(testApp.server)
        .post(`/menus/${menuId}/sections/${sectionId}/items/${itemId}/duplicate`)
        .set('Cookie', owner.cookie)
        .expect(201);

      // Unlike the photograph, which a copy deliberately does not inherit,
      // these are text: two rows may hold the same markers without either one
      // being able to break the other. A hidden dish duplicates hidden, because
      // the copy is a draft of the same thing.
      expect(response.body.item).toMatchObject({
        dietary: ['vegetarian', 'lenten'],
        allergens: [3, 7],
        spiceLevel: 2,
        warnings: ['rawOrUndercooked'],
        availability: 'hidden',
        image: null,
      });
    });

    it('hides another owner’s dish behind a 404', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      const itemId = await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
      });
      const intruder = await signUp(testApp);

      await request(testApp.server)
        .post(`/menus/${menuId}/sections/${sectionId}/items/${itemId}/duplicate`)
        .set('Cookie', intruder.cookie)
        .expect(404);
    });

    it('answers 404 for a dish that does not exist', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');

      await request(testApp.server)
        .post(
          `/menus/${menuId}/sections/${sectionId}/items/00000000-0000-4000-8000-000000000000/duplicate`,
        )
        .set('Cookie', owner.cookie)
        .expect(404);
    });
  });

  describe('visual variant (FR-010; feature 005 FR-001, FR-005, FR-006)', () => {
    it.each(VISUAL_VARIANTS)('accepts the "%s" variant and echoes it', async (variant) => {
      const menuId = await createMenu(testApp, owner.cookie);

      const response = await request(testApp.server)
        .patch(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .send({ visualVariant: variant })
        .expect(200);

      expect(response.body.menu.visualVariant).toBe(variant);

      // And it is what the owner reads back, not just what the PATCH echoed.
      const detail = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);
      expect(detail.body.menu.visualVariant).toBe(variant);
    });

    it('answers a null variant with a 400, not a 500', async () => {
      const menuId = await createMenu(testApp, owner.cookie);

      // The column is NOT NULL with a default, so there is no such thing as
      // "no visual variant" — there is only the default one. @IsOptional used
      // to wave the null past every validator and into the UPDATE.
      const response = await request(testApp.server)
        .patch(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .send({ visualVariant: null })
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });

    it('offers exactly the six styles the frontend catalogue pins', () => {
      // The frontend copies this literal into tests/unit/variants.test.ts; the
      // two must agree or one side is lying to its users.
      expect([...VISUAL_VARIANTS]).toEqual([
        'default',
        'plain-white',
        'liquid-glass',
        'green-bar',
        'modern',
        'refined',
      ]);
    });

    it('refuses a change from anyone but the owner', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const intruder = await signUp(testApp, 'intruder@example.com');

      await request(testApp.server)
        .patch(`/menus/${menuId}`)
        .set('Cookie', intruder.cookie)
        .send({ visualVariant: 'refined' })
        .expect(404);

      const detail = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);
      expect(detail.body.menu.visualVariant).toBe('default');
    });

    it('rejects a variant that does not exist yet', async () => {
      const menuId = await createMenu(testApp, owner.cookie);

      const response = await request(testApp.server)
        .patch(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .send({ visualVariant: 'elegant' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('ownership and authentication (FR-005)', () => {
    it('rejects every menu route without a session', async () => {
      const menuId = await createMenu(testApp, owner.cookie);

      await request(testApp.server).get('/menus').expect(401);
      await request(testApp.server).post('/menus').send({ name: 'X' }).expect(401);
      await request(testApp.server).get(`/menus/${menuId}`).expect(401);
      await request(testApp.server).delete(`/menus/${menuId}`).expect(401);
    });

    it('hides another owner’s menu behind a 404 rather than a 403', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const intruder = await signUp(testApp);

      await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', intruder.cookie)
        .expect(404);

      await request(testApp.server)
        .patch(`/menus/${menuId}`)
        .set('Cookie', intruder.cookie)
        .send({ name: 'Hijacked' })
        .expect(404);

      await request(testApp.server)
        .delete(`/menus/${menuId}`)
        .set('Cookie', intruder.cookie)
        .expect(404);
    });

    it('does not let another owner add content to a menu', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      const intruder = await signUp(testApp);

      await request(testApp.server)
        .post(`/menus/${menuId}/sections`)
        .set('Cookie', intruder.cookie)
        .send({ title: 'Theirs' })
        .expect(404);

      await request(testApp.server)
        .post(`/menus/${menuId}/sections/${sectionId}/items`)
        .set('Cookie', intruder.cookie)
        .send({ name: 'Theirs', priceCzk: 1 })
        .expect(404);
    });

    it('answers 404 for an unknown menu id and for a malformed one alike', async () => {
      await request(testApp.server)
        .get('/menus/00000000-0000-4000-8000-000000000000')
        .set('Cookie', owner.cookie)
        .expect(404);

      await request(testApp.server)
        .get('/menus/not-a-uuid')
        .set('Cookie', owner.cookie)
        .expect(404);
    });

    it('does not let a section from one menu be addressed through another', async () => {
      const menuId = await createMenu(testApp, owner.cookie, 'První');
      const otherMenuId = await createMenu(testApp, owner.cookie, 'Druhé');
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');

      await request(testApp.server)
        .patch(`/menus/${otherMenuId}/sections/${sectionId}`)
        .set('Cookie', owner.cookie)
        .send({ title: 'Wrong menu' })
        .expect(404);
    });
  });

  it('rejects a patch that would change nothing', async () => {
    const menuId = await createMenu(testApp, owner.cookie);

    const response = await request(testApp.server)
      .patch(`/menus/${menuId}`)
      .set('Cookie', owner.cookie)
      .send({})
      .expect(400);

    expect(response.body.error.code).toBe('VALIDATION_FAILED');
  });
});
