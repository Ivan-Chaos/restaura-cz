import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './app.factory.js';
import { PROFILE, signUp, signUpWithoutProfile } from './helpers.js';

/**
 * The restaurant profile: how an incomplete account is reported, and the one
 * endpoint that writes a profile — used by both the completion step and the
 * settings form, which is why it is an upsert rather than a create and an
 * update that could disagree.
 */
describe('restaurant profile (002/US1, US4)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  beforeEach(async () => {
    await testApp.reset();
  });

  afterAll(async () => {
    await testApp.close();
  });

  describe('GET /auth/me', () => {
    it('reports a complete account with its profile', async () => {
      const owner = await signUp(testApp);

      const response = await request(testApp.server)
        .get('/auth/me')
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.profile).toEqual(PROFILE);
    });

    it('reports a profile-less account with a null profile, not an error (FR-005)', async () => {
      const owner = await signUpWithoutProfile(testApp);

      const response = await request(testApp.server)
        .get('/auth/me')
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.account.email).toBe(owner.email);
      expect(response.body.profile).toBeNull();
    });
  });

  describe('PUT /auth/profile', () => {
    it('refuses an unauthenticated write', async () => {
      const response = await request(testApp.server)
        .put('/auth/profile')
        .send(PROFILE)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('inserts the profile for an account that has none (completion step)', async () => {
      const owner = await signUpWithoutProfile(testApp);

      const response = await request(testApp.server)
        .put('/auth/profile')
        .set('Cookie', owner.cookie)
        .send({
          restaurantName: 'Nová Restaurace',
          phones: ['601 234 567'],
          location: 'Brno',
        })
        .expect(200);

      expect(response.body.profile).toEqual({
        restaurantName: 'Nová Restaurace',
        phones: ['601 234 567'],
        location: 'Brno',
      });

      const me = await request(testApp.server)
        .get('/auth/me')
        .set('Cookie', owner.cookie)
        .expect(200);
      expect(me.body.profile.restaurantName).toBe('Nová Restaurace');
    });

    it('replaces the profile of an account that has one (settings form)', async () => {
      const owner = await signUp(testApp);

      await request(testApp.server)
        .put('/auth/profile')
        .set('Cookie', owner.cookie)
        .send({
          restaurantName: 'Přejmenovaná Restaurace',
          phones: ['601 111 222', '601 333 444'],
          location: 'Ostrava',
        })
        .expect(200);

      const me = await request(testApp.server)
        .get('/auth/me')
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(me.body.profile).toEqual({
        restaurantName: 'Přejmenovaná Restaurace',
        phones: ['601 111 222', '601 333 444'],
        location: 'Ostrava',
      });
    });

    it('is a whole-profile write: a dropped phone number really is dropped', async () => {
      const owner = await signUp(testApp);

      await request(testApp.server)
        .put('/auth/profile')
        .set('Cookie', owner.cookie)
        .send({ ...PROFILE, phones: ['601 111 222', '601 333 444'] })
        .expect(200);

      const response = await request(testApp.server)
        .put('/auth/profile')
        .set('Cookie', owner.cookie)
        .send({ ...PROFILE, phones: ['601 111 222'] })
        .expect(200);

      expect(response.body.profile.phones).toEqual(['601 111 222']);
    });

    it('is idempotent: writing the same profile twice changes nothing', async () => {
      const owner = await signUp(testApp);

      const first = await request(testApp.server)
        .put('/auth/profile')
        .set('Cookie', owner.cookie)
        .send(PROFILE)
        .expect(200);

      const second = await request(testApp.server)
        .put('/auth/profile')
        .set('Cookie', owner.cookie)
        .send(PROFILE)
        .expect(200);

      expect(second.body).toEqual(first.body);
    });

    it.each([
      ['an empty restaurant name', { restaurantName: '  ' }, 'restaurantName'],
      ['no phone numbers (FR-020)', { phones: [] }, 'phones'],
      ['a fourth phone number', { phones: ['601111222', '601333444', '601555666', '601777888'] }, 'phones'],
      ['an unreadable phone number', { phones: ['call me'] }, 'phones'],
      ['an empty location', { location: '' }, 'location'],
    ])('rejects %s without touching what is stored', async (_label, override, expectedField) => {
      const owner = await signUp(testApp);

      const response = await request(testApp.server)
        .put('/auth/profile')
        .set('Cookie', owner.cookie)
        .send({ ...PROFILE, ...override })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain(expectedField);

      // FR-020: a rejected edit must never overwrite the stored profile.
      const me = await request(testApp.server)
        .get('/auth/me')
        .set('Cookie', owner.cookie)
        .expect(200);
      expect(me.body.profile).toEqual(PROFILE);
    });

    it('rejects a partial write: the whole profile is the unit', async () => {
      const owner = await signUp(testApp);

      await request(testApp.server)
        .put('/auth/profile')
        .set('Cookie', owner.cookie)
        .send({ restaurantName: 'Only The Name' })
        .expect(400);
    });

    it('writes one owner’s profile without touching another’s', async () => {
      const first = await signUp(testApp);
      const second = await signUp(testApp);

      await request(testApp.server)
        .put('/auth/profile')
        .set('Cookie', second.cookie)
        .send({ ...PROFILE, restaurantName: 'Second Owner Bistro' })
        .expect(200);

      const me = await request(testApp.server)
        .get('/auth/me')
        .set('Cookie', first.cookie)
        .expect(200);

      expect(me.body.profile.restaurantName).toBe(PROFILE.restaurantName);
    });
  });
});
