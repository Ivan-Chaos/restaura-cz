import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './app.factory.js';
import { PROFILE, sessionCookie, signUp, uniqueEmail } from './helpers.js';

describe('auth (US1)', () => {
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

  describe('POST /auth/sign-up', () => {
    it('creates the account and signs it in (AS1)', async () => {
      const email = uniqueEmail();

      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email, password: 'correct horse battery', ...PROFILE })
        .expect(201);

      expect(response.body.account).toMatchObject({ email });
      expect(response.body.account.id).toEqual(expect.any(String));
      expect(response.body.account).not.toHaveProperty('passwordHash');
      expect(sessionCookie(response.headers['set-cookie'])).toContain('restaura_session=');
    });

    it('stores the restaurant profile alongside the account (002/US1 AS1)', async () => {
      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({
          email: uniqueEmail(),
          password: 'correct horse battery',
          restaurantName: 'U Zlaté Lípy',
          phones: ['+420 601 234 567', '222 333 444'],
          location: 'Náměstí Míru 12, 120 00 Praha 2',
        })
        .expect(201);

      expect(response.body.profile).toEqual({
        restaurantName: 'U Zlaté Lípy',
        // The owner's order and their own formatting both survive.
        phones: ['+420 601 234 567', '222 333 444'],
        location: 'Náměstí Míru 12, 120 00 Praha 2',
      });
    });

    it('trims the text fields rather than storing the owner’s stray spaces', async () => {
      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({
          email: uniqueEmail(),
          password: 'correct horse battery',
          restaurantName: '  U Zlaté Lípy  ',
          phones: ['  +420 601 234 567  '],
          location: '  Praha 2  ',
        })
        .expect(201);

      expect(response.body.profile.restaurantName).toBe('U Zlaté Lípy');
      expect(response.body.profile.phones).toEqual(['+420 601 234 567']);
      expect(response.body.profile.location).toBe('Praha 2');
    });

    it('rejects the pre-feature body that carried no profile', async () => {
      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email: uniqueEmail(), password: 'correct horse battery' })
        .expect(400);

      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain('restaurantName');
      expect(fields).toContain('phones');
      expect(fields).toContain('location');
    });

    it.each([
      ['an empty restaurant name', { restaurantName: '   ' }, 'restaurantName'],
      ['a restaurant name over 120 characters', { restaurantName: 'x'.repeat(121) }, 'restaurantName'],
      ['no phone numbers at all', { phones: [] }, 'phones'],
      ['a fourth phone number', { phones: ['601111222', '601333444', '601555666', '601777888'] }, 'phones'],
      ['an empty location', { location: '  ' }, 'location'],
      ['a location over 200 characters', { location: 'x'.repeat(201) }, 'location'],
    ])('rejects %s', async (_label, override, expectedField) => {
      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({
          email: uniqueEmail(),
          password: 'correct horse battery',
          ...PROFILE,
          ...override,
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain(expectedField);
    });

    it('rejects the whole list when one entry is not a phone number', async () => {
      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({
          email: uniqueEmail(),
          password: 'correct horse battery',
          ...PROFILE,
          phones: ['+420 601 234 567', 'call me'],
        })
        .expect(400);

      // The list is the unit the API validates; which entry is at fault is
      // something the form works out for itself with the same rule, so it can
      // mark the offending input rather than the whole group.
      expect(response.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'phones', code: 'IS_PHONE' }),
      );
    });

    it('reports too few and too many phones with distinguishable codes', async () => {
      const tooFew = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email: uniqueEmail(), password: 'correct horse battery', ...PROFILE, phones: [] })
        .expect(400);

      const tooMany = await request(testApp.server)
        .post('/auth/sign-up')
        .send({
          email: uniqueEmail(),
          password: 'correct horse battery',
          ...PROFILE,
          phones: ['601111222', '601333444', '601555666', '601777888'],
        })
        .expect(400);

      expect(tooFew.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'phones', code: 'ARRAY_MIN_SIZE' }),
      );
      expect(tooMany.body.error.details).toContainEqual(
        expect.objectContaining({ field: 'phones', code: 'ARRAY_MAX_SIZE' }),
      );
    });

    it('rejects a confirmPassword field: confirming is the form’s job, not ours', async () => {
      await request(testApp.server)
        .post('/auth/sign-up')
        .send({
          email: uniqueEmail(),
          password: 'correct horse battery',
          confirmPassword: 'correct horse battery',
          ...PROFILE,
        })
        .expect(400);
    });

    it('leaves no profile behind when the email turns out to be taken', async () => {
      const email = uniqueEmail();
      await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email, password: 'correct horse battery', ...PROFILE })
        .expect(201);

      await request(testApp.server)
        .post('/auth/sign-up')
        .send({
          email,
          password: 'another password',
          ...PROFILE,
          restaurantName: 'Second Attempt Bistro',
        })
        .expect(409);

      // The rejected attempt must not have written its profile: sign in as the
      // original owner and confirm the first profile is what is stored.
      const signedIn = await request(testApp.server)
        .post('/auth/sign-in')
        .send({ email, password: 'correct horse battery' })
        .expect(200);

      const me = await request(testApp.server)
        .get('/auth/me')
        .set('Cookie', sessionCookie(signedIn.headers['set-cookie']))
        .expect(200);

      expect(me.body.profile.restaurantName).toBe(PROFILE.restaurantName);
    });

    it('sets an httpOnly, lax, path-scoped cookie', async () => {
      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email: uniqueEmail(), password: 'correct horse battery', ...PROFILE })
        .expect(201);

      const header = (response.headers['set-cookie'] as unknown as string[]).find((value) =>
        value.startsWith('restaura_session='),
      );
      expect(header).toContain('HttpOnly');
      expect(header).toContain('SameSite=Lax');
      expect(header).toContain('Path=/');
    });

    it('rejects an email already in use, case-insensitively (AS2)', async () => {
      const email = uniqueEmail();
      await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email, password: 'correct horse battery', ...PROFILE })
        .expect(201);

      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email: email.toUpperCase(), password: 'another password', ...PROFILE })
        .expect(409);

      expect(response.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('rejects a malformed email and a short password with field details', async () => {
      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email: 'not-an-email', password: 'short' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      const fields = response.body.error.details.map((detail: { field: string }) => detail.field);
      expect(fields).toContain('email');
      expect(fields).toContain('password');
      expect(response.body.error.details[0]).toHaveProperty('code');
      expect(response.body.error.details[0]).toHaveProperty('message');
    });

    it('rejects unknown properties rather than silently ignoring them', async () => {
      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email: uniqueEmail(), password: 'correct horse battery', ...PROFILE, isAdmin: true })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('POST /auth/sign-in', () => {
    it('signs an existing owner back in (AS3)', async () => {
      const email = uniqueEmail();
      const password = 'correct horse battery';
      await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email, password, ...PROFILE })
        .expect(201);

      const response = await request(testApp.server)
        .post('/auth/sign-in')
        .send({ email, password })
        .expect(200);

      expect(response.body.account.email).toBe(email);
      expect(sessionCookie(response.headers['set-cookie'])).toContain('restaura_session=');
    });

    it('accepts a different casing of the same email', async () => {
      const email = uniqueEmail();
      const password = 'correct horse battery';
      await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email, password, ...PROFILE })
        .expect(201);

      await request(testApp.server)
        .post('/auth/sign-in')
        .send({ email: email.toUpperCase(), password })
        .expect(200);
    });

    it('answers identically for an unknown email and a wrong password (AS4)', async () => {
      const email = uniqueEmail();
      await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email, password: 'correct horse battery', ...PROFILE })
        .expect(201);

      const wrongPassword = await request(testApp.server)
        .post('/auth/sign-in')
        .send({ email, password: 'wrong password entirely' })
        .expect(401);

      const unknownEmail = await request(testApp.server)
        .post('/auth/sign-in')
        .send({ email: uniqueEmail(), password: 'wrong password entirely' })
        .expect(401);

      // Identical body: the response must not reveal whether the email exists.
      expect(wrongPassword.body).toEqual(unknownEmail.body);
      expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('treats a too-short password as wrong credentials, not a validation error', async () => {
      const response = await request(testApp.server)
        .post('/auth/sign-in')
        .send({ email: uniqueEmail(), password: 'tiny' })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /auth/me', () => {
    it('returns the signed-in account', async () => {
      const owner = await signUp(testApp);

      const response = await request(testApp.server)
        .get('/auth/me')
        .set('Cookie', owner.cookie)
        .expect(200);

      expect(response.body.account).toEqual({ id: owner.accountId, email: owner.email });
      expect(response.body.profile).toEqual(PROFILE);
    });

    it('rejects a request with no session', async () => {
      const response = await request(testApp.server).get('/auth/me').expect(401);
      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });

    it('rejects a fabricated session token', async () => {
      const response = await request(testApp.server)
        .get('/auth/me')
        .set('Cookie', 'restaura_session=not-a-real-token')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHENTICATED');
    });
  });

  describe('POST /auth/sign-out', () => {
    it('invalidates the session (AS5)', async () => {
      const owner = await signUp(testApp);

      await request(testApp.server).post('/auth/sign-out').set('Cookie', owner.cookie).expect(204);

      await request(testApp.server).get('/auth/me').set('Cookie', owner.cookie).expect(401);
    });

    it('is idempotent for an already-invalid session', async () => {
      await request(testApp.server)
        .post('/auth/sign-out')
        .set('Cookie', 'restaura_session=already-gone')
        .expect(204);

      await request(testApp.server).post('/auth/sign-out').expect(204);
    });
  });

  it('uses the documented error shape on every failure', async () => {
    const response = await request(testApp.server).get('/auth/me').expect(401);

    expect(Object.keys(response.body)).toEqual(['error']);
    expect(response.body.error).toMatchObject({
      code: expect.any(String),
      message: expect.any(String),
    });
  });
});
