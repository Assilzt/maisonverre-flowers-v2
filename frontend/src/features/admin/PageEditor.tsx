import { DEFAULT_PRODUCT } from "@shared/catalog";
import { useProductEditor } from "./products/useProductEditor";
import { productUrl } from "./products/product-model";
import { ProductFields } from "./products/ProductFields";
import "@/styles/admin.css";

export default function PageEditor() {
  const editor = useProductEditor();
  const {
    authenticated,
    products,
    page,
    storedSlug,
    stored,
    busy,
    dirty,
    message,
    error,
    revisions,
  } = editor;
  if (authenticated === null)
    return (
      <main className="admin-shell" dir="rtl">
        جارٍ التحقق من الجلسة…
      </main>
    );
  if (!authenticated)
    return (
      <main className="admin-shell" dir="rtl">
        <h1>المنتجات وصفحات الهبوط</h1>
        <p>{error || "سجّل الدخول إلى لوحة الإدارة لإدارة المنتجات."}</p>
        <a className="btn primary" href="/admin">
          تسجيل الدخول
        </a>
      </main>
    );
  return (
    <main className="admin-shell" dir="rtl">
      <header className="admin-header">
        <div>
          <p className="eyebrow">ATLASIO / PRODUCTS</p>
          <h1>المنتجات وصفحات الهبوط</h1>
          <p>كل منتج له صفحة مستقلة. احفظ Draft، عاين، ثم Publish.</p>
        </div>
        <a className="btn" href="/admin">
          العودة للطلبات
        </a>
      </header>
      <section className="panel">
        <div className="toolbar">
          <h2>منتجاتك ({products.length})</h2>
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={() => editor.create()}
          >
            + إضافة منتج جديد
          </button>
        </div>
        <div className="product-list">
          {products.map(p => (
            <button
              type="button"
              key={p.slug}
              disabled={busy}
              className={
                "product-list-item" + (storedSlug === p.slug ? " selected" : "")
              }
              onClick={() => editor.select(p.slug)}
            >
              <strong>{p.draft.name}</strong>
              <span>
                {p.published ? "منشور" : "مسودة"} ·{" "}
                {p.draft.price.toLocaleString()} دج
              </span>
              <span dir="ltr">{productUrl(p.slug)}</span>
            </button>
          ))}
        </div>
      </section>
      <div className="toolbar">
        <h2>{storedSlug ? "تعديل المنتج" : "إضافة منتج جديد"}</h2>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => editor.create(true)}
        >
          نسخ المنتج
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={editor.preview}
        >
          معاينة
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={editor.save}
        >
          {busy ? "جارٍ الحفظ…" : "حفظ المسودة"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={busy || dirty || !stored || stored.virtual}
          onClick={editor.publish}
        >
          نشر المنتج
        </button>
        {stored?.published && (
          <a
            className="btn"
            target="_blank"
            rel="noreferrer"
            href={productUrl(stored.slug)}
          >
            فتح الصفحة المنشورة
          </a>
        )}
      </div>
      {dirty && (
        <p className="notice">
          توجد بيانات غير محفوظة. احفظ المسودة قبل النشر.
        </p>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {page.slug === DEFAULT_PRODUCT.slug && (
        <p className="muted">صفحة الزهور الرئيسية: هوية Pixel الأصلية محمية.</p>
      )}
      <fieldset disabled={busy} className="min-w-0">
        <ProductFields
          page={page}
          change={editor.change}
          slugLocked={Boolean(storedSlug)}
        />
      </fieldset>
      <section className="panel">
        <h2>النسخ السابقة</h2>
        <p>الاسترجاع يعيد المسودة فقط؛ راجعها ثم انشرها.</p>
        {revisions.map(r => (
          <button
            type="button"
            className="btn"
            disabled={busy}
            key={r.revision}
            onClick={() => editor.restore(r.revision)}
          >
            استرجاع النسخة {r.revision}
          </button>
        ))}
      </section>
    </main>
  );
}
