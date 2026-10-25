import { publishedPage } from "../backend/services/pages.js";
import { renderPage } from "../backend/services/render-page.js";
import { DEFAULT_PRODUCT } from "../shared/catalog.js";
import {
  queryValue,
  type Request,
  type Response,
} from "../backend/repositories/index.js";
export default async function render(request: Request, response: Response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  const slug = queryValue(request, "slug") || DEFAULT_PRODUCT.slug;
  try {
    const page = await publishedPage(slug);
    if (!page) {
      response.status(404).json({ error: "Page not found" });
      return;
    }
    response.setHeader(
      "Cache-Control",
      "public, s-maxage=30, stale-while-revalidate=60"
    );
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.status(200);
    response.send?.(await renderPage(page));
  } catch {
    response.status(503).json({ error: "الصفحة غير متاحة مؤقتًا" });
  }
}
