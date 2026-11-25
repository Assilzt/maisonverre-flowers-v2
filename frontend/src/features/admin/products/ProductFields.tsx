import { ArrowUp, Trash2, Plus } from "lucide-react";
import { DEFAULT_PRODUCT, type ProductLandingConfig } from "@shared/catalog";
import type { ProductErrors } from "./validation";
import { ImageUploader } from "./ImageUploader";
import { GuideEditor } from "./GuideEditor";
export type ProductSection =
  "basic" | "images" | "offers" | "content" | "advanced";
type Props = {
  page: ProductLandingConfig;
  slugLocked: boolean;
  section: ProductSection;
  errors: ProductErrors;
  change: <K extends keyof ProductLandingConfig>(
    key: K,
    value: ProductLandingConfig[K]
  ) => void;
};
function Collection<T extends object>({
  title,
  items,
  fields,
  template,
  onChange,
}: {
  title: string;
  items: T[];
  fields: Array<{ key: keyof T; label: string; type?: string }>;
  template: T;
  onChange: (items: T[]) => void;
}) {
  return (
    <>
      <div className="panel-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="btn small"
          onClick={() => onChange([...items, structuredClone(template)])}
        >
          <Plus size={14} />
          إضافة
        </button>
      </div>
      {items.map((item, i) => (
        <div className="collection-item" key={i}>
          <div className="collection-heading">
            <span>
              {title} · {i + 1}
            </span>
            <div className="toolbar">
              <button
                type="button"
                className="icon-button"
                aria-label={"نقل " + title + " " + (i + 1) + " للأعلى"}
                disabled={!i}
                onClick={() => {
                  const next = [...items];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={"حذف " + title + " " + (i + 1)}
                onClick={() => onChange(items.filter((_, n) => n !== i))}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div className="collection-fields">
            {fields.map(({ key, label, type }) => (
              <label key={String(key)}>
                {label}
                <input
                  aria-label={`${title}: ${label} ${i + 1}`}
                  type={
                    type || (typeof item[key] === "number" ? "number" : "text")
                  }
                  min={typeof item[key] === "number" ? 1 : undefined}
                  value={String(item[key] ?? "")}
                  onChange={e =>
                    onChange(
                      items.map((v, n) =>
                        n === i
                          ? {
                              ...v,
                              [key]:
                                typeof item[key] === "number"
                                  ? Number(e.target.value)
                                  : e.target.value,
                            }
                          : v
                      )
                    )
                  }
                />
              </label>
            ))}
          </div>
        </div>
      ))}
      {!items.length && (
        <p className="muted">لا توجد عناصر بعد. اضغط إضافة للبدء.</p>
      )}
    </>
  );
}
export function ProductFields({
  page,
  change,
  slugLocked,
  section,
  errors,
}: Props) {
  const text = (
    key:
      | "name"
      | "shortName"
      | "headline"
      | "subheadline"
      | "description"
      | "resultEyebrow"
      | "resultTitle"
      | "resultDescription",
    label: string,
    multiline = false
  ) => {
    const error = key === "name" ? errors.name : undefined;
    return (
      <label className={multiline ? "field-wide" : ""}>
        {label}
        {multiline ? (
          <textarea
            value={page[key]}
            onChange={e => change(key, e.target.value)}
          />
        ) : (
          <input
            aria-invalid={Boolean(error)}
            value={page[key]}
            onChange={e => change(key, e.target.value)}
          />
        )}
        {error && <span className="field-error">{error}</span>}
      </label>
    );
  };
  if (section === "basic")
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>البيانات الأساسية</h2>
            <p>اسم المنتج والرابط الذي سيفتحه العميل</p>
          </div>
        </div>
        <div className="form-grid">
          {text("name", "اسم المنتج")}
          {text("shortName", "الاسم المختصر")}
          <label className="field-wide">
            رابط المنتج — Slug
            <input
              dir="ltr"
              aria-invalid={Boolean(errors.slug)}
              value={page.slug}
              disabled={slugLocked}
              onChange={e =>
                change(
                  "slug",
                  e.target.value.toLowerCase().replace(/\s+/g, "-")
                )
              }
            />
            <span className={errors.slug ? "field-error" : "field-help"}>
              {errors.slug ||
                "حروف إنجليزية صغيرة وأرقام وشرطات. يُثبّت بعد أول حفظ."}
            </span>
          </label>
          {text("description", "وصف المنتج", true)}
        </div>
      </section>
    );
  if (section === "images")
    return (
      <section className="panel">
        {errors.images && (
          <p role="alert" className="notice error">
            {errors.images}
          </p>
        )}
        <h2 style={{ marginBottom: 12 }}>صور المنتج</h2>
        <ImageUploader
          images={page.images}
          productName={page.name}
          onChange={v => change("images", v)}
        />
        <p className="muted" style={{ marginTop: 14 }}>
          الصورة الأولى هي الصورة الرئيسية في صفحة المنتج.
        </p>
      </section>
    );
  if (section === "offers")
    return (
      <section className="panel">
        {errors.bundles && (
          <p role="alert" className="notice error">
            {errors.bundles}
          </p>
        )}
        <Collection
          title="العروض"
          items={page.bundles || []}
          fields={[
            { key: "quantity", label: "عدد الطلبات" },
            { key: "price", label: "السعر الإجمالي بالدينار" },
            { key: "label", label: "عنوان العرض" },
          ]}
          template={{
            quantity:
              Math.max(0, ...(page.bundles || []).map(b => b.quantity)) + 1,
            price: page.bundles?.[0]?.price || page.price,
            label: "عرض جديد",
          }}
          onChange={v => change("bundles", v)}
        />
        <label style={{ marginTop: 14 }}>
          العرض المحدد عند فتح الصفحة
          <select
            value={page.defaultBundleQuantity ?? ""}
            onChange={e =>
              change(
                "defaultBundleQuantity",
                Number(e.target.value) || undefined
              )
            }
          >
            <option value="">العرض الأول</option>
            {(page.bundles || []).map(bundle => (
              <option key={bundle.quantity} value={bundle.quantity}>
                {bundle.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ marginTop: 14 }}>
          عدد الأكياس في العلبة
          <input
            type="number"
            min={0}
            max={100}
            value={page.bagsPerPack ?? ""}
            placeholder="اتركه فارغًا لإخفاء سعر الكيس"
            onChange={e =>
              change("bagsPerPack", Number(e.target.value) || undefined)
            }
          />
        </label>
        <div className="detail-section">
          <h3>إعداد التوصيل</h3>
          <label style={{ marginTop: 14 }}>
            توصيل مجاني ابتداءً من عدد
            <input
              type="number"
              min="1"
              value={page.freeShippingQuantity || ""}
              placeholder="اتركه فارغًا لتعطيل التوصيل المجاني"
              onChange={e =>
                change(
                  "freeShippingQuantity",
                  Number(e.target.value) || undefined
                )
              }
            />
            <span className="field-help">
              السعر الأساسي يؤخذ من العرض الأول. اكتب السعر الإجمالي للباقة،
              وليس سعر الوحدة.
            </span>
          </label>
        </div>
      </section>
    );
  if (section === "advanced")
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>هوية التتبع</h2>
            <p>معرّفات المحتوى لهذا المنتج</p>
          </div>
        </div>
        {page.slug === DEFAULT_PRODUCT.slug && (
          <p className="notice">
            هوية محتوى الزهور الأصلية محمية ولا تتغير من المحرر.
          </p>
        )}
        <div className="form-grid">
          <label>
            Tracking Content ID
            <input
              aria-invalid={Boolean(errors.tracking)}
              dir="ltr"
              disabled={page.slug === DEFAULT_PRODUCT.slug}
              value={page.tracking.contentId}
              onChange={e =>
                change("tracking", {
                  ...page.tracking,
                  contentId: e.target.value,
                })
              }
            />
            {errors.tracking && (
              <span className="field-error">{errors.tracking}</span>
            )}
          </label>
          <label>
            Campaign Name
            <input
              disabled={page.slug === DEFAULT_PRODUCT.slug}
              value={page.tracking.campaignName}
              onChange={e =>
                change("tracking", {
                  ...page.tracking,
                  campaignName: e.target.value,
                })
              }
            />
            <span className="field-help">
              يُستخدم اسم المنتج إذا تركته فارغًا.
            </span>
          </label>
        </div>
      </section>
    );
  const labels = {
    image: "الصورة الرئيسية",
    features: "المزايا",
    results: "تفاصيل المنتج",
    trust: "شارات الثقة",
  };
  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>محتوى صفحة الهبوط</h2>
            <p>عدّل النصوص داخل قالب صفحة الزهور الحالي</p>
          </div>
        </div>
        <div className="form-grid">
          {text("headline", "عنوان صفحة الهبوط")}
          {text("subheadline", "العنوان الفرعي")}
          {text("resultEyebrow", "عنوان المزايا القصير")}
          {text("resultTitle", "عنوان المزايا")}
          {text("resultDescription", "تفاصيل المزايا", true)}
        </div>
      </section>
      <section className="panel">
        <h2>ترتيب الأقسام وظهورها</h2>
        {(page.sectionOrder || ["image", "features", "results", "trust"]).map(
          (id, i) => (
            <div className="section-sort-row" key={id}>
              <span>{labels[id]}</span>
              <div className="toolbar">
                {id !== "image" && (
                  <label className="checkline">
                    <input
                      type="checkbox"
                      checked={page.sections?.[id] ?? id === "trust"}
                      onChange={e =>
                        change("sections", {
                          ...page.sections,
                          [id]: e.target.checked,
                        })
                      }
                    />
                    إظهار
                  </label>
                )}
                <button
                  type="button"
                  className="icon-button"
                  aria-label={"نقل " + labels[id] + " للأعلى"}
                  disabled={!i}
                  onClick={() => {
                    const order = [
                      ...(page.sectionOrder || [
                        "image",
                        "features",
                        "results",
                        "trust",
                      ]),
                    ] as NonNullable<ProductLandingConfig["sectionOrder"]>;
                    [order[i - 1], order[i]] = [order[i], order[i - 1]];
                    change("sectionOrder", order);
                  }}
                >
                  <ArrowUp size={14} />
                </button>
              </div>
            </div>
          )
        )}
        <label className="checkline" style={{ marginTop: 18 }}>
          <input
            type="checkbox"
            checked={page.sections?.description !== false}
            onChange={e =>
              change("sections", {
                ...page.sections,
                description: e.target.checked,
              })
            }
          />
          إظهار وصف المنتج
        </label>
      </section>
      <section className="panel">
        <Collection
          title="المزايا"
          items={page.features}
          fields={[
            { key: "name", label: "الميزة" },
            { key: "details", label: "التفاصيل" },
            { key: "emoji", label: "الرمز" },
          ]}
          template={{
            name: "ميزة",
            details: "",
            emoji: "🌿",
            accent: "bg-green-100",
            area: "",
          }}
          onChange={v => change("features", v)}
        />
      </section>
      <section className="panel">
        <GuideEditor page={page} onChange={v => change("guide", v)} />
      </section>
      <section className="panel">
        <Collection
          title="سؤال شائع"
          items={page.faq || []}
          fields={[
            { key: "question", label: "السؤال" },
            { key: "answer", label: "الجواب" },
          ]}
          template={{ question: "", answer: "" }}
          onChange={v => change("faq", v)}
        />
      </section>
      <section className="panel">
        <Collection
          title="رأي زبون"
          items={page.reviews || []}
          fields={[
            { key: "name", label: "الاسم" },
            { key: "place", label: "الولاية" },
            { key: "text", label: "الرأي" },
          ]}
          template={{ name: "", place: "", text: "" }}
          onChange={v => change("reviews", v)}
        />
        <p className="field-help">
          أضف آراء زبائن حقيقية فقط. يظهر القسم في الصفحة عند إضافة رأي واحد على
          الأقل.
        </p>
      </section>
      <section className="panel">
        <label>
          شارات الثقة — واحدة في كل سطر
          <textarea
            value={page.trustBadges.join("\n")}
            onChange={e =>
              change("trustBadges", e.target.value.split("\n").filter(Boolean))
            }
          />
        </label>
      </section>
    </>
  );
}
