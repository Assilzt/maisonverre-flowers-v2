import { useState } from "react";
import {
  Plus,
  ArrowRight,
  ArrowUpLeft,
  Eye,
  Package,
  Search,
  Copy,
  History,
} from "lucide-react";
import { AdminShell } from "./ui/AdminShell";
import { useProductEditor } from "./products/useProductEditor";
import { productUrl } from "./products/product-model";
import { ProductFields, type ProductSection } from "./products/ProductFields";
import { validateProductForm } from "./products/validation";
function Thumbnail({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return src &&
    !failed &&
    (src.startsWith("/images/") || src.startsWith("https://")) ? (
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
  ) : (
    <Package size={32} strokeWidth={1.2} />
  );
}
export default function PageEditor() {
  const editor = useProductEditor();
  const {
    page,
    stored,
    storedSlug,
    products,
    authenticated,
    busy,
    error,
    message,
    dirty,
  } = editor;
  const [editing, setEditing] = useState(false),
    [section, setSection] = useState<ProductSection>("basic"),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all");
  const edit = async (slug: string) => {
    if (await editor.select(slug)) {
      setEditing(true);
      setSection("basic");
    }
  };
  const create = (duplicate = false) => {
    if (editor.create(duplicate)) {
      setEditing(true);
      setSection("basic");
    }
  };
  const back = () => {
    if (editor.leaveEditor()) setEditing(false);
  };
  const save = () => {
    const errors = validateProductForm(page);
    if (errors.name || errors.slug) setSection("basic");
    else if (errors.images) setSection("images");
    else if (errors.bundles) setSection("offers");
    else if (errors.tracking) setSection("advanced");
    editor.save();
  };
  const visible = products.filter(
    p =>
      (filter === "all" ||
        (filter === "published" ? Boolean(p.published) : !p.published)) &&
      (p.draft.name + " " + p.slug).toLowerCase().includes(query.toLowerCase())
  );
  const tabs: Array<[ProductSection, string]> = [
    ["basic", "البيانات الأساسية"],
    ["images", "الصور"],
    ["offers", "الأسعار والعروض"],
    ["content", "صفحة الهبوط"],
    ["advanced", "متقدم"],
  ];
  const currentIsPublished =
    Boolean(stored?.published) &&
    JSON.stringify(stored?.published) === JSON.stringify(page);
  return (
    <AdminShell
      active="products"
      title={editing ? (storedSlug ? "تعديل المنتج" : "منتج جديد") : "المنتجات"}
      description={
        editing
          ? "مسودة مستقلة، يمكنك معاينتها قبل أن تظهر للعملاء."
          : "منتجاتك وصفحات الهبوط المرتبطة بها."
      }
      actions={
        authenticated ? (
          <>
            {editing ? (
              <>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={back}
                >
                  <ArrowRight size={15} />
                  المنتجات
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={editor.preview}
                >
                  <Eye size={15} />
                  معاينة
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn primary"
                disabled={busy}
                onClick={() => create()}
              >
                <Plus size={16} />
                إضافة منتج
              </button>
            )}
          </>
        ) : undefined
      }
    >
      {authenticated === null ? (
        <section className="panel" role="status">
          جارٍ تحميل المنتجات…
        </section>
      ) : !authenticated ? (
        <section className="panel">
          <h2>تسجيل الدخول مطلوب</h2>
          <p className="muted" style={{ margin: "12px 0 20px" }}>
            {error || "سجّل الدخول لإدارة المنتجات وصفحات الهبوط."}
          </p>
          <a className="btn primary" href="/admin">
            تسجيل الدخول
          </a>
        </section>
      ) : (
        <>
          {error && (
            <p role="alert" className="notice error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
          {!editing ? (
            <>
              <div className="orders-toolbar" style={{ padding: "0 0 20px" }}>
                <div className="search-field">
                  <Search size={16} />
                  <input
                    aria-label="البحث عن منتج"
                    placeholder="ابحث عن منتج أو رابط…"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
                <label className="sr-only" htmlFor="product-filter">
                  حالة نشر المنتج
                </label>
                <select
                  id="product-filter"
                  value={filter}
                  style={{ width: 140 }}
                  onChange={e => setFilter(e.target.value)}
                >
                  <option value="all">جميع المنتجات</option>
                  <option value="published">منشورة</option>
                  <option value="draft">مسودات</option>
                </select>
                <span className="results-count">{visible.length} منتج</span>
              </div>
              <div className="product-grid">
                {visible.map(p => (
                  <article className="product-card" key={p.slug}>
                    <div className="product-card-image">
                      <Thumbnail
                        key={p.draft.images[0]?.src}
                        src={p.draft.images[0]?.src}
                        alt={p.draft.images[0]?.alt || p.draft.name}
                      />
                    </div>
                    <div className="product-card-body">
                      <div className="product-card-title">
                        <h2>{p.draft.name}</h2>
                        <span
                          className={
                            "status-badge " +
                            (p.published ? "success" : "muted")
                          }
                        >
                          <i />
                          {p.published ? "منشور" : "مسودة"}
                        </span>
                      </div>
                      <span className="mono">{productUrl(p.slug)}</span>
                      <div className="product-card-bottom">
                        <span className="order-amount">
                          {p.draft.price.toLocaleString()} <small>دج</small>
                        </span>
                        <button
                          type="button"
                          className="btn small"
                          disabled={busy}
                          onClick={() => void edit(p.slug)}
                        >
                          إدارة المنتج
                          <ArrowUpLeft size={13} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {visible.length === 0 && (
                <section className="panel empty-state">
                  <Package size={32} />
                  <h2>لا توجد منتجات مطابقة</h2>
                  <p>غيّر البحث أو أضف منتجًا جديدًا.</p>
                </section>
              )}
            </>
          ) : (
            <>
              <div className="editor-layout">
                <div>
                  <div className="section-tabs" aria-label="أقسام محرر المنتج">
                    {tabs.map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={section === id ? "active" : ""}
                        aria-pressed={section === id}
                        onClick={() => setSection(id)}
                      >
                        {label}
                        {((id === "basic" &&
                          (editor.fieldErrors.name ||
                            editor.fieldErrors.slug)) ||
                          (id === "images" && editor.fieldErrors.images) ||
                          (id === "offers" && editor.fieldErrors.bundles) ||
                          (id === "advanced" &&
                            editor.fieldErrors.tracking)) && (
                          <span className="alert-dot" />
                        )}
                      </button>
                    ))}
                  </div>
                  <fieldset disabled={busy}>
                    <ProductFields
                      section={section}
                      page={page}
                      change={editor.change}
                      slugLocked={Boolean(storedSlug)}
                      errors={editor.fieldErrors}
                    />
                  </fieldset>
                  {section === "advanced" && (
                    <>
                      <section className="panel">
                        <div className="panel-heading">
                          <div>
                            <h2>نسخ المنتج</h2>
                            <p>
                              ابدأ منتجًا آخر بنفس المحتوى وهوية Tracking جديدة.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn"
                          disabled={busy}
                          onClick={() => create(true)}
                        >
                          <Copy size={14} />
                          نسخ كمنتج جديد
                        </button>
                      </section>
                      <section className="panel">
                        <div className="panel-heading">
                          <div>
                            <h2>سجل النشر</h2>
                            <p>استرجاع نسخة يعيد المسودة للمراجعة قبل نشرها.</p>
                          </div>
                          <History size={18} />
                        </div>
                        {editor.revisions.length ? (
                          editor.revisions.map(r => (
                            <div className="work-item" key={r.revision}>
                              <p>النسخة {r.revision}</p>
                              <button
                                type="button"
                                className="btn small"
                                disabled={busy}
                                onClick={() => editor.restore(r.revision)}
                              >
                                استرجاع المسودة
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="muted">
                            لا توجد نسخ منشورة محفوظة بعد.
                          </p>
                        )}
                      </section>
                    </>
                  )}
                </div>
                <aside className="editor-aside">
                  <h3>ملخص المنتج</h3>
                  <div className="editor-thumb">
                    <Thumbnail
                      key={page.images[0]?.src}
                      src={page.images[0]?.src}
                      alt={page.images[0]?.alt || page.name}
                    />
                  </div>
                  <h3>{page.name || "منتج جديد"}</h3>
                  <p style={{ margin: "8px 0 12px" }}>
                    {(page.bundles?.[0]?.price || page.price).toLocaleString()}{" "}
                    دج
                  </p>
                  <span
                    className={
                      "status-badge " +
                      (currentIsPublished ? "success" : "warning")
                    }
                  >
                    <i />
                    {dirty
                      ? "تعديلات غير محفوظة"
                      : currentIsPublished
                        ? "النسخة المنشورة"
                        : "مسودة محفوظة"}
                  </span>
                  <p className="muted">رابط الصفحة</p>
                  <span className="mono">{productUrl(page.slug)}</span>
                  {stored?.published && (
                    <a
                      className="text-link"
                      href={productUrl(stored.slug)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display: "block", fontSize: 11, marginTop: 14 }}
                    >
                      عرض المنشور
                      <ArrowUpLeft size={12} style={{ display: "inline" }} />
                    </a>
                  )}
                </aside>
              </div>
              <footer className="editor-footer">
                <span>
                  {dirty
                    ? "توجد تعديلات غير محفوظة"
                    : currentIsPublished
                      ? "هذه النسخة منشورة للعملاء"
                      : "المسودة محفوظة وجاهزة للمعاينة"}
                </span>
                <div className="toolbar">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={save}
                  >
                    {busy ? "جارٍ التنفيذ…" : "حفظ المسودة"}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={
                      busy ||
                      dirty ||
                      !stored ||
                      stored.virtual ||
                      currentIsPublished
                    }
                    onClick={editor.publish}
                  >
                    نشر المنتج
                  </button>
                </div>
              </footer>
            </>
          )}
        </>
      )}
    </AdminShell>
  );
}
