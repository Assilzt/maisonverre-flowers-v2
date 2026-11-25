import { useRef, useState, type DragEvent } from "react";
import { ArrowRight, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import type { ProductImage } from "@shared/catalog";
import { api } from "@/services/api";
import "@/styles/ops.css";

const MAX_SIDE = 1600;
const MAX_IMAGES = 10;

/** Shrinks a photo in the browser to WebP (max 1600 px) before upload. */
async function compress(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      b => (b ? resolve(b) : reject(new Error("تعذر تجهيز الصورة"))),
      "image/webp",
      0.85
    )
  );
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة"));
    reader.readAsDataURL(blob);
  });
  return { type: blob.type || "image/webp", data };
}

/** Product photos: upload by button or drag and drop, reorder, delete. */
export function ImageUploader({
  images,
  productName,
  onChange,
}: {
  images: ProductImage[];
  productName: string;
  onChange: (images: ProductImage[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const list = images.filter(image => image.src);

  const upload = async (files: FileList | File[]) => {
    setError("");
    const picked = Array.from(files)
      .filter(file => file.type.startsWith("image/"))
      .slice(0, MAX_IMAGES - list.length);
    if (!picked.length) {
      setError(
        list.length >= MAX_IMAGES
          ? "الحد الأقصى 10 صور"
          : "اختر ملفات صور (JPG أو PNG أو WebP)"
      );
      return;
    }
    setBusy(picked.length);
    let next = [...list];
    for (const file of picked) {
      try {
        const body = await compress(file);
        const { src } = await api<{ src: string }>("/api/media", body);
        next = [
          ...next,
          { src, alt: productName || file.name, label: productName || "" },
        ];
        onChange(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "تعذر رفع الصورة");
      } finally {
        setBusy(n => n - 1);
      }
    }
  };
  const move = (from: number, to: number) => {
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  const drop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void upload(event.dataTransfer.files);
  };

  return (
    <div className="ops uploader">
      <div
        className={"uploader-drop" + (dragging ? " is-dragging" : "")}
        onDragOver={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={drop}
      >
        <span className="uploader-icon" aria-hidden="true">
          <ImagePlus size={26} />
        </span>
        <strong>اسحب الصور هنا أو</strong>
        <button
          type="button"
          className="ops-btn primary"
          disabled={busy > 0 || list.length >= MAX_IMAGES}
          onClick={() => input.current?.click()}
        >
          {busy > 0 ? (
            <>
              <Loader2 size={17} className="ops-spin" />
              جارٍ الرفع… ({busy})
            </>
          ) : (
            "اختر صورًا من جهازك"
          )}
        </button>
        <small>
          JPG أو PNG أو WebP · تُصغَّر تلقائيًا · حتى {MAX_IMAGES} صور
        </small>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={event => {
            if (event.target.files) void upload(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="uploader-error">
          {error}
        </p>
      )}
      {list.length > 0 && (
        <ul className="uploader-grid">
          {list.map((image, index) => (
            <li key={image.src + index}>
              <img src={image.src} alt={image.alt} />
              {index === 0 && (
                <span className="uploader-main">
                  <Star size={12} /> الرئيسية
                </span>
              )}
              <div className="uploader-tools">
                {index > 0 && (
                  <button
                    type="button"
                    aria-label="اجعلها قبل الصورة السابقة"
                    title="تقديم"
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowRight size={15} />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="حذف الصورة"
                  title="حذف"
                  onClick={() => onChange(list.filter((_, i) => i !== index))}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
