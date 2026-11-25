/**
 * The Postgres connection string. Vercel's Neon integration provides it under
 * DATABASE_URL, and some setups under POSTGRES_URL instead, so accept either.
 */
export function databaseUrl(): string | undefined {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}
