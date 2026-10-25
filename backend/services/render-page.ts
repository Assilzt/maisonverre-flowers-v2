import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import FlowerLanding from "../../frontend/src/features/storefront/FlowerLanding.js";
import type { ProductLandingConfig } from "../../shared/catalog.js";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
export async function renderPage(
  page: ProductLandingConfig,
  suppliedTemplate?: string
) {
  const template = (
    suppliedTemplate ??
    (await readFile(path.resolve("dist/server-template.html"), "utf8"))
  ).replaceAll("/images/flower-seed-mix.webp", escape(page.images[0].src));
  const config = JSON.stringify(page).replace(/</g, "\\u003c");
  return template
    .replace(
      "<!--APP_HTML-->",
      renderToString(createElement(FlowerLanding, { product: page }))
    )
    .replace(
      "<!--PAGE_CONFIG-->",
      `<script type="application/json" id="page-config">${config}</script>`
    )
    .replace(
      /<title>[\s\S]*?<\/title>/,
      `<title>${escape("MaisonVerre — " + page.name)}</title>`
    )
    .replace(
      /(<meta (?:property|name)="(?:og:title|twitter:title)" content=")[^"]*/g,
      (_match, prefix) => prefix + escape("MaisonVerre — " + page.name)
    )
    .replace(
      /(<meta (?:property|name)="(?:description|og:description|twitter:description)" content=")[^"]*/g,
      (_match, prefix) => prefix + escape(page.description)
    );
}
