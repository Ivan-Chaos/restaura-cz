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

export async function signUp(
  testApp: TestApp,
  email = uniqueEmail(),
  password = 'correct horse battery',
): Promise<SignedUpOwner> {
  const response = await request(testApp.server)
    .post('/auth/sign-up')
    .send({ email, password })
    .expect(201);

  return {
    cookie: sessionCookie(response.headers['set-cookie']),
    accountId: response.body.account.id,
    email,
  };
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
