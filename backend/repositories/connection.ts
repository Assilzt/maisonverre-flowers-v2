import { neon } from "@neondatabase/serverless";
export let sql = process.env.DATABASE_URL
  ? neon(process.env.DATABASE_URL)
  : null;
export function setTestDatabase(database: NonNullable<typeof sql>) {
  if (process.env.NODE_ENV !== "test")
    throw new Error("Test database injection is disabled");
  sql = database;
}

export function requireDatabase() {
  if (!sql) throw new Error("DATABASE_URL is not configured");
}
