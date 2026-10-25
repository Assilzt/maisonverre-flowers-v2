import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
if (!process.env.DATABASE_URL)
  throw new Error("Set DATABASE_URL before migrating the isolated V2 database");
const sql = neon(process.env.DATABASE_URL);
await sql`CREATE TABLE IF NOT EXISTS mv_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
for (const file of (
  await readdir(new URL("../database/migrations/", import.meta.url))
)
  .filter(f => f.endsWith(".sql"))
  .sort()) {
  if ((await sql`SELECT name FROM mv_migrations WHERE name=${file}`).length)
    continue;
  const content = await readFile(
    new URL("../database/migrations/" + file, import.meta.url),
    "utf8"
  );
  const statements = content
    .split(";")
    .map(s => s.trim())
    .filter(Boolean);
  await sql.transaction([
    ...statements.map(statement => sql.query(statement, [])),
    sql`INSERT INTO mv_migrations (name) VALUES (${file})`,
  ]);
  console.log("Applied", file);
}
