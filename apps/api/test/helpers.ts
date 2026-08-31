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

export async function signUp(
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
  const { Client } = await import('pg');
  const { testDatabaseUrl } = await import('./database.js');

  const client = new Client({ connectionString: testDatabaseUrl() });
  await client.connect();
  try {
    await client.query('delete from "restaurant_profile" where "account_id" = $1', [accountId]);
  } finally {
    await client.end();
  }
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
  values: { name: string; description?: string; priceCzk: number },
): Promise<string> {
  const response = await request(testApp.server)
    .post(`/menus/${menuId}/sections/${sectionId}/items`)
    .set('Cookie', cookie)
    .send(values)
    .expect(201);
  return response.body.item.id;
}
