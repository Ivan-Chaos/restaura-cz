import request from 'supertest';
import type { TestApp } from './app.factory.js';

export const SESSION_COOKIE = 'restaura_session';

/** The raw Cookie header value for a session, ready to send back. */
export function sessionCookie(setCookie: string[] | string | undefined): string {
  const headers = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const session = headers.find((header) => header.startsWith(`${SESSION_COOKIE}=`));
  if (!session) throw new Error('Response did not set a session cookie');
  return session.split(';')[0] ?? '';
}

export interface SignedUpOwner {
  cookie: string;
  accountId: string;
  email: string;
}

let uniqueCounter = 0;

export function uniqueEmail(prefix = 'owner'): string {
  uniqueCounter += 1;
  return `${prefix}-${Date.now()}-${uniqueCounter}@example.com`;
}

/** A valid restaurant profile, for tests whose subject is something else. */
export const PROFILE = {
  restaurantName: 'U Zlaté Lípy',
  phones: ['+420 601 234 567'],
  location: 'Náměstí Míru 12, 120 00 Praha 2',
} as const;

/**
 * A fully usable owner: registered *and* email-confirmed.
 *
 * The confirmation is applied straight to the database rather than by reading a
 * code, because for every suite except the confirmation one it is setup, not
 * subject — and menus routes are closed to an unconfirmed account, so without
 * this every owner-flow test would fail on a 403 that has nothing to do with
 * what it is testing.
 */
export async function signUp(
  testApp: TestApp,
  email = uniqueEmail(),
  password = 'correct horse battery',
): Promise<SignedUpOwner> {
  const owner = await signUpUnverified(testApp, email, password);
  await markEmailVerified(owner.accountId);
  return owner;
}

/** Registered but not confirmed — the state every new account starts in. */
export async function signUpUnverified(
  testApp: TestApp,
  email = uniqueEmail(),
  password = 'correct horse battery',
): Promise<SignedUpOwner> {
  const response = await request(testApp.server)
    .post('/auth/sign-up')
    .send({ email, password, ...PROFILE })
    .expect(201);

  return {
    cookie: sessionCookie(response.headers['set-cookie']),
    accountId: response.body.account.id,
    email,
  };
}

async function withDatabase<T>(run: (client: import('pg').Client) => Promise<T>): Promise<T> {
  const { Client } = await import('pg');
  const { testDatabaseUrl } = await import('./database.js');

  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

export async function markEmailVerified(accountId: string): Promise<void> {
  await withDatabase(async (client) => {
    await client.query('update "owner_account" set "email_verified_at" = now() where "id" = $1', [
      accountId,
    ]);
    await client.query('delete from "email_confirmation" where "account_id" = $1', [accountId]);
  });
}

/**
 * Puts an account on a plan.
 *
 * No endpoint does this — billing is a later feature — so a test that needs a
 * paid account reaches for the database, the same way it does for email
 * confirmation. Deliberately takes a `string` so a test can also prove the
 * CHECK constraint refuses a plan outside the catalogue.
 */
export async function setPlan(accountId: string, plan: string): Promise<void> {
  await withDatabase(async (client) => {
    await client.query('update "owner_account" set "plan" = $1 where "id" = $2', [
      plan,
      accountId,
    ]);
  });
}

/**
 * Replaces the outstanding code with one the test knows.
 *
 * The API stores only a hash, so a test cannot read the code that was
 * generated — it writes the hash of a known code instead. Same reasoning as
 * `deleteProfile`: reach for the database only for state the API deliberately
 * will not hand out.
 */
export async function setConfirmationCode(accountId: string, code: string): Promise<void> {
  const { createHash } = await import('node:crypto');
  const codeHash = createHash('sha256').update(`${accountId}.${code}`).digest('hex');

  await withDatabase(async (client) => {
    await client.query(
      `update "email_confirmation"
         set "code_hash" = $1, "expires_at" = now() + interval '15 minutes', "attempts" = 0
       where "account_id" = $2`,
      [codeHash, accountId],
    );
  });
}

/** Ages the outstanding code past its expiry, without waiting fifteen minutes. */
export async function expireConfirmationCode(accountId: string): Promise<void> {
  await withDatabase(async (client) => {
    await client.query(
      `update "email_confirmation" set "expires_at" = now() - interval '1 minute' where "account_id" = $1`,
      [accountId],
    );
  });
}

/** Backdates the code's creation so the resend cooldown has elapsed. */
export async function clearResendCooldown(accountId: string): Promise<void> {
  await withDatabase(async (client) => {
    await client.query(
      `update "email_confirmation" set "created_at" = now() - interval '5 minutes' where "account_id" = $1`,
      [accountId],
    );
  });
}

export async function confirmationAttempts(accountId: string): Promise<number | null> {
  return withDatabase(async (client) => {
    const result = await client.query<{ attempts: number }>(
      'select "attempts" from "email_confirmation" where "account_id" = $1',
      [accountId],
    );
    return result.rows[0]?.attempts ?? null;
  });
}

/**
 * An account with credentials but no restaurant profile — the state every
 * account created before this feature is in. Written straight to the database
 * because the API deliberately offers no way to produce it.
 */
export async function signUpWithoutProfile(
  testApp: TestApp,
  email = uniqueEmail('legacy'),
  password = 'correct horse battery',
): Promise<SignedUpOwner> {
  const owner = await signUp(testApp, email, password);
  await deleteProfile(owner.accountId);
  return owner;
}

async function deleteProfile(accountId: string): Promise<void> {
  await withDatabase(async (client) => {
    await client.query('delete from "restaurant_profile" where "account_id" = $1', [accountId]);
  });
}

/** Creates a menu and returns its id. */
export async function createMenu(
  testApp: TestApp,
  cookie: string,
  name = 'Polední menu',
): Promise<string> {
  const response = await request(testApp.server)
    .post('/menus')
    .set('Cookie', cookie)
    .send({ name })
    .expect(201);
  return response.body.menu.id;
}

export async function addSection(
  testApp: TestApp,
  cookie: string,
  menuId: string,
  title: string,
): Promise<string> {
  const response = await request(testApp.server)
    .post(`/menus/${menuId}/sections`)
    .set('Cookie', cookie)
    .send({ title })
    .expect(201);
  return response.body.section.id;
}

export async function addItem(
  testApp: TestApp,
  cookie: string,
  menuId: string,
  sectionId: string,
  values: {
    name: string;
    description?: string;
    priceCzk: number;
    dietary?: string[];
    allergens?: number[];
    spiceLevel?: number;
    warnings?: string[];
    availability?: string;
  },
): Promise<string> {
  const response = await request(testApp.server)
    .post(`/menus/${menuId}/sections/${sectionId}/items`)
    .set('Cookie', cookie)
    .send(values)
    .expect(201);
  return response.body.item.id;
}

/**
 * Posts a multipart image upload (feature 006).
 *
 * Wraps supertest's `attach`/`field` so a suite reads as "upload this buffer
 * with this framing" rather than as multipart plumbing. The filename is
 * deliberately a parameter with a misleading default available: acceptance is
 * decided by decoding the bytes, and several tests exist to prove the name has
 * no say in it.
 */
export function uploadImage(
  testApp: TestApp,
  cookie: string,
  path: string,
  body: Buffer,
  options: {
    crop?: { x: number; y: number; width: number; height: number };
    filename?: string;
    /** Only the fields listed, to exercise the all-or-none crop rule. */
    partialCrop?: Record<string, string | number>;
  } = {},
) {
  const pending = request(testApp.server)
    .put(path)
    .set('Cookie', cookie)
    .attach('file', body, options.filename ?? 'upload.jpg');

  if (options.crop) {
    pending
      .field('cropX', String(options.crop.x))
      .field('cropY', String(options.crop.y))
      .field('cropWidth', String(options.crop.width))
      .field('cropHeight', String(options.crop.height));
  }

  for (const [name, value] of Object.entries(options.partialCrop ?? {})) {
    pending.field(name, String(value));
  }

  return pending;
}

/** The first field error a response carries, as `field:CODE`. */
export function firstFieldError(body: {
  error?: { details?: { field: string; code: string }[] };
}): string {
  const detail = body.error?.details?.[0];
  return detail ? `${detail.field}:${detail.code}` : 'none';
}
