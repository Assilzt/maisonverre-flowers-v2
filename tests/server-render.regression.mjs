import test from "node:test";
import assert from "node:assert/strict";
import { renderPage } from "../backend/services/render-page.ts";
import { DEFAULT_PRODUCT } from "../shared/catalog.ts";

test("server rendering loads in Node without a browser CSS loader", async () => {
  const html = await renderPage(
    DEFAULT_PRODUCT,
    "<html><head><!--PAGE_CONFIG--></head><body><!--APP_HTML--></body></html>"
  );
  assert.ok(html.includes(DEFAULT_PRODUCT.headline));
  assert.ok(html.includes('id="lead-form"'));
});
