/** Postgres unique_violation. */
const UNIQUE_VIOLATION = '23505';

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === code
  );
}

/**
 * Drizzle wraps driver errors in a DrizzleQueryError, so the Postgres SQLSTATE
 * sits on `cause` rather than on the error itself. Walk the chain rather than
 * assume a depth.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== null && current !== undefined; depth += 1) {
    if (hasCode(current, UNIQUE_VIOLATION)) return true;
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}
