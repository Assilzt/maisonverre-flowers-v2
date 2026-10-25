import { createHash } from "node:crypto";
import { sql } from "../repositories/connection.js";
export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super(`Rate limit; retry after ${retryAfter}s`);
  }
}
export async function consumeBudget(
  key: string,
  limit: number,
  seconds: number
) {
  if (!sql) {
    if (process.env.VERCEL)
      throw new Error("Database required for rate limits");
    return;
  }
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const id = createHash("sha256")
    .update(`${key}:${seconds}:${bucket}`)
    .digest("hex");
  const rows =
    await sql`INSERT INTO mv_rate_limits (key, count, expires_at) VALUES (${id},1,NOW()+(${seconds} * INTERVAL '1 second')) ON CONFLICT (key) DO UPDATE SET count=mv_rate_limits.count+1 WHERE mv_rate_limits.count < ${limit} RETURNING count`;
  if (!rows[0])
    throw new RateLimitError(
      seconds - (Math.floor(Date.now() / 1000) % seconds)
    );
}
