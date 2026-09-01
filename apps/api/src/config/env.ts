/**
 * Environment access, read at boot so a misconfigured process fails with a
 * readable message instead of at the first request with a connection error.
 */

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
  /** The From address on confirmation emails. Must be a domain Resend has verified. */
  emailFrom: string;
}

export function loadEnv(): Env {
  loadDotEnv();
  return {
    databaseUrl: required('DATABASE_URL'),
    port: port('PORT', 3001),
    cookieSecure: boolean('COOKIE_SECURE', false),
    resendApiKey: optional('RESEND_API_KEY'),
    emailFrom: optional('EMAIL_FROM') ?? 'Restaura <onboarding@resend.dev>',
  };
}
