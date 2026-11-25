import {
  getBody,
  isAdmin,
  queryValue,
  Request,
  Response,
} from "../backend/repositories/index.js";
import { sql } from "../backend/repositories/connection.js";
import { publishedPage, validatePage } from "../backend/services/pages.js";
import { pageCacheTag, purgeCache } from "../backend/services/cache-tags.js";
import { DEFAULT_PRODUCT } from "../shared/catalog.js";

const defaultEntry = () => ({
  slug: DEFAULT_PRODUCT.slug,
  draft: DEFAULT_PRODUCT,
  published: DEFAULT_PRODUCT,
  revision: 0,
  virtual: true,
});
export default async function pages(request: Request, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  try {
    if (request.method === "GET" && queryValue(request, "mode") !== "admin") {
      const page = await publishedPage(
        queryValue(request, "slug") || DEFAULT_PRODUCT.slug
      );
      if (!page) {
        response.status(404).json({ error: "المنتج غير منشور أو غير موجود" });
        return;
      }
      response.setHeader(
        "Cache-Control",
        "public, s-maxage=30, stale-while-revalidate=60"
      );
      response.status(200).json({ page });
      return;
    }
    if (!isAdmin(request)) {
      response.status(401).json({ error: "غير مصرح" });
      return;
    }
    if (!sql) throw new Error("Database required");
    if (request.method === "GET") {
      const slug = queryValue(request, "slug");
      const rows = slug
        ? await sql`SELECT * FROM mv_landing_pages WHERE slug=${slug}`
        : await sql`SELECT * FROM mv_landing_pages ORDER BY updated_at DESC`;
      if (slug && !rows.length && slug !== DEFAULT_PRODUCT.slug) {
        response.status(404).json({ error: "المنتج غير موجود" });
        return;
      }
      const entries = [...rows];
      if (
        (!slug || slug === DEFAULT_PRODUCT.slug) &&
        !entries.some(row => row.slug === DEFAULT_PRODUCT.slug)
      )
        entries.push(defaultEntry());
      const revisions = slug
        ? await sql`SELECT revision,created_at FROM mv_page_revisions WHERE slug=${slug} ORDER BY revision DESC LIMIT 30`
        : [];
      response.status(200).json({ pages: entries, revisions });
      return;
    }
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }
    const body = getBody(request.body),
      action = String(body.action),
      slug = String(body.slug || "");
    if (action === "restore") {
      const rows =
        await sql`SELECT config FROM mv_page_revisions WHERE slug=${slug} AND revision=${Number(body.revision)}`;
      if (!rows[0]) {
        response.status(404).json({ error: "النسخة غير موجودة" });
        return;
      }
      await sql`UPDATE mv_landing_pages SET draft=${JSON.stringify(rows[0].config)}::jsonb,updated_at=NOW() WHERE slug=${slug}`;
    } else if (action === "create" || action === "save") {
      const page = validatePage(body.page);
      if (slug && slug !== page.slug) {
        response.status(400).json({ error: "لا يمكن تغيير رابط منتج محفوظ" });
        return;
      }
      if (action === "create") {
        if (page.slug === DEFAULT_PRODUCT.slug) {
          response.status(409).json({ error: "هذا الرابط محجوز لصفحة الزهور" });
          return;
        }
        const inserted =
          await sql`INSERT INTO mv_landing_pages (slug,draft) VALUES (${page.slug},${JSON.stringify(page)}::jsonb) ON CONFLICT(slug) DO NOTHING RETURNING slug`;
        if (!inserted.length) {
          response
            .status(409)
            .json({ error: "رابط المنتج مستخدم. اختر رابطًا آخر." });
          return;
        }
      } else {
        await sql`INSERT INTO mv_landing_pages (slug,draft) VALUES (${page.slug},${JSON.stringify(page)}::jsonb) ON CONFLICT(slug) DO UPDATE SET draft=EXCLUDED.draft,updated_at=NOW()`;
      }
    } else if (action === "publish") {
      const rows =
        await sql`SELECT draft FROM mv_landing_pages WHERE slug=${slug}`;
      if (!rows[0]) {
        response.status(404).json({ error: "احفظ المسودة أولًا" });
        return;
      }
      const page = validatePage(rows[0].draft);
      const expected = body.expectedDraft
        ? validatePage(body.expectedDraft)
        : page;
      const published =
        await sql`WITH published AS (UPDATE mv_landing_pages SET published=${JSON.stringify(page)}::jsonb,revision=revision+1,updated_at=NOW() WHERE slug=${slug} AND draft=${JSON.stringify(expected)}::jsonb RETURNING slug,revision,published) INSERT INTO mv_page_revisions(slug,revision,config) SELECT slug,revision,published FROM published RETURNING revision`;
      if (!published.length) {
        response.status(409).json({
          error: "تغيرت المسودة. أعد فتح المنتج وراجع التعديلات قبل النشر.",
        });
        return;
      }
      await purgeCache(pageCacheTag(slug));
    } else {
      response.status(400).json({ error: "Unknown page action" });
      return;
    }
    response.status(200).json({ ok: true });
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : "تعذر حفظ المنتج",
    });
  }
}
