import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { hash as argonHash, verify as argonVerify, type Algorithm } from '@node-rs/argon2';
import { and, eq, gt, sql } from 'drizzle-orm';
import { AppError } from '../common/app-error.js';
import { isUniqueViolation } from '../common/pg-errors.js';
import { DRIZZLE, type DrizzleDb } from '../db/client.js';
import { ownerAccount, restaurantProfile, session } from '../db/schema.js';
import { SESSION_TTL_MS } from './session-cookie.js';

export interface PublicAccount {
  id: string;
  email: string;
}

/** The profile as callers see it: no ids, no timestamps. */
export interface PublicProfile {
  restaurantName: string;
  phones: string[];
  location: string;
}

export interface IssuedSession {
  account: PublicAccount;
  /** Always present for sign-up; null for an account created before profiles. */
  profile: PublicProfile | null;
  /** The raw token. Stored only in the caller's cookie — never in the database. */
  token: string;
  expiresAt: Date;
}

/**
 * `Algorithm.Argon2id`, stated explicitly rather than left to the library
 * default. The package declares `Algorithm` as an ambient const enum, which
 * `isolatedModules` forbids importing as a value, so the member's numeric value
 * is inlined here.
 */
const ARGON2ID = 2 as Algorithm;

const ARGON_OPTIONS = { algorithm: ARGON2ID } as const;

@Injectable()
export class AuthService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * A hash of a value nobody can sign in with. Verifying against it when the
   * email is unknown keeps sign-in's timing the same either way, so the
   * response cannot be used to discover which emails have accounts.
   */
  private decoyHash: Promise<string> | undefined;

  private getDecoyHash(): Promise<string> {
    this.decoyHash ??= argonHash(randomBytes(32).toString('hex'), ARGON_OPTIONS);
    return this.decoyHash;
  }

  /**
   * Creates the account and its profile as one unit. A rejected email must
   * leave nothing behind, and an account must never reach the dashboard
   * half-registered, so both inserts share a transaction: either the owner has
   * a complete account or they have none.
   */
  async signUp(
    email: string,
    password: string,
    profile: PublicProfile,
  ): Promise<IssuedSession> {
    const passwordHash = await argonHash(password, ARGON_OPTIONS);

    let account: PublicAccount;
    try {
      account = await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(ownerAccount)
          .values({ email, passwordHash })
          .returning({ id: ownerAccount.id, email: ownerAccount.email });
        // The insert either returns a row or throws; this satisfies the type.
        if (!row) throw AppError.emailTaken();

        await tx.insert(restaurantProfile).values({ accountId: row.id, ...profile });
        return row;
      });
    } catch (error) {
      // The unique index on lower(email) is what actually enforces one account
      // per address, including against two simultaneous sign-ups.
      if (isUniqueViolation(error)) throw AppError.emailTaken();
      throw error;
    }

    return this.issueSession(account, profile);
  }

  /** Null for an account created before profiles existed. */
  async getProfile(accountId: string): Promise<PublicProfile | null> {
    const [row] = await this.db
      .select({
        restaurantName: restaurantProfile.restaurantName,
        phones: restaurantProfile.phones,
        location: restaurantProfile.location,
      })
      .from(restaurantProfile)
      .where(eq(restaurantProfile.accountId, accountId))
      .limit(1);

    return row ?? null;
  }

  /**
   * One statement for both the completion step and the settings form. Which of
   * the two happened is not something the caller has to care about, and making
   * it one write means there is no window where a profile is half-replaced.
   */
  async upsertProfile(accountId: string, profile: PublicProfile): Promise<PublicProfile> {
    const [row] = await this.db
      .insert(restaurantProfile)
      .values({ accountId, ...profile })
      .onConflictDoUpdate({
        target: restaurantProfile.accountId,
        set: { ...profile, updatedAt: new Date() },
      })
      .returning({
        restaurantName: restaurantProfile.restaurantName,
        phones: restaurantProfile.phones,
        location: restaurantProfile.location,
      });

    // The upsert always returns the stored row; this satisfies the type.
    if (!row) throw AppError.notFound();
    return row;
  }

  async signIn(email: string, password: string): Promise<IssuedSession> {
    const [account] = await this.db
      .select({
        id: ownerAccount.id,
        email: ownerAccount.email,
        passwordHash: ownerAccount.passwordHash,
      })
      .from(ownerAccount)
      .where(sql`lower(${ownerAccount.email}) = lower(${email})`)
      .limit(1);

    if (!account) {
      await argonVerify(await this.getDecoyHash(), password);
      throw AppError.invalidCredentials();
    }

    const passwordMatches = await argonVerify(account.passwordHash, password);
    if (!passwordMatches) throw AppError.invalidCredentials();

    // Read alongside the session so the caller can route a profile-less owner
    // to the completion step directly, rather than bouncing off the dashboard.
    const profile = await this.getProfile(account.id);
    return this.issueSession({ id: account.id, email: account.email }, profile);
  }

  /** Idempotent: signing out with a token that is already gone is still success. */
  async signOut(token: string | undefined): Promise<void> {
    if (token === undefined) return;
    await this.db.delete(session).where(eq(session.tokenHash, hashToken(token)));
  }

  /** Returns null for a missing, unknown, or expired token. */
  async resolveSession(token: string | undefined): Promise<PublicAccount | null> {
    if (token === undefined || token === '') return null;

    const [row] = await this.db
      .select({ id: ownerAccount.id, email: ownerAccount.email })
      .from(session)
      .innerJoin(ownerAccount, eq(session.accountId, ownerAccount.id))
      .where(and(eq(session.tokenHash, hashToken(token)), gt(session.expiresAt, new Date())))
      .limit(1);

    return row ?? null;
  }

  private async issueSession(
    account: PublicAccount,
    profile: PublicProfile | null,
  ): Promise<IssuedSession> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await this.db.insert(session).values({
      accountId: account.id,
      tokenHash: hashToken(token),
      expiresAt,
    });

    return { account, profile, token, expiresAt };
  }
}

/**
 * Only the hash is stored, so a leaked database still cannot be used to
 * impersonate anyone.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
