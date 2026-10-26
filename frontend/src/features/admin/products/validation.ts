import type { ProductLandingConfig } from "@shared/catalog";
export type ProductErrors = Partial<
  Record<"slug" | "name" | "images" | "bundles" | "tracking", string>
>;
export function validateProductForm(page: ProductLandingConfig): ProductErrors {
  const errors: ProductErrors = {};
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(page.slug) || page.slug.length > 80)
    errors.slug =
      "استخدم حروفًا إنجليزية صغيرة وأرقامًا وشرطات، بحد أقصى 80 حرفًا.";
  if (!page.name.trim() || page.name.length > 160)
    errors.name = "أدخل اسم المنتج، بحد أقصى 160 حرفًا.";
  if (
    !page.images.length ||
    page.images.length > 10 ||
    page.images.some(
      i => !i.src.startsWith("/images/") && !/^https:\/\//.test(i.src)
    )
  )
    errors.images =
      "أضف صورة واحدة على الأقل عبر HTTPS أو مسار /images/ صحيح، بحد أقصى 10 صور.";
  const bundles = page.bundles || [];
  if (
    !bundles.length ||
    bundles.length > 6 ||
    bundles.some(
      b =>
        !Number.isInteger(b.quantity) ||
        b.quantity < 1 ||
        b.quantity > 100 ||
        !Number.isInteger(b.price) ||
        b.price < 1 ||
        !b.label.trim()
    ) ||
    new Set(bundles.map(b => b.quantity)).size !== bundles.length
  )
    errors.bundles =
      "أضف من عرض إلى 6 عروض. كل عرض يحتاج كمية مختلفة من 1 إلى 100، وسعرًا صحيحًا موجبًا وعنوانًا.";
  if (!page.tracking.contentId.trim())
    errors.tracking = "أدخل Tracking Content ID لهذا المنتج.";
  return errors;
}
