import { useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  DEFAULT_PRODUCT,
  type ProductGuideStep,
  type ProductLandingConfig,
} from "@shared/catalog";
import { api } from "@/services/api";
import { compress } from "./ImageUploader";

/** Planting guide steps: title, short text and one photo each. */
export function GuideEditor({
  page,
  onChange,
}: {
  page: ProductLandingConfig;
  onChange: (guide: ProductGuideStep[]) => void;
}) {
  const steps =
    page.guide ??
    (page.slug === DEFAULT_PRODUCT.slug ? DEFAULT_PRODUCT.guide || [] : []);
  const [busy, setBusy] = useState(-1);
  const [error, setError] = useState("");
  const update = (index: number, patch: Partial<ProductGuideStep>) =>
    onChange(
      steps.map((step, i) => (i === index ? { ...step, ...patch } : step))
    );
  const upload = async (index: number, file?: File) => {
    if (!file) return;
    setBusy(index);
    setError("");
    try {
      const { src } = await api<{ src: string }>(
        "/api/media",
        await compress(file)
      );
      update(index, { image: src });
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر رفع الصورة");
    } finally {
      setBusy(-1);
    }
  };
  return (
    <>
      <div className="panel-heading">
        <h2>دليل الزراعة</h2>
        <button
          type="button"
          className="btn small"
          disabled={steps.length >= 8}
          onClick={() => onChange([...steps, { title: "", text: "" }])}
        >
          <Plus size={14} />
          إضافة خطوة
        </button>
      </div>
      <p className="muted" style={{ marginBottom: 12 }}>
        يظهر أسفل استمارة الطلب. صور صغيرة وهادئة تطمئن الزبون أن الزراعة سهلة.
      </p>
      {error && <p className="notice error">{error}</p>}
      {steps.map((step, index) => (
        <div className="collection-item" key={index}>
          <div className="collection-heading">
            <span>الخطوة {index + 1}</span>
            <button
              type="button"
              className="icon-button"
              aria-label={"حذف الخطوة " + (index + 1)}
              onClick={() => onChange(steps.filter((_, i) => i !== index))}
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="collection-fields">
            <label>
              العنوان
              <input
                value={step.title}
                onChange={e => update(index, { title: e.target.value })}
              />
            </label>
            <label>
              النص
              <input
                value={step.text}
                onChange={e => update(index, { text: e.target.value })}
              />
            </label>
            <div className="toolbar">
              {step.image ? (
                <>
                  <img
                    src={step.image}
                    alt=""
                    width={64}
                    height={64}
                    style={{ borderRadius: 12, objectFit: "cover" }}
                  />
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => update(index, { image: "" })}
                  >
                    <X size={14} />
                    إزالة الصورة
                  </button>
                </>
              ) : (
                <label className="btn small" style={{ cursor: "pointer" }}>
                  {busy === index ? (
                    <Loader2 size={14} className="ops-spin" />
                  ) : (
                    <ImagePlus size={14} />
                  )}
                  رفع صورة
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={e => {
                      void upload(index, e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
