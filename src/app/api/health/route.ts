import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { tutorConnected } from "@/lib/tutor/config";

/** Used by the post-deploy smoke test: proves the app can reach its database. */
export async function GET() {
  try {
    await getDb().execute(sql`select 1`);
    // `tutor` says only whether a key is present, so a deployment can be checked without signing in.
    return Response.json({ ok: true, tutor: tutorConnected() });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
