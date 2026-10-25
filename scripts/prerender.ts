import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
const server = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { default: Landing } = await server.ssrLoadModule(
    "/src/features/storefront/FlowerLanding.tsx"
  );
  const markup = renderToString(createElement(Landing));
  const target = new URL("../dist/public/index.html", import.meta.url);
  const html = await readFile(target, "utf8");
  await writeFile(
    new URL("../dist/server-template.html", import.meta.url),
    html
      .replace('<div id="root"></div>', '<div id="root"><!--APP_HTML--></div>')
      .replace("</head>", "<!--PAGE_CONFIG--></head>")
  );
  if (!html.includes('<div id="root"></div>'))
    throw new Error("Prerender target missing");
  await writeFile(
    target,
    html.replace('<div id="root"></div>', `<div id="root">${markup}</div>`)
  );
  console.log(
    "Prerendered flower storefront: readable content and hero without waiting for JavaScript."
  );
} finally {
  await server.close();
}
