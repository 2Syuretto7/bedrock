import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { databaseUrl } from "./url";

export type Db = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { bedrockPool?: Pool };

/** One pool per server instance. Created lazily so builds do not need a database. */
export function getDb(): Db {
  const url = databaseUrl();
  if (!url) throw new Error("No database is connected: DATABASE_URL is not set");
  globalForDb.bedrockPool ??= new Pool({ connectionString: url, max: 5 });
  return drizzle(globalForDb.bedrockPool, { schema });
}
