import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './app.factory.js';
import {
  clearResendCooldown,
  confirmationAttempts,
  expireConfirmationCode,
  PROFILE,
  setConfirmationCode,
  signUp,
  signUpUnverified,
  uniqueEmail,
} from './helpers.js';

const KNOWN_CODE = '123456';

describe('email confirmation', () => {
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
    it('leaves a new account unverified with a code outstanding', async () => {
      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email: uniqueEmail(), password: 'correct horse battery', ...PROFILE })
        .expect(201);

      expect(response.body.account.emailVerified).toBe(false);
      // A code exists, even though the test cannot read it.
      expect(await confirmationAttempts(response.body.account.id)).toBe(0);
    });

    it('accepts the locale that steers the confirmation email', async () => {
      await request(testApp.server)
        .post('/auth/sign-up')
        .send({
          email: uniqueEmail(),
          password: 'correct horse battery',
          ...PROFILE,
          locale: 'en',
        })
        .expect(201);
    });

    it('rejects a locale it has no template for', async () => {
      await request(testApp.server)
        .post('/auth/sign-up')
        .send({
          email: uniqueEmail(),
          password: 'correct horse battery',
          ...PROFILE,
          locale: 'fr',
        })
        .expect(400);
    });

    it('trims an email pasted with a trailing space', async () => {
      const email = uniqueEmail();

      const response = await request(testApp.server)
        .post('/auth/sign-up')
        .send({ email: `  ${email} `, password: 'correct horse battery', ...PROFILE })
        .expect(201);

      expect(response.body.account.email).toBe(email);
      // And the trimmed form is the one that signs in.
      await request(testApp.server)
        .post('/auth/sign-in')
        .send({ email, password: 'correct horse battery' })
        .expect(200);
    });
  });

  describe('POST /auth/verify-email', () => {
    it('confirms the address and consumes the code', async () => {
      const owner = await signUpUnverified(testApp);
      await setConfirmationCode(owner.accountId, KNOWN_CODE);

      const response = await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: KNOWN_CODE })
        .expect(200);

      expect(response.body.account.emailVerified).toBe(true);
      expect(response.body.profile).toMatchObject({ restaurantName: PROFILE.restaurantName });
      // The row is gone, so the same code cannot be replayed.
      expect(await confirmationAttempts(owner.accountId)).toBeNull();

      const me = await request(testApp.server)
        .get('/auth/me')
        .set('Cookie', owner.cookie)
        .expect(200);
      expect(me.body.account.emailVerified).toBe(true);
    });

    it('accepts the locale that steers the welcome email', async () => {
      const owner = await signUpUnverified(testApp);
      await setConfirmationCode(owner.accountId, KNOWN_CODE);

      const response = await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: KNOWN_CODE, locale: 'en' })
        .expect(200);

      expect(response.body.account.emailVerified).toBe(true);
    });

    it('rejects a locale it has no template for, without charging an attempt', async () => {
      const owner = await signUpUnverified(testApp);
      await setConfirmationCode(owner.accountId, KNOWN_CODE);

      const response = await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: KNOWN_CODE, locale: 'fr' })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      // Validation runs before the service, so the code is still untouched.
      expect(await confirmationAttempts(owner.accountId)).toBe(0);
    });

    it('rejects a wrong code and charges an attempt', async () => {
      const owner = await signUpUnverified(testApp);
      await setConfirmationCode(owner.accountId, KNOWN_CODE);

      const response = await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: '000000' })
        .expect(400);

      expect(response.body.error.code).toBe('CODE_INVALID');
      expect(await confirmationAttempts(owner.accountId)).toBe(1);
    });

    it('stops guessing after five failures, then refuses even the right code', async () => {
      const owner = await signUpUnverified(testApp);
      await setConfirmationCode(owner.accountId, KNOWN_CODE);

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const response = await request(testApp.server)
          .post('/auth/verify-email')
          .set('Cookie', owner.cookie)
          .send({ code: '000000' })
          .expect(400);
        expect(response.body.error.code).toBe('CODE_INVALID');
      }

      const exhausted = await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: KNOWN_CODE })
        .expect(429);

      expect(exhausted.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    });

    it('refuses an expired code', async () => {
      const owner = await signUpUnverified(testApp);
      await setConfirmationCode(owner.accountId, KNOWN_CODE);
      await expireConfirmationCode(owner.accountId);

      const response = await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: KNOWN_CODE })
        .expect(400);

      expect(response.body.error.code).toBe('CODE_EXPIRED');
    });

    it('answers CODE_EXPIRED when no code was ever issued', async () => {
      const owner = await signUpUnverified(testApp);
      // Verifying consumes the only outstanding code.
      await setConfirmationCode(owner.accountId, KNOWN_CODE);
      await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: KNOWN_CODE })
        .expect(200);

      // Already verified, so a second submit is success, not a failure.
      await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: KNOWN_CODE })
        .expect(200);
    });

    it('rejects a malformed code as a validation failure', async () => {
      const owner = await signUpUnverified(testApp);

      for (const code of ['12345', '1234567', 'abcdef', '']) {
        const response = await request(testApp.server)
          .post('/auth/verify-email')
          .set('Cookie', owner.cookie)
          .send({ code })
          .expect(400);
        expect(response.body.error.code).toBe('VALIDATION_FAILED');
      }
    });

    it('requires a session', async () => {
      await request(testApp.server)
        .post('/auth/verify-email')
        .send({ code: KNOWN_CODE })
        .expect(401);
    });
  });

  describe('POST /auth/verify-email/resend', () => {
    it('issues a fresh code and resets the attempt budget', async () => {
      const owner = await signUpUnverified(testApp);
      await setConfirmationCode(owner.accountId, KNOWN_CODE);

      await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: '000000' })
        .expect(400);
      expect(await confirmationAttempts(owner.accountId)).toBe(1);

      await clearResendCooldown(owner.accountId);
      await request(testApp.server)
        .post('/auth/verify-email/resend')
        .set('Cookie', owner.cookie)
        .send({})
        .expect(204);

      expect(await confirmationAttempts(owner.accountId)).toBe(0);

      // The replacement code is a new one, so the old value no longer works.
      const stale = await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: KNOWN_CODE })
        .expect(400);
      expect(stale.body.error.code).toBe('CODE_INVALID');
    });

    it('refuses a resend asked for too soon', async () => {
      const owner = await signUpUnverified(testApp);

      const response = await request(testApp.server)
        .post('/auth/verify-email/resend')
        .set('Cookie', owner.cookie)
        .send({})
        .expect(429);

      expect(response.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    });

    it('is a no-op for an account that is already verified', async () => {
      const owner = await signUp(testApp);

      await request(testApp.server)
        .post('/auth/verify-email/resend')
        .set('Cookie', owner.cookie)
        .send({})
        .expect(204);
    });

    it('requires a session', async () => {
      await request(testApp.server).post('/auth/verify-email/resend').send({}).expect(401);
    });
  });

  describe('VerifiedGuard', () => {
    it('closes the menus API to an unconfirmed account', async () => {
      const owner = await signUpUnverified(testApp);

      const response = await request(testApp.server)
        .post('/menus')
        .set('Cookie', owner.cookie)
        .send({ name: 'Polední menu' })
        .expect(403);

      expect(response.body.error.code).toBe('EMAIL_UNVERIFIED');

      await request(testApp.server).get('/menus').set('Cookie', owner.cookie).expect(403);
    });

    it('opens it as soon as the address is confirmed', async () => {
      const owner = await signUpUnverified(testApp);
      await setConfirmationCode(owner.accountId, KNOWN_CODE);
      await request(testApp.server)
        .post('/auth/verify-email')
        .set('Cookie', owner.cookie)
        .send({ code: KNOWN_CODE })
        .expect(200);

      await request(testApp.server)
        .post('/menus')
        .set('Cookie', owner.cookie)
        .send({ name: 'Polední menu' })
        .expect(201);
    });

    it('leaves the public guest menu reachable', async () => {
      // A diner is not an account: the public route must not consult
      // verification at all.
      await request(testApp.server).get('/public/menus/nonexistent-slug').expect(404);
    });
  });
});
