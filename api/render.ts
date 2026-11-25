import { addCacheTag } from "@vercel/functions";
import { publishedPage } from "../backend/services/pages.js";
import { renderPage } from "../backend/services/render-page.js";
import { loadStorefrontConfig } from "../backend/services/storefront-config.js";
import {
  pageCacheTag,
  STOREFRONT_CACHE_TAG,
} from "../backend/services/cache-tags.js";
import { DEFAULT_PRODUCT } from "../shared/catalog.js";
import {
  queryValue,
  type Request,
  type Response,
} from "../backend/repositories/index.js";

const errorPage = (title: string) =>
  `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:48px 16px"><h1>${title}</h1><p><a href="/">العودة للمتجر</a></p></body></html>`;

export default async function render(request: Request, response: Response) {
  if (request.method !== "GET") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  const slug = queryValue(request, "slug") || DEFAULT_PRODUCT.slug;
  // The page and the checkout config load in parallel.
  const storefront = loadStorefrontConfig();
  let page: Awaited<ReturnType<typeof publishedPage>>,
    degraded = false;
  try {
    page = await publishedPage(slug);
  } catch {
    // Database down: the flower page still sells from its built-in config.
    degraded = true;
    page = slug === DEFAULT_PRODUCT.slug ? DEFAULT_PRODUCT : null;
  }
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  if (!page) {
    response.setHeader("Cache-Control", "public, s-maxage=60");
    response.status(degraded ? 503 : 404);
    response.send?.(
      errorPage(degraded ? "الصفحة غير متاحة مؤقتًا" : "المنتج غير موجود")
    );
    return;
  }
  try {
    const html = await renderPage(page, undefined, await storefront);
    // Long CDN cache; publishing a page or saving settings purges it by tag.
    response.setHeader(
      "Cache-Control",
      degraded
        ? "public, s-maxage=30"
        : "public, s-maxage=86400, stale-while-revalidate=604800"
    );
    if (!degraded)
      await addCacheTag([pageCacheTag(slug), STOREFRONT_CACHE_TAG]).catch(
        () => undefined
      );
    response.status(200);
    response.send?.(html);
  } catch {
    response.setHeader("Cache-Control", "no-store");
    response.status(503);
    response.send?.(errorPage("الصفحة غير متاحة مؤقتًا"));
  }
}
