import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { hash as argonHash, verify as argonVerify, type Algorithm } from '@node-rs/argon2';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { AppError } from '../common/app-error.js';
import { isUniqueViolation } from '../common/pg-errors.js';
import { DRIZZLE, type DrizzleDb } from '../db/client.js';
import { emailConfirmation, ownerAccount, restaurantProfile, session } from '../db/schema.js';
import { toImageRef, type ImageRef } from '../images/image-ref.js';
import { newLogoKey } from '../images/keys.js';
import { processImage, type CropRect } from '../images/image-processor.js';
import { IMAGE_STORAGE, type ImageStorage } from '../images/storage/image-storage.js';
import { type EmailLocale } from '../mail/email-locale.js';
import { MailService } from '../mail/mail.service.js';
import {
  CODE_TTL_MS,
  codeMatches,
  generateCode,
  hashCode,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
} from './email-confirmation.js';
import { SESSION_TTL_MS } from './session-cookie.js';

export interface PublicAccount {
  id: string;
  email: string;
  /**
   * Whether the owner has proved they can read their address. The frontend
   * gates on this, and so does VerifiedGuard. A boolean rather than the stored
   * timestamp because no caller renders the date.
   */
  emailVerified: boolean;
}

/**
 * The fields a caller may *write*.
 *
 * Separate from what a caller *reads* because the logo is not among them: it
 * has its own endpoints, so saving the restaurant's details can never disturb
 * it, and no body needs to carry an image URL back to us.
 */
export interface ProfileInput {
  restaurantName: string;
  phones: string[];
  location: string;
}

/** The profile as callers see it: no ids, no timestamps, no storage keys. */
export interface PublicProfile extends ProfileInput {
  /** Null is the normal state: a restaurant without one is shown by name. */
  logo: ImageRef | null;
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(IMAGE_STORAGE) private readonly storage: ImageStorage,
    private readonly mail: MailService,
  ) {}

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
    profile: ProfileInput,
    locale: EmailLocale = 'cs',
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
        return { ...row, emailVerified: false };
      });
    } catch (error) {
      // The unique index on lower(email) is what actually enforces one account
      // per address, including against two simultaneous sign-ups.
      if (isUniqueViolation(error)) throw AppError.emailTaken();
      throw error;
    }

    // Deliberately after the transaction and deliberately not awaited into the
    // caller's failure path: a Resend outage must not undo a valid
    // registration. The owner is signed in either way and can ask for a new
    // code from the confirmation screen, which is a far better outcome than an
    // account that silently failed to exist.
    await this.issueConfirmation(account, locale).catch((error: unknown) => {
      this.logger.error(
        `Sign-up succeeded but the confirmation email failed for ${account.id}: ${String(error)}`,
      );
    });

    // A brand-new account has no logo, and saying so explicitly is cheaper and
    // more honest than reading back the row we just wrote.
    return this.issueSession(account, { ...profile, logo: null });
  }

  /**
   * Replaces any outstanding code with a fresh one and sends it.
   *
   * An upsert rather than delete-then-insert: one statement means there is no
   * instant where an owner who just asked for a code has none.
   */
  private async issueConfirmation(
    account: PublicAccount,
    locale: EmailLocale,
  ): Promise<void> {
    const code = generateCode();

    await this.db
      .insert(emailConfirmation)
      .values({
        accountId: account.id,
        codeHash: hashCode(account.id, code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      })
      .onConflictDoUpdate({
        target: emailConfirmation.accountId,
        set: {
          codeHash: hashCode(account.id, code),
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
          // Reset, or a new code would inherit the old one's exhausted budget.
          attempts: 0,
          createdAt: new Date(),
        },
      });

    await this.mail.sendConfirmationCode(account.email, code, locale);
  }

  /**
   * Confirms an address against the code sent to it.
   *
   * Idempotent for an already-verified account: an owner who submits the form
   * twice, or returns to a stale tab, has done nothing wrong and gets success.
   */
  async verifyEmail(
    accountId: string,
    code: string,
    locale: EmailLocale = 'cs',
  ): Promise<void> {
    const [account] = await this.db
      .select({ email: ownerAccount.email, emailVerifiedAt: ownerAccount.emailVerifiedAt })
      .from(ownerAccount)
      .where(eq(ownerAccount.id, accountId))
      .limit(1);

    if (!account) throw AppError.unauthenticated();
    if (account.emailVerifiedAt) return;

    // Charging the attempt in the WHERE clause is what makes the cap hold under
    // concurrent guesses: two simultaneous requests cannot both read "4 used"
    // and both proceed, because only one UPDATE can move the counter.
    const [charged] = await this.db
      .update(emailConfirmation)
      .set({ attempts: sql`${emailConfirmation.attempts} + 1` })
      .where(
        and(
          eq(emailConfirmation.accountId, accountId),
          lt(emailConfirmation.attempts, MAX_ATTEMPTS),
        ),
      )
      .returning({
        codeHash: emailConfirmation.codeHash,
        expiresAt: emailConfirmation.expiresAt,
      });

    if (!charged) {
      // Either no code was ever issued, or the budget is spent. Distinguished
      // by whether a row exists at all, because the advice differs: ask for a
      // code versus wait and ask for a code.
      const [existing] = await this.db
        .select({ accountId: emailConfirmation.accountId })
        .from(emailConfirmation)
        .where(eq(emailConfirmation.accountId, accountId))
        .limit(1);

      throw existing ? AppError.tooManyAttempts() : AppError.codeExpired();
    }

    // Expiry is checked after charging an attempt so that an expired code
    // cannot be used as a free oracle for unlimited guessing.
    if (charged.expiresAt.getTime() <= Date.now()) throw AppError.codeExpired();

    if (!codeMatches(charged.codeHash, hashCode(accountId, code))) {
      throw AppError.codeInvalid();
    }

    // Marking verified and consuming the code are one unit: a code that
    // survived a half-failed commit would still be usable.
    await this.db.transaction(async (tx) => {
      await tx
        .update(ownerAccount)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(ownerAccount.id, accountId));
      await tx.delete(emailConfirmation).where(eq(emailConfirmation.accountId, accountId));
    });

    // Deliberately after the transaction and deliberately not in the caller's
    // failure path: the address is confirmed whether or not the welcome
    // arrives, and a Resend outage must not turn a successful confirmation
    // into a 500. The early return above is what makes this fire once.
    const profile = await this.getProfile(accountId);
    await this.mail
      .sendWelcome(account.email, { restaurantName: profile?.restaurantName ?? null }, locale)
      .catch((error: unknown) => {
        this.logger.error(
          `Email confirmed but the welcome email failed for ${accountId}: ${String(error)}`,
        );
      });
  }

  /**
   * Sends a new code, subject to a cooldown.
   *
   * Unlike sign-up, a send failure here is reported: the owner pressed a button
   * whose only purpose was to deliver an email, so silence would be a lie.
   */
  async resendConfirmation(accountId: string, locale: EmailLocale = 'cs'): Promise<void> {
    const [account] = await this.db
      .select({
        id: ownerAccount.id,
        email: ownerAccount.email,
        emailVerifiedAt: ownerAccount.emailVerifiedAt,
      })
      .from(ownerAccount)
      .where(eq(ownerAccount.id, accountId))
      .limit(1);

    if (!account) throw AppError.unauthenticated();
    // Nothing to confirm. Not an error: the owner is already where they wanted
    // to be, and the frontend is about to redirect them off this screen.
    if (account.emailVerifiedAt) return;

    const [outstanding] = await this.db
      .select({ createdAt: emailConfirmation.createdAt })
      .from(emailConfirmation)
      .where(eq(emailConfirmation.accountId, accountId))
      .limit(1);

    if (
      outstanding &&
      Date.now() - outstanding.createdAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      throw AppError.tooManyAttempts();
    }

    await this.issueConfirmation(
      { id: account.id, email: account.email, emailVerified: false },
      locale,
    );
  }

  /** Every column a caller reads, including the three the logo occupies. */
  private static readonly PROFILE_COLUMNS = {
    restaurantName: restaurantProfile.restaurantName,
    phones: restaurantProfile.phones,
    location: restaurantProfile.location,
    logoKey: restaurantProfile.logoKey,
    logoWidth: restaurantProfile.logoWidth,
    logoHeight: restaurantProfile.logoHeight,
  };

  /** One row, one wire shape. The storage key never leaves this method. */
  private toPublicProfile(row: {
    restaurantName: string;
    phones: string[];
    location: string;
    logoKey: string | null;
    logoWidth: number | null;
    logoHeight: number | null;
  }): PublicProfile {
    return {
      restaurantName: row.restaurantName,
      phones: row.phones,
      location: row.location,
      logo: toImageRef(this.storage, {
        key: row.logoKey,
        width: row.logoWidth,
        height: row.logoHeight,
      }),
    };
  }

  /** Null for an account created before profiles existed. */
  async getProfile(accountId: string): Promise<PublicProfile | null> {
    const [row] = await this.db
      .select(AuthService.PROFILE_COLUMNS)
      .from(restaurantProfile)
      .where(eq(restaurantProfile.accountId, accountId))
      .limit(1);

    return row ? this.toPublicProfile(row) : null;
  }

  /**
   * One statement for both the completion step and the settings form. Which of
   * the two happened is not something the caller has to care about, and making
   * it one write means there is no window where a profile is half-replaced.
   *
   * The `set` clause names its three fields rather than spreading the input,
   * so a logo can never be cleared by someone saving their opening hours.
   */
  async upsertProfile(accountId: string, profile: ProfileInput): Promise<PublicProfile> {
    const [row] = await this.db
      .insert(restaurantProfile)
      .values({ accountId, ...profile })
      .onConflictDoUpdate({
        target: restaurantProfile.accountId,
        set: {
          restaurantName: profile.restaurantName,
          phones: profile.phones,
          location: profile.location,
          updatedAt: new Date(),
        },
      })
      .returning(AuthService.PROFILE_COLUMNS);

    // The upsert always returns the stored row; this satisfies the type.
    if (!row) throw AppError.notFound();
    return this.toPublicProfile(row);
  }

  // ----------------------------------------------------------------- logo

  /**
   * Stores a new logo, replacing any existing one (feature 006).
   *
   * The order is deliberate and is what keeps storage and the database from
   * disagreeing:
   *
   * 1. Process first. A file that is not an image never reaches storage.
   * 2. Write the object under a **new** random key. Keys are never reused, so
   *    a cache anywhere in the world cannot serve the old picture at the new
   *    address.
   * 3. Update the row, returning the key it used to hold.
   * 4. Only then delete the old object.
   *
   * If step 3 fails, the object written in step 2 is removed again — otherwise
   * it would be an orphan nothing references. If step 4 fails, the row is
   * already correct and the guest sees the right image; the stale object is
   * logged and swept later. Neither failure can leave a menu pointing at
   * nothing, which is the outcome that actually matters.
   */
  async setLogo(accountId: string, file: Buffer, crop?: CropRect): Promise<PublicProfile> {
    const rendition = await processImage(file, 'logo', crop);
    const key = newLogoKey();

    await this.storage.put(key, rendition.buffer, rendition.contentType);

    let row: Awaited<ReturnType<AuthService['updateLogoColumns']>>;
    try {
      row = await this.updateLogoColumns(accountId, {
        logoKey: key,
        logoWidth: rendition.width,
        logoHeight: rendition.height,
      });
    } catch (error) {
      await this.forget([key], 'compensating for a failed logo update');
      throw error;
    }

    await this.forget(row.previousKey ? [row.previousKey] : [], 'replaced logo');
    return this.toPublicProfile(row.profile);
  }

  /**
   * Removes the logo. Idempotent: an account with none is already in the state
   * the caller asked for, so this answers with the profile rather than an error.
   */
  async removeLogo(accountId: string): Promise<PublicProfile> {
    const row = await this.updateLogoColumns(accountId, {
      logoKey: null,
      logoWidth: null,
      logoHeight: null,
    });

    await this.forget(row.previousKey ? [row.previousKey] : [], 'removed logo');
    return this.toPublicProfile(row.profile);
  }

  /**
   * Writes the three logo columns and reports what was there before.
   *
   * One statement, so the read of the old key and the write of the new one
   * cannot interleave with another request doing the same thing: whichever
   * lands second owns the row, and the key it displaced is the one it deletes.
   */
  private async updateLogoColumns(
    accountId: string,
    columns: { logoKey: string | null; logoWidth: number | null; logoHeight: number | null },
  ) {
    const previous = this.db.$with('previous').as(
      this.db
        .select({ logoKey: restaurantProfile.logoKey })
        .from(restaurantProfile)
        .where(eq(restaurantProfile.accountId, accountId)),
    );

    const [row] = await this.db
      .with(previous)
      .update(restaurantProfile)
      .set({ ...columns, updatedAt: new Date() })
      .where(eq(restaurantProfile.accountId, accountId))
      .returning({
        ...AuthService.PROFILE_COLUMNS,
        previousKey: sql<string | null>`(select ${previous.logoKey} from ${previous})`,
      });

    // No row means no profile: an account that has not completed the step.
    // Reported as not found, like every other address that is not theirs.
    if (!row) throw AppError.notFound();

    const { previousKey, ...profile } = row;
    return { profile, previousKey: previousKey === columns.logoKey ? null : previousKey };
  }

  /**
   * Deletes objects that are no longer referenced, without letting a storage
   * failure undo a database write that already succeeded.
   *
   * The row is the record; an object nothing points at is litter, and litter is
   * what the sweep command exists to collect. So a failure here is logged with
   * the key and swallowed rather than turned into an error the owner sees for
   * an action that worked.
   */
  private async forget(keys: string[], reason: string): Promise<void> {
    if (keys.length === 0) return;

    try {
      await this.storage.delete(keys);
    } catch (error) {
      this.logger.error(
        `Could not delete ${keys.join(', ')} after ${reason}; the sweep will collect it.`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  async signIn(email: string, password: string): Promise<IssuedSession> {
    const [account] = await this.db
      .select({
        id: ownerAccount.id,
        email: ownerAccount.email,
        passwordHash: ownerAccount.passwordHash,
        emailVerifiedAt: ownerAccount.emailVerifiedAt,
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
    return this.issueSession(
      {
        id: account.id,
        email: account.email,
        emailVerified: account.emailVerifiedAt !== null,
      },
      profile,
    );
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
      .select({
        id: ownerAccount.id,
        email: ownerAccount.email,
        emailVerifiedAt: ownerAccount.emailVerifiedAt,
      })
      .from(session)
      .innerJoin(ownerAccount, eq(session.accountId, ownerAccount.id))
      .where(and(eq(session.tokenHash, hashToken(token)), gt(session.expiresAt, new Date())))
      .limit(1);

    if (!row) return null;
    // Resolved on every guarded request, which is what lets VerifiedGuard
    // decide without a second query.
    return { id: row.id, email: row.email, emailVerified: row.emailVerifiedAt !== null };
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
