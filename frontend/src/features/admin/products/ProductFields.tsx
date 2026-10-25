import { DEFAULT_PRODUCT, type ProductLandingConfig } from "@shared/catalog";

type Props = {
  page: ProductLandingConfig;
  slugLocked: boolean;
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
  fields: Array<{ key: keyof T; label: string }>;
  template: T;
  onChange: (items: T[]) => void;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {items.map((item, i) => (
        <div className="toolbar" key={i}>
          {fields.map(({ key, label }) => (
            <label key={String(key)}>
              {label}
              <input
                aria-label={`${title}: ${label} ${i + 1}`}
                type={typeof item[key] === "number" ? "number" : "text"}
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
          <button
            type="button"
            className="btn"
            disabled={!i}
            onClick={() => {
              const next = [...items];
              [next[i - 1], next[i]] = [next[i], next[i - 1]];
              onChange(next);
            }}
          >
            للأعلى
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={() => onChange(items.filter((_, n) => n !== i))}
          >
            حذف
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn"
        onClick={() => onChange([...items, structuredClone(template)])}
      >
        إضافة إلى {title}
      </button>
    </section>
  );
}
export function ProductFields({ page, change, slugLocked }: Props) {
  const labels = {
    name: "اسم المنتج",
    shortName: "الاسم المختصر",
    headline: "عنوان صفحة الهبوط",
    subheadline: "العنوان الفرعي",
    description: "وصف المنتج",
    resultEyebrow: "عنوان المزايا القصير",
    resultTitle: "عنوان المزايا",
    resultDescription: "تفاصيل المزايا",
  };
  const sections = {
    image: "صورة المنتج",
    features: "المزايا",
    results: "تفاصيل المنتج",
    trust: "شارات الثقة",
  };
  return (
    <>
      <section className="panel form-grid">
        <label>
          رابط المنتج — Slug
          <input
            dir="ltr"
            value={page.slug}
            disabled={slugLocked}
            onChange={e =>
              change("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
          />
          <span className="muted">
            حروف إنجليزية وأرقام وشرطات؛ يُثبّت بعد أول حفظ.
          </span>
        </label>
        <label>
          السعر الأساسي — من العرض الأول
          <input
            type="number"
            value={page.bundles?.[0]?.price || page.price}
            readOnly
          />
          <span className="muted">عدّل السعر من قسم العروض أدناه.</span>
        </label>
        {(Object.keys(labels) as Array<keyof typeof labels>).map(key => (
          <label key={key}>
            {labels[key]}
            <textarea
              value={page[key]}
              onChange={e => change(key, e.target.value)}
            />
          </label>
        ))}
        <label>
          توصيل مجاني ابتداءً من عدد
          <input
            type="number"
            min="1"
            placeholder="اتركه فارغًا لتعطيل التوصيل المجاني"
            value={page.freeShippingQuantity || ""}
            onChange={e =>
              change(
                "freeShippingQuantity",
                Number(e.target.value) || undefined
              )
            }
          />
        </label>
        <label>
          Tracking Content ID
          <input
            disabled={page.slug === DEFAULT_PRODUCT.slug}
            value={page.tracking.contentId}
            onChange={e =>
              change("tracking", {
                ...page.tracking,
                contentId: e.target.value,
              })
            }
          />
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
        </label>
      </section>
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
          price: page.price,
          label: "عرض جديد",
        }}
        onChange={v => change("bundles", v)}
      />
      <p className="muted">
        الصور: أدخل رابط صورة HTTPS أو مسار صورة موجود داخل /images/. لا تُرفع
        ملفات جديدة إلى التخزين من هذه الشاشة.
      </p>
      <Collection
        title="الصور"
        items={page.images}
        fields={[
          { key: "src", label: "رابط الصورة" },
          { key: "alt", label: "وصف الصورة" },
          { key: "label", label: "عنوان الصورة" },
        ]}
        template={{ src: "", alt: "", label: "" }}
        onChange={v => change("images", v)}
      />
      <section className="panel">
        <h2>الأقسام وترتيبها</h2>
        {(page.sectionOrder || ["image", "features", "results", "trust"]).map(
          (section, i) => (
            <div className="toolbar" key={section}>
              <strong>{sections[section]}</strong>
              {section !== "image" && (
                <label className="checkline">
                  <input
                    type="checkbox"
                    checked={page.sections?.[section] ?? section === "trust"}
                    onChange={e =>
                      change("sections", {
                        ...page.sections,
                        [section]: e.target.checked,
                      })
                    }
                  />
                  إظهار
                </label>
              )}
              <button
                type="button"
                className="btn"
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
                للأعلى
              </button>
            </div>
          )
        )}
        <label className="checkline">
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
