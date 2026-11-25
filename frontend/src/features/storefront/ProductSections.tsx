import type { ProductLandingConfig } from "@shared/catalog";

/** Content sections shown below the order form, in the editor's order. */
export function ProductSections({
  product,
}: {
  product: ProductLandingConfig;
}) {
  const order = (
    product.sectionOrder || ["image", "features", "results", "trust"]
  ).filter(section => section === "features" || section === "results");
  return (
    <>
      {order.map(section => {
        if (
          section === "features" &&
          product.sections?.features &&
          product.features.length
        )
          return (
            <section
              key={section}
              className="mv-features"
              aria-labelledby="features-title"
            >
              <h2 id="features-title">ماذا ستحصل؟</h2>
              <ul>
                {product.features.map((feature, i) => (
                  <li key={i}>
                    <span className="mv-feature-icon" aria-hidden="true">
                      {feature.emoji}
                    </span>
                    <div>
                      <strong>{feature.name}</strong>
                      {feature.details && <p>{feature.details}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          );
        if (section === "results" && product.sections?.results)
          return (
            <section key={section} className="mv-results">
              {product.resultEyebrow && (
                <p className="mv-eyebrow">{product.resultEyebrow}</p>
              )}
              <h2>{product.resultTitle}</h2>
              <p>{product.resultDescription}</p>
            </section>
          );
        return null;
      })}
      {product.sections?.description !== false && product.description && (
        <section className="mv-about" aria-labelledby="about-title">
          <h2 id="about-title">عن المنتج</h2>
          <p>{product.description}</p>
        </section>
      )}
    </>
  );
}
