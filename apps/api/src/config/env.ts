/**
 * Environment access, read at boot so a misconfigured process fails with a
 * readable message instead of at the first request with a connection error.
 */
import { join } from 'node:path';
import { DEFAULT_EMAIL_FROM } from '../mail/addresses.js';

/**
 * Loads apps/api/.env when present. Deployed environments supply real
 * environment variables and have no .env file, so absence is not an error.
 */
function loadDotEnv(): void {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file — the process must already carry the variables.
  }
}

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. Copy apps/api/.env.example to apps/api/.env and fill it in.`,
    );
  }
  return value;
}

/**
 * A variable the process runs without. Returns undefined rather than an empty
 * string so a caller can branch on "configured at all" with `??`.
 */
function optional(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? undefined : value;
}

function port(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Environment variable ${name} must be a port number, got "${raw}".`);
  }
  return parsed;
}

function boolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw new Error(`Environment variable ${name} must be "true" or "false", got "${raw}".`);
}

/**
 * Where uploaded images are kept.
 *
 * Two shapes rather than one with optional fields, because the adapter that
 * consumes this needs either all five R2 values or none of them, and a type
 * that can express "half configured" is a type every caller has to re-check.
 */
export type ImageStorageEnv =
  | {
      kind: 'r2';
      accountId: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucket: string;
      /** Public base URL, no trailing slash. */
      publicUrl: string;
    }
  | {
      kind: 'local';
      /** Absolute path the API writes renditions under. */
      directory: string;
      /** Public base URL of the API's own /dev-images route, no trailing slash. */
      publicUrl: string;
    };

/** The five variables that configure R2. All of them, or none of them. */
const R2_VARIABLES = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'IMAGE_PUBLIC_URL',
] as const;

function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * Reads the image-storage configuration.
 *
 * Absent entirely, the API stores renditions on disk and serves them itself,
 * so the whole upload flow is developable and testable with no credentials and
 * no network — the same reasoning as `RESEND_API_KEY`. Half-present is always a
 * mistake, and one that would otherwise surface as a 500 on the first upload,
 * so it fails at boot naming exactly what is missing.
 */
export function loadImageStorageEnv(port: number, cwd = process.cwd()): ImageStorageEnv {
  const present = R2_VARIABLES.filter((name) => optional(name) !== undefined);

  if (present.length === 0) {
    return {
      kind: 'local',
      directory: join(cwd, '.images'),
      publicUrl: `http://localhost:${port}/dev-images`,
    };
  }

  if (present.length !== R2_VARIABLES.length) {
    const missing = R2_VARIABLES.filter((name) => optional(name) === undefined);
    throw new Error(
      `Image storage is half configured. Set all of ${R2_VARIABLES.join(', ')} or none of them. Missing: ${missing.join(', ')}.`,
    );
  }

  return {
    kind: 'r2',
    accountId: required('R2_ACCOUNT_ID'),
    accessKeyId: required('R2_ACCESS_KEY_ID'),
    secretAccessKey: required('R2_SECRET_ACCESS_KEY'),
    bucket: required('R2_BUCKET'),
    publicUrl: withoutTrailingSlash(required('IMAGE_PUBLIC_URL')),
  };
}

export interface Env {
  databaseUrl: string;
  port: number;
  /** Adds Secure to the session cookie. Must be true anywhere that is not localhost. */
  cookieSecure: boolean;
  /**
   * Undefined in local development, where MailService logs confirmation codes
   * to the console instead of sending them. Deliberately optional: requiring a
   * third-party key to run the sign-up flow locally would make the whole
   * registration path undevelopable offline.
   */
  resendApiKey: string | undefined;
  /**
   * The From header on every email. Defaults to `Restaura <noreply@restaura.cz>`
   * (see `mail/addresses.ts`); whatever it is set to must be a domain Resend
   * has verified.
   */
  emailFrom: string;
  /**
   * Public origin of the frontend, without a trailing slash. Used only to
   * build the links inside emails; nothing else in the API knows where the
   * frontend lives.
   */
  appUrl: string;
  /**
   * Where uploaded logos and dish photos are stored. Cloudflare R2 when the
   * five R2 variables are set, the local disk otherwise.
   */
  imageStorage: ImageStorageEnv;
}

export function loadEnv(): Env {
  loadDotEnv();
  const apiPort = port('PORT', 3001);
  return {
    databaseUrl: required('DATABASE_URL'),
    port: apiPort,
    cookieSecure: boolean('COOKIE_SECURE', false),
    resendApiKey: optional('RESEND_API_KEY'),
    emailFrom: optional('EMAIL_FROM') ?? DEFAULT_EMAIL_FROM,
    appUrl: withoutTrailingSlash(optional('APP_URL') ?? 'http://localhost:3000'),
    imageStorage: loadImageStorageEnv(apiPort),
  };
}
