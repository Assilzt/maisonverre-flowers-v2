import { it, expect } from "vitest";
import { renderPage } from "../backend/services/render-page";
import { DEFAULT_PRODUCT } from "../shared/catalog";
const template =
  '<html><head><title>Default</title><!--PAGE_CONFIG--></head><body><div id="root"><!--APP_HTML--></div></body></html>';
it("renders the product and checkout before client JavaScript runs", async () => {
  const html = await renderPage(DEFAULT_PRODUCT, template);
  expect(html).toContain(DEFAULT_PRODUCT.headline);
  expect(html).toContain('id="lead-form"');
  expect(html).toContain('fetchPriority="high"');
});
it("escapes embedded configuration without altering its parsed values", async () => {
  const page = {
    ...DEFAULT_PRODUCT,
    name: "Test </script><img src=x onerror=alert(1)>",
    images: [
      {
        ...DEFAULT_PRODUCT.images[0],
        src: "/images/flower-seed-mix.webp?rev=1",
      },
    ],
  };
  const html = await renderPage(page, template);
  const config = html.match(
    /<script type="application\/json" id="page-config">([\s\S]*?)<\/script>/
  )?.[1];
  expect(config).toBeDefined();
  expect(config).not.toContain("<");
  expect(JSON.parse(config!).name).toBe(page.name);
  expect(JSON.parse(config!).images[0].src).toBe(page.images[0].src);
});
