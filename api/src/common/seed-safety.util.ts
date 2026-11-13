// Pure, dependency-free safety check for the destructive demo seed
// (prisma/seed.ts). Kept separate from Prisma/Nest so it can be unit
// tested without a database connection - see
// prisma/seed.ts and api/README.md, "Local database setup".

export const SEED_EXPECTED_DB_NAME = 'b4f_board';
export const SEED_EXPECTED_DB_PORT = '5433';
export const SEED_SAFE_HOSTS = ['localhost', '127.0.0.1', '::1'] as const;

// Explicit, clearly-named escape hatch for a deliberately configured
// alternate local preview setup. Never bypasses the check merely because
// DATABASE_URL happens to point somewhere - the developer must set this
// exact variable themselves.
export const SEED_SAFETY_OVERRIDE_ENV_VAR = 'SEED_ALLOW_UNSAFE_DATABASE_URL';

export interface SeedSafetyResult {
  safe: boolean;
  reason?: string;
  host?: string;
  port?: string;
  databaseName?: string;
}

// Checks that a DATABASE_URL points at the dedicated, isolated local B4F
// Board preview database - never a shared/system/production database -
// before the seed script is allowed to run its destructive reset.
export function checkSeedDatabaseUrl(databaseUrl: string | undefined): SeedSafetyResult {
  if (!databaseUrl) {
    return { safe: false, reason: 'DATABASE_URL is not set.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return { safe: false, reason: 'DATABASE_URL is not a valid connection URL.' };
  }

  const host = parsed.hostname;
  const port = parsed.port;
  const databaseName = parsed.pathname.replace(/^\//, '');

  const isSafeHost = (SEED_SAFE_HOSTS as readonly string[]).includes(host);
  const isSafePort = port === SEED_EXPECTED_DB_PORT;
  const isSafeDbName = databaseName === SEED_EXPECTED_DB_NAME;

  if (isSafeHost && isSafePort && isSafeDbName) {
    return { safe: true, host, port, databaseName };
  }

  const problems = [
    !isSafeHost ? `host must be localhost/127.0.0.1 (got "${host}")` : null,
    !isSafePort ? `port must be ${SEED_EXPECTED_DB_PORT} (got "${port || '(none)'}")` : null,
    !isSafeDbName
      ? `database name must be "${SEED_EXPECTED_DB_NAME}" (got "${databaseName || '(none)'}")`
      : null,
  ].filter((p): p is string => p !== null);

  return { safe: false, host, port, databaseName, reason: problems.join('; ') };
}
