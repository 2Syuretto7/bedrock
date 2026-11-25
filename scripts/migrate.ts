/**
 * Applies migrations/*.sql in filename order, once each, inside a transaction.
 * Runs during the Vercel build and in CI. Safe to run repeatedly.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { databaseUrl } from "../src/lib/db/url";

export async function migrate(databaseUrl: string, log: (m: string) => void = console.log) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    // One migrator at a time, even if two deployments build together.
    await client.query("select pg_advisory_lock(4158001)");
    await client.query(
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const dir = path.join(process.cwd(), "migrations");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
    const done = new Set(
      (await client.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name),
    );
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
        log(`applied ${file}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith("migrate.ts")) {
  const url = databaseUrl();
  if (!url) {
    // Local builds without a database still need to succeed.
    console.log("DATABASE_URL is not set; skipping migrations.");
  } else {
    migrate(url).catch((error) => {
      console.error(error);
      process.exit(1);
    });
  }
}
