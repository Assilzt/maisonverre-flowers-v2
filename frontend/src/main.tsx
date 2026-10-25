import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "@/styles/storefront.css";
import "@/styles/gallery.css";
import App from "@/App";
import { initializeMetaPixel } from "@/features/tracking/meta-pixel";
const params = new URLSearchParams(location.search);
const admin =
  location.pathname.startsWith("/admin") ||
  params.get("dashboard") === "orders";
if (!admin && params.get("preview") !== "1") void initializeMetaPixel();
const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);
if (
  (location.pathname === "/" || document.getElementById("page-config")) &&
  !admin &&
  !params.has("preview") &&
  root.hasChildNodes()
)
  hydrateRoot(root, app);
else createRoot(root).render(app);
