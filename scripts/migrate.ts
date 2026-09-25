/**
 * Applies supabase/migrations/*.sql in order to the database in SUPABASE_DB_URL.
 * Works with Supabase cloud without the Supabase CLI or Docker.
 *   npm run db:migrate
 * Applied files are recorded in public.schema_migrations_pingo.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { requireEnv } from "./lib/env";

const dir = join(process.cwd(), "supabase", "migrations");

async function main() {
  const client = new pg.Client({ connectionString: requireEnv("SUPABASE_DB_URL"), ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(
      "create table if not exists public.schema_migrations_pingo (name text primary key, applied_at timestamptz not null default now())",
    );
    await client.query("alter table public.schema_migrations_pingo enable row level security");
    const { rows } = await client.query<{ name: string }>("select name from public.schema_migrations_pingo");
    const applied = new Set(rows.map((r) => r.name));

    const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    let count = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = readFileSync(join(dir, file), "utf8");
      process.stdout.write(`→ applying ${file} ... `);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into public.schema_migrations_pingo (name) values ($1)", [file]);
        await client.query("commit");
        console.log("ok");
        count++;
      } catch (error) {
        await client.query("rollback");
        console.log("FAILED");
        throw error;
      }
    }
    console.log(count ? `✔ ${count} migration(s) applied.` : "✔ database is up to date.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
