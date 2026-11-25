import { createHash } from "node:crypto";
import { sql } from "../repositories/connection.js";

const TYPES = ["image/webp", "image/jpeg", "image/png"];
export const MAX_MEDIA_BYTES = 2 * 1024 * 1024;
export const mediaUrl = (id: string) => "/api/media?id=" + id;
export const MEDIA_URL = /^\/api\/media\?id=[a-f0-9]{24}$/;

/** Stores an uploaded image once (same bytes → same id) and returns its URL. */
export async function saveMedia(contentType: unknown, base64: unknown) {
  const type = String(contentType || "");
  if (!TYPES.includes(type)) throw new Error("نوع الصورة غير مدعوم");
  const data = String(base64 || "").replace(/^data:[^;]+;base64,/, "");
  if (!/^[A-Za-z0-9+/=]+$/.test(data)) throw new Error("ملف الصورة تالف");
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length) throw new Error("ملف الصورة فارغ");
  if (bytes.length > MAX_MEDIA_BYTES)
    throw new Error("الصورة كبيرة جدًا؛ الحد الأقصى 2 ميغابايت");
  const id = createHash("sha256").update(bytes).digest("hex").slice(0, 24);
  await sql!`INSERT INTO mv_media(id,content_type,data,size) VALUES(${id},${type},${bytes.toString("base64")},${bytes.length}) ON CONFLICT(id) DO NOTHING`;
  return { id, src: mediaUrl(id), size: bytes.length };
}

export async function readMedia(id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  const rows =
    await sql!`SELECT content_type,data FROM mv_media WHERE id=${id} LIMIT 1`;
  if (!rows[0]) return null;
  return {
    contentType: String(rows[0].content_type),
    bytes: Buffer.from(String(rows[0].data), "base64"),
  };
}
