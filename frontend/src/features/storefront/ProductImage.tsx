import { useState } from "react";
import type { ProductLandingConfig } from "@shared/catalog";
export function ProductImage({
  images,
}: {
  images: ProductLandingConfig["images"];
}) {
  const [index, setIndex] = useState(0);
  const image = images[index] || images[0];
  if (!image) return null;
  const card = (
    <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl w-full max-w-xl">
      <img
        src={image.src}
        alt={image.alt}
        width={1254}
        height={1254}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        sizes="(max-width: 767px) calc(100vw - 2rem), 50vw"
        className="aspect-[4/3] w-full object-cover"
      />
      <div
        className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/65 to-transparent px-4 pb-4 pt-12 text-center text-white"
        dir="rtl"
      >
        <span className="text-sm font-bold">{image.label}</span>
      </div>
    </div>
  );
  if (images.length === 1) return card;
  return (
    <div className="flower-image-gallery w-full max-w-xl">
      {card}
      <div className="gallery-thumbnails flex gap-2 mt-3">
        {images.map((item, i) => (
          <button
            key={item.src + i}
            type="button"
            aria-label={"عرض الصورة " + (i + 1)}
            aria-pressed={index === i}
            onClick={() => setIndex(i)}
            className="rounded-xl overflow-hidden border"
          >
            <img
              src={item.src}
              alt={item.alt}
              width={72}
              height={72}
              loading="lazy"
              className="w-16 h-16 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
