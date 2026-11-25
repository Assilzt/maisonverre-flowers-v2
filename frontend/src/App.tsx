import { lazy, Suspense, useEffect, useState } from "react";
import FlowerLanding from "@/features/storefront/FlowerLanding";
import { DEFAULT_PRODUCT, type ProductLandingConfig } from "@shared/catalog";
import { readEmbeddedStorefront } from "@shared/storefront";
const Dashboard = lazy(() => import("@/features/admin/Dashboard"));
const PageEditor = lazy(() => import("@/features/admin/PageEditor"));
export function embeddedPage(slug: string) {
  try {
    const config = JSON.parse(
      document.getElementById("page-config")?.textContent || "null"
    );
    return config?.slug === slug ? (config as ProductLandingConfig) : null;
  } catch {
    return null;
  }
}
export default function App() {
  const path = window.location.pathname,
    params = new URLSearchParams(window.location.search);
  const isAdmin =
      path === "/admin" ||
      path.startsWith("/admin/") ||
      params.get("dashboard") === "orders",
    editor = path === "/admin/pages" || path === "/admin/products";
  const slug = path.startsWith("/p/")
    ? decodeURIComponent(path.slice(3))
    : DEFAULT_PRODUCT.slug;
  const preview = params.get("preview") === "1";
  const [page, setPage] = useState<ProductLandingConfig | null>(
      embeddedPage(slug) ||
        (slug === DEFAULT_PRODUCT.slug ? DEFAULT_PRODUCT : null)
    ),
    [error, setError] = useState(""),
    [storefront] = useState(readEmbeddedStorefront);
  useEffect(() => {
    if (isAdmin) return;
    if (!preview && embeddedPage(slug)) return;
    if (preview) {
      try {
        setPage(
          JSON.parse(sessionStorage.getItem("maisonverre:preview") || "null")
        );
      } catch {
        setError("تعذرت المعاينة");
      }
      return;
    }
    const controller = new AbortController();
    void fetch("/api/pages?slug=" + encodeURIComponent(slug), {
      signal: controller.signal,
    })
      .then(async r => {
        if (!r.ok) throw new Error("الصفحة غير متاحة");
        return r.json();
      })
      .then(data => setPage(data.page))
      .catch(e => {
        if (!controller.signal.aborted && slug !== DEFAULT_PRODUCT.slug)
          setError(e.message);
      });
    return () => controller.abort();
  }, [slug, isAdmin, preview]);
  useEffect(() => {
    if (page) document.title = "MaisonVerre — " + page.name;
  }, [page]);
  if (isAdmin)
    return (
      <Suspense fallback={<p dir="rtl">جارٍ تحميل الإدارة…</p>}>
        {editor ? <PageEditor /> : <Dashboard />}
      </Suspense>
    );
  if (path !== "/" && !path.startsWith("/p/"))
    return (
      <main dir="rtl">
        <h1>الصفحة غير موجودة</h1>
        <a href="/">العودة للمتجر</a>
      </main>
    );
  if (error)
    return (
      <main dir="rtl">
        <h1>{error}</h1>
        <a href="/">العودة للمتجر</a>
      </main>
    );
  if (!page) return <p dir="rtl">جارٍ تحميل الصفحة…</p>;
  return (
    <>
      {preview && (
        <p className="preview-banner" dir="rtl">
          معاينة — لا يُحفظ أي طلب ولا تُرسل أحداث Pixel
        </p>
      )}
      <FlowerLanding key={page.slug} product={page} storefront={storefront} />
    </>
  );
}
