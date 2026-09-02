import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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

  describe('visual variant (FR-010)', () => {
    it('accepts the default variant', async () => {
      const menuId = await createMenu(testApp, owner.cookie);

      const response = await request(testApp.server)
        .patch(`/menus/${menuId}`)
        .set('Cookie', owner.cookie)
        .send({ visualVariant: 'default' })
        .expect(200);

      expect(response.body.menu.visualVariant).toBe('default');
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
