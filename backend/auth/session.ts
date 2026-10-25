import { createHmac, timingSafeEqual } from "node:crypto";
const secret = () =>
  process.env.SESSION_SECRET || process.env.DASHBOARD_PASSWORD || "";
export const secureEqual = (a: string, b: string) => {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};
export function issueSession(now = Date.now()) {
  if (!secret()) throw new Error("Dashboard authentication is not configured");
  const payload = Buffer.from(
    JSON.stringify({ exp: now + 8 * 60 * 60 * 1000 })
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", secret()).update(payload).digest("base64url")
  );
}
export function verifySession(cookie: string, now = Date.now()) {
  if (!secret()) return false;
  const token =
    cookie
      .split(";")
      .map(v => v.trim())
      .find(v => v.startsWith("mv_session="))
      ?.slice(11) || "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  if (
    !secureEqual(
      signature,
      createHmac("sha256", secret()).update(payload).digest("base64url")
    )
  )
    return false;
  try {
    return (
      Number(JSON.parse(Buffer.from(payload, "base64url").toString()).exp) > now
    );
  } catch {
    return false;
  }
}
