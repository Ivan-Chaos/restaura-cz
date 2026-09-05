import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './app.factory.js';
import {
  addItem,
  addSection,
  createMenu,
  PROFILE,
  signUp,
  type SignedUpOwner,
} from './helpers.js';

describe('publishing and public display (US3, US4)', () => {
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

  /** A menu with one section and one item, published. */
  async function publishedMenu(name = 'Polední menu') {
    const menuId = await createMenu(testApp, owner.cookie, name);
    const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
    await addItem(testApp, owner.cookie, menuId, sectionId, {
      name: 'Kulajda',
      description: 'S vejcem',
      priceCzk: 89,
    });

    const response = await request(testApp.server)
      .post(`/menus/${menuId}/publish`)
      .set('Cookie', owner.cookie)
      .expect(200);

    return { menuId, sectionId, slug: response.body.publicSlug as string };
  }

  describe('publish', () => {
    it('assigns a readable, stable slug and reports the public path (AS2)', async () => {
      const menuId = await createMenu(testApp, owner.cookie, 'Polední menu');

      const response = await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.status).toBe('published');
      // Diacritics are folded, and a random suffix keeps it unguessable.
      expect(response.body.publicSlug).toMatch(/^poledni-menu-[a-z0-9]{6}$/);
      expect(response.body.publicPath).toBe(`/m/${response.body.publicSlug}`);
    });

    it('is idempotent and keeps the same slug when published twice', async () => {
      const menuId = await createMenu(testApp, owner.cookie);

      const first = await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);
      const second = await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(second.body.publicSlug).toBe(first.body.publicSlug);
    });

    it('publishes an empty menu without complaint', async () => {
      const menuId = await createMenu(testApp, owner.cookie, 'Prázdné');

      await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      const slugResponse = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      const response = await request(testApp.server)
        .get(`/public/menus/${slugResponse.body.menu.publicSlug}`)
        .expect(200);

      expect(response.body.menu.sections).toEqual([]);
    });

    it('falls back to a usable slug for a name with no Latin characters', async () => {
      const menuId = await createMenu(testApp, owner.cookie, '菜单');

      const response = await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.publicSlug).toMatch(/^menu-[a-z0-9]{6}$/);
    });

    it('refuses to publish a menu belonging to somebody else (AS5)', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const intruder = await signUp(testApp);

      await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', intruder.cookie)
        .expect(404);

      await request(testApp.server)
        .post(`/menus/${menuId}/unpublish`)
        .set('Cookie', intruder.cookie)
        .expect(404);
    });

    it('requires a session', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      await request(testApp.server).post(`/menus/${menuId}/publish`).expect(401);
    });
  });

  describe('visibility gate (AS1, AS3)', () => {
    it('does not serve a draft menu at its address', async () => {
      const { menuId, slug } = await publishedMenu();

      await request(testApp.server)
        .post(`/menus/${menuId}/unpublish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      const response = await request(testApp.server).get(`/public/menus/${slug}`).expect(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('answers the same for an unknown slug as for an unpublished one', async () => {
      const { menuId, slug } = await publishedMenu();
      await request(testApp.server)
        .post(`/menus/${menuId}/unpublish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      const unpublished = await request(testApp.server).get(`/public/menus/${slug}`).expect(404);
      const unknown = await request(testApp.server).get('/public/menus/no-such-menu').expect(404);

      expect(unpublished.body).toEqual(unknown.body);
    });

    it('keeps the slug after unpublishing, and reuses it on republish', async () => {
      const { menuId, slug } = await publishedMenu();

      const unpublished = await request(testApp.server)
        .post(`/menus/${menuId}/unpublish`)
        .set('Cookie', owner.cookie)
        .expect(200);
      expect(unpublished.body).toEqual({ status: 'draft', publicSlug: slug });

      const republished = await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);
      expect(republished.body.publicSlug).toBe(slug);

      await request(testApp.server).get(`/public/menus/${slug}`).expect(200);
    });

    it('unpublish is idempotent on a draft', async () => {
      const menuId = await createMenu(testApp, owner.cookie);

      const response = await request(testApp.server)
        .post(`/menus/${menuId}/unpublish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body).toEqual({ status: 'draft', publicSlug: null });
    });

    it('stops serving a deleted menu’s address', async () => {
      const { menuId, slug } = await publishedMenu();

      await request(testApp.server)
        .delete(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(204);

      await request(testApp.server).get(`/public/menus/${slug}`).expect(404);
    });
  });

  describe('public payload (FR-018, FR-020)', () => {
    it('serves the menu to a guest with no session', async () => {
      const { slug } = await publishedMenu();

      const response = await request(testApp.server).get(`/public/menus/${slug}`).expect(200);

      expect(response.body.menu).toEqual({
        name: 'Polední menu',
        // The restaurant behind the menu, so its logo can be described in
        // words; null because this owner has not uploaded one (feature 006).
        restaurantName: PROFILE.restaurantName,
        visualVariant: 'default',
        logo: null,
        sections: [
          {
            title: 'Polévky',
            items: [
              {
                name: 'Kulajda',
                description: 'S vejcem',
                priceCzk: 89,
                image: null,
                // A dish that declares nothing still says so explicitly: the
                // columns are NOT NULL with empty defaults, so there is one
                // spelling of "nothing declared" rather than two.
                dietary: [],
                allergens: [],
                spiceLevel: 0,
                warnings: [],
                availability: 'available',
              },
            ],
          },
        ],
      });
    });

    it('exposes no ids, account data, or timestamps', async () => {
      const { slug } = await publishedMenu();

      const response = await request(testApp.server).get(`/public/menus/${slug}`).expect(200);

      const serialised = JSON.stringify(response.body);
      expect(serialised).not.toContain('"id"');
      expect(serialised).not.toContain('accountId');
      expect(serialised).not.toContain('updatedAt');
      expect(serialised).not.toContain(owner.email);
    });

    it('reflects a saved edit on the next request (AS4)', async () => {
      const { menuId, sectionId, slug } = await publishedMenu();

      const detail = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);
      const itemId = detail.body.menu.sections[0].items[0].id;

      await request(testApp.server)
        .patch(`/menus/${menuId}/sections/${sectionId}/items/${itemId}`)
        .set('Cookie', owner.cookie)
        .send({ priceCzk: 95 })
        .expect(200);

      const response = await request(testApp.server).get(`/public/menus/${slug}`).expect(200);
      expect(response.body.menu.sections[0].items[0].priceCzk).toBe(95);
    });

    it('keeps sections and items in their editor order', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const first = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      const second = await addSection(testApp, owner.cookie, menuId, 'Hlavní jídla');
      await addItem(testApp, owner.cookie, menuId, first, { name: 'A', priceCzk: 1 });
      await addItem(testApp, owner.cookie, menuId, first, { name: 'B', priceCzk: 2 });
      await addItem(testApp, owner.cookie, menuId, second, { name: 'C', priceCzk: 3 });

      const published = await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      const response = await request(testApp.server)
        .get(`/public/menus/${published.body.publicSlug}`)
        .expect(200);

      expect(response.body.menu.sections.map((s: { title: string }) => s.title)).toEqual([
        'Polévky',
        'Hlavní jídla',
      ]);
      expect(
        response.body.menu.sections[0].items.map((i: { name: string }) => i.name),
      ).toEqual(['A', 'B']);
    });

    it('renders a section that has no items as an empty list', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      await addSection(testApp, owner.cookie, menuId, 'Připravujeme');

      const published = await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      const response = await request(testApp.server)
        .get(`/public/menus/${published.body.publicSlug}`)
        .expect(200);

      expect(response.body.menu.sections).toEqual([{ title: 'Připravujeme', items: [] }]);
    });
  });

  describe('what a hidden dish does to the guest payload', () => {
    /** Publishes one section carrying a dish in each availability state. */
    async function menuOfEveryAvailability() {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
        availability: 'available',
      });
      await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Gulášovka',
        priceCzk: 79,
        availability: 'limited',
      });
      await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Dršťková',
        priceCzk: 69,
        availability: 'soldOut',
      });
      await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Zelňačka',
        priceCzk: 59,
        availability: 'hidden',
      });

      const published = await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      return { menuId, sectionId, slug: published.body.publicSlug as string };
    }

    it('leaves a hidden dish out while sold-out and limited ones stay', async () => {
      const { slug } = await menuOfEveryAvailability();

      const response = await request(testApp.server).get(`/public/menus/${slug}`).expect(200);

      const items = response.body.menu.sections[0].items as {
        name: string;
        availability: string;
      }[];
      // Sold out is information a guest needs — it stops them ordering what is
      // gone. Hidden is the owner saying the dish is not on the menu tonight.
      expect(items.map((item) => item.name)).toEqual(['Kulajda', 'Gulášovka', 'Dršťková']);
      expect(items.map((item) => item.availability)).toEqual([
        'available',
        'limited',
        'soldOut',
      ]);
      expect(JSON.stringify(response.body)).not.toContain('Zelňačka');
    });

    it('keeps the owner seeing every dish, hidden ones included', async () => {
      const { menuId } = await menuOfEveryAvailability();

      const detail = await request(testApp.server)
        .get(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .expect(200);

      // The whole point of hiding rather than deleting: it is still there to
      // put back tomorrow, with its price and its place in the list intact.
      expect(
        detail.body.menu.sections[0].items.map((item: { name: string }) => item.name),
      ).toEqual(['Kulajda', 'Gulášovka', 'Dršťková', 'Zelňačka']);
    });

    it('keeps the heading of a section whose dishes are all hidden', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Zelňačka',
        priceCzk: 59,
        availability: 'hidden',
      });

      const published = await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      const response = await request(testApp.server)
        .get(`/public/menus/${published.body.publicSlug}`)
        .expect(200);

      // Indistinguishable from a section that simply has nothing in it, which
      // is the point: one visible outcome, one payload shape. This is also what
      // proves the filter sits in the join condition — in the WHERE clause it
      // would take the section's heading with it.
      expect(response.body.menu.sections).toEqual([{ title: 'Polévky', items: [] }]);
    });

    it('carries markers, allergens, warnings and heat to the guest', async () => {
      const menuId = await createMenu(testApp, owner.cookie);
      const sectionId = await addSection(testApp, owner.cookie, menuId, 'Polévky');
      await addItem(testApp, owner.cookie, menuId, sectionId, {
        name: 'Kulajda',
        priceCzk: 89,
        dietary: ['vegetarian', 'lenten'],
        allergens: [7, 3],
        spiceLevel: 2,
        warnings: ['rawOrUndercooked'],
      });

      const published = await request(testApp.server)
        .post(`/menus/${menuId}/publish`)
        .set('Cookie', owner.cookie)
        .expect(200);

      const response = await request(testApp.server)
        .get(`/public/menus/${published.body.publicSlug}`)
        .expect(200);

      expect(response.body.menu.sections[0].items[0]).toEqual({
        name: 'Kulajda',
        description: null,
        priceCzk: 89,
        image: null,
        // Catalogue order, not the order they were sent in.
        dietary: ['vegetarian', 'lenten'],
        allergens: [3, 7],
        spiceLevel: 2,
        warnings: ['rawOrUndercooked'],
        availability: 'available',
      });
    });
  });
});
