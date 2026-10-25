import { DEFAULT_PRODUCT, type ProductLandingConfig } from "@shared/catalog";

export type StoredProduct = {
  slug: string;
  draft: ProductLandingConfig;
  published: ProductLandingConfig | null;
  revision: number;
  virtual?: boolean;
};

export function newProduct(): ProductLandingConfig {
  const slug = "product-" + crypto.randomUUID().slice(0, 8);
  return {
    slug,
    name: "",
    shortName: "",
    headline: "",
    subheadline: "",
    description: "",
    price: 1900,
    currency: "دج",
    bundles: [{ quantity: 1, price: 1900, label: "طلب واحد" }],
    images: [{ src: "", alt: "", label: "" }],
    features: [],
    trustBadges: ["الدفع عند الاستلام", "نتصل قبل الشحن"],
    resultEyebrow: "",
    resultTitle: "",
    resultDescription: "",
    sections: {
      features: false,
      results: false,
      trust: true,
      description: true,
    },
    sectionOrder: ["image", "features", "results", "trust"],
    tracking: { contentId: "maisonverre-" + slug, campaignName: "" },
  };
}

export function productUrl(slug: string) {
  return slug === DEFAULT_PRODUCT.slug ? "/" : "/p/" + encodeURIComponent(slug);
}
