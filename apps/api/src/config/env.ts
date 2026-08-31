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
}

export function loadEnv(): Env {
  loadDotEnv();
  return {
    databaseUrl: required('DATABASE_URL'),
    port: port('PORT', 3001),
    cookieSecure: boolean('COOKIE_SECURE', false),
  };
}
