import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
// Self-hosted font: Arabic and Latin subsets only. Browsers download a weight
// only when text uses it (the storefront uses 400 and 700).
import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
import "@fontsource/ibm-plex-sans-arabic/latin-400.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-500.css";
import "@fontsource/ibm-plex-sans-arabic/latin-500.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
import "@fontsource/ibm-plex-sans-arabic/latin-600.css";
import "@fontsource/ibm-plex-sans-arabic/arabic-700.css";
import "@fontsource/ibm-plex-sans-arabic/latin-700.css";
import "@/styles/storefront.css";
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
