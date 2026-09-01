import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Client } from "pg";

/**
 * Direct database access, for the one state the product cannot produce.
 *
 * An account with credentials but no restaurant profile is what every account
 * created before this feature looks like, and the gate that handles it (spec
 * FR-005) is worth proving end to end. Registration writes both rows in one
 * transaction and no endpoint deletes a profile, so the only way to arrive at
 * that state is the way it actually arose: in the database.
 *
 * `pg` is a dev dependency here for exactly this reason — the end-to-end suite
 * already requires a real Postgres to be running, and the API's own tests seed
 * the same way.
 */

/**
 * The API owns the connection string, so it is read from the API's own env
 * file rather than duplicated here — a second copy would be one more thing to
 * change when the port moves.
 */
function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Playwright runs from the app root, so the sibling app is one level up.
  for (const name of [".env", ".env.example"]) {
    const path = join(process.cwd(), "..", "api", name);
    let contents: string;
    try {
      contents = readFileSync(path, "utf8");
    } catch {
      continue;
    }

    const match = /^\s*DATABASE_URL\s*=\s*(.+)$/m.exec(contents);
    if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, "");
  }

  throw new Error(
    "No DATABASE_URL found. Set it, or create apps/api/.env from apps/api/.env.example.",
  );
}

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

/** Turns a normally-registered owner into a profile-less, legacy one. */
export async function removeProfile(email: string): Promise<void> {
  const removed = await withClient((client) =>
    client.query(
      `delete from "restaurant_profile"
       where "account_id" = (select "id" from "owner_account" where lower("email") = lower($1))`,
      [email],
    ),
  );

  if (removed.rowCount === 0) {
    throw new Error(`No restaurant profile to remove for ${email}; the seed did not take.`);
  }
}

/**
 * Replaces the outstanding confirmation code with one the test knows.
 *
 * The API stores only a hash — deliberately, so a leaked database hands out no
 * working codes — which means no test can read the code that was generated. It
 * writes the hash of a known code instead. The alternative, a test-only
 * endpoint that reveals codes, would put a hole in production to serve the
 * suite; this keeps the product honest and the test specific.
 */
export async function setConfirmationCode(email: string, code: string): Promise<void> {
  const { createHash } = await import("node:crypto");

  const updated = await withClient(async (client) => {
    const account = await client.query<{ id: string }>(
      'select "id" from "owner_account" where lower("email") = lower($1)',
      [email],
    );
    const accountId = account.rows[0]?.id;
    if (!accountId) throw new Error(`No account for ${email}; the sign-up did not take.`);

    // Keyed with the account id, matching `hashCode` in
    // apps/api/src/auth/email-confirmation.ts.
    const codeHash = createHash("sha256").update(`${accountId}.${code}`).digest("hex");

    return client.query(
      `update "email_confirmation"
         set "code_hash" = $1,
             "expires_at" = now() + interval '15 minutes',
             "attempts" = 0,
             "created_at" = now() - interval '5 minutes'
       where "account_id" = $2`,
      [codeHash, accountId],
    );
  });

  if (updated.rowCount === 0) {
    throw new Error(`No confirmation code outstanding for ${email}; sign-up should issue one.`);
  }
}
