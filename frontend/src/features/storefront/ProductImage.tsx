import { useState } from "react";
import {
  IMAGE_SIZES,
  IMAGE_VARIANTS,
  type ProductLandingConfig,
} from "@shared/catalog";
export function ProductImage({
  images,
}: {
  images: ProductLandingConfig["images"];
}) {
  const [index, setIndex] = useState(0);
  const image = images[index] || images[0];
  if (!image) return null;
  const srcSet = IMAGE_VARIANTS[image.src];
  return (
    <div className="mv-gallery">
      <img
        src={image.src}
        srcSet={srcSet}
        sizes={srcSet ? IMAGE_SIZES : undefined}
        alt={image.alt}
        width={1254}
        height={1254}
        loading="eager"
        fetchPriority={index === 0 ? "high" : "auto"}
        decoding="async"
        className="mv-gallery-main"
      />
      {images.length > 1 && (
        <div className="mv-thumbs">
          {images.map((item, i) => (
            <button
              key={item.src + i}
              type="button"
              aria-label={"عرض الصورة " + (i + 1)}
              aria-pressed={index === i}
              onClick={() => setIndex(i)}
            >
              <img
                src={item.src}
                alt=""
                width={64}
                height={64}
                loading="lazy"
                decoding="async"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
