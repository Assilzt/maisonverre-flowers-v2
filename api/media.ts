import { readMedia, saveMedia } from "../backend/services/media.js";
import {
  getBody,
  isAdmin,
  queryValue,
  type Request,
  type Response,
} from "../backend/repositories/index.js";

/** GET serves an uploaded image; POST (admin only) uploads one. */
export default async function media(request: Request, response: Response) {
  try {
    if (request.method === "GET") {
      const file = await readMedia(String(queryValue(request, "id") || ""));
      if (!file) {
        response.status(404).json({ error: "الصورة غير موجودة" });
        return;
      }
      // The id is a hash of the bytes, so the file never changes.
      response.setHeader("Content-Type", file.contentType);
      response.setHeader(
        "Cache-Control",
        "public, max-age=31536000, immutable"
      );
      response.status(200);
      response.send?.(file.bytes);
      return;
    }
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }
    if (!isAdmin(request)) {
      response.status(401).json({ error: "غير مصرح" });
      return;
    }
    response.setHeader("Cache-Control", "no-store");
    const body = getBody(request.body);
    response.status(200).json(await saveMedia(body.type, body.data));
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "تعذر رفع الصورة",
    });
  }
}
