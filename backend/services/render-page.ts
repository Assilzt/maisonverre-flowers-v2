import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import FlowerLanding from "../../frontend/src/features/storefront/FlowerLanding.js";
import {
  IMAGE_VARIANTS,
  type ProductLandingConfig,
} from "../../shared/catalog.js";
import {
  STOREFRONT_CONFIG_ID,
  type StorefrontConfig,
} from "../../shared/storefront.js";
const DEFAULT_IMAGE = "/images/flower-seed-mix.webp";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
const json = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
/** Points the hero preload at this page's first image. */
function preloadFor(template: string, src: string) {
  const variants = IMAGE_VARIANTS[src];
  return template.replace(
    /<link[^>]*rel="preload"[^>]*as="image"[^>]*>/,
    tag => {
      let next = tag.replace(/href="[^"]*"/, `href="${escape(src)}"`);
      next = variants
        ? next.replace(
            /imagesrcset="[^"]*"/,
            `imagesrcset="${escape(variants)}"`
          )
        : next
            .replace(/\s*imagesrcset="[^"]*"/, "")
            .replace(/\s*imagesizes="[^"]*"/, "");
      return next;
    }
  );
}
export async function renderPage(
  page: ProductLandingConfig,
  suppliedTemplate?: string,
  storefront: StorefrontConfig = {}
) {
  const src = page.images[0].src;
  const template = preloadFor(
    suppliedTemplate ??
      (await readFile(path.resolve("dist/server-template.html"), "utf8")),
    src
  ).replace(
    new RegExp(
      `(<meta [^>]*content=")${DEFAULT_IMAGE.replace(/\./g, "\\.")}"`,
      "g"
    ),
    (_match, prefix) => `${prefix}${escape(src)}"`
  );
  return template
    .replace(
      "<!--APP_HTML-->",
      renderToString(
        createElement(FlowerLanding, { product: page, storefront })
      )
    )
    .replace(
      "<!--PAGE_CONFIG-->",
      `<script type="application/json" id="page-config">${json(page)}</script>` +
        `<script type="application/json" id="${STOREFRONT_CONFIG_ID}">${json(storefront)}</script>`
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
