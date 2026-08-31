import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './app.factory.js';
import { sessionCookie, signUp, uniqueEmail } from './helpers.js';

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
        .send({ email, password: 'correct horse battery' })
        .expect(201);

      expect(response.body.account).toMatchObject({ email });
      expect(response.body.account.id).toEqual(expect.any(String));
      expect(response.body.account).not.toHaveProperty('passwordHash');
      expect(sessionCookie(response.headers['set-cookie'])).toContain('restaura_session=');
    });

    it('sets an httpOnly, lax, path-scoped cookie', async () => {
      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email: uniqueEmail(), password: 'correct horse battery' })
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
        .send({ email, password: 'correct horse battery' })
        .expect(201);

      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email: email.toUpperCase(), password: 'another password' })
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
        .send({ email: uniqueEmail(), password: 'correct horse battery', isAdmin: true })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('POST /auth/sign-in', () => {
    it('signs an existing owner back in (AS3)', async () => {
      const email = uniqueEmail();
      const password = 'correct horse battery';
      await request(testApp.server).post('/auth/sign-up').send({ email, password }).expect(201);

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
      await request(testApp.server).post('/auth/sign-up').send({ email, password }).expect(201);

      await request(testApp.server)
        .post('/auth/sign-in')
        .send({ email: email.toUpperCase(), password })
        .expect(200);
    });

    it('answers identically for an unknown email and a wrong password (AS4)', async () => {
      const email = uniqueEmail();
      await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email, password: 'correct horse battery' })
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
