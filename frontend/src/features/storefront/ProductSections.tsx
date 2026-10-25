import type { ProductLandingConfig } from "@shared/catalog";
import { ProductImage } from "./ProductImage";
export function ProductSections({
  product,
}: {
  product: ProductLandingConfig;
}) {
  return (
    <>
      {(product.sectionOrder || ["image", "features", "results", "trust"]).map(
        section => {
          if (section === "image")
            return (
              <div
                key={section}
                className="order-1 md:order-none flex justify-center items-start sticky top-8 flower-image-column"
              >
                <ProductImage images={product.images} />
              </div>
            );
          if (section === "features" && product.sections?.features)
            return (
              <section key={section} className="flower-features-grid" dir="rtl">
                {product.features.map((feature, i) => (
                  <article key={i} className="flower-feature-item">
                    <span>{feature.emoji}</span>
                    <strong>{feature.name}</strong>
                    <p>{feature.details}</p>
                  </article>
                ))}
              </section>
            );
          if (section === "results" && product.sections?.results)
            return (
              <section key={section} dir="rtl">
                <p>{product.resultEyebrow}</p>
                <h2 className="text-xl font-bold">{product.resultTitle}</h2>
                <p>{product.resultDescription}</p>
              </section>
            );
          if (section === "trust" && product.sections?.trust !== false)
            return (
              <div key={section} className="flower-features-grid" dir="rtl">
                {product.trustBadges.map((badge, i) => (
                  <div className="flower-feature-item" key={i}>
                    <span aria-hidden="true">{["🌼", "🌱", "📦"][i % 3]}</span>
                    <strong>{badge}</strong>
                  </div>
                ))}
              </div>
            );
          return null;
        }
      )}
    </>
  );
}
