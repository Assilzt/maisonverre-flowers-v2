import { z } from "zod";
import {
  DEFAULT_PRODUCT,
  type ProductLandingConfig,
} from "../../shared/catalog.js";
import { sql } from "../repositories/connection.js";
const imageUrl = z
  .string()
  .max(1500)
  .refine(
    v =>
      v.startsWith("/images/") ||
      /^\/api\/media\?id=[a-f0-9]{24}$/.test(v) ||
      /^https:\/\//.test(v),
    "Upload an image"
  );
export const pageSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(80),
  name: z.string().min(1).max(160),
  shortName: z.string().min(1).max(100),
  headline: z.string().min(1).max(300),
  subheadline: z.string().max(500),
  description: z.string().max(5000),
  price: z.number().int().positive(),
  compareAtPrice: z.number().int().positive().optional(),
  currency: z.literal("دج"),
  bundles: z
    .array(
      z.object({
        quantity: z.number().int().min(1).max(100),
        price: z.number().int().positive(),
        label: z.string().min(1).max(100),
      })
    )
    .min(1)
    .max(6),
  images: z
    .array(
      z.object({
        src: imageUrl,
        alt: z.string().max(300),
        label: z.string().max(160),
      })
    )
    .min(1)
    .max(10),
  features: z
    .array(
      z.object({
        name: z.string().max(160),
        emoji: z.string().max(20),
        accent: z.string().max(100),
        details: z.string().max(500),
        area: z.string().max(160),
      })
    )
    .max(12),
  trustBadges: z.array(z.string().max(160)).max(8),
  resultEyebrow: z.string().max(160),
  resultTitle: z.string().max(300),
  resultDescription: z.string().max(5000),
  tracking: z.object({
    contentId: z.string().min(1).max(160),
    campaignName: z.string().min(1).max(160),
  }),
  freeShippingQuantity: z.number().int().positive().optional(),
  defaultBundleQuantity: z.number().int().min(1).max(100).optional(),
  bagsPerPack: z.number().int().min(1).max(100).optional(),
  faq: z
    .array(
      z.object({
        question: z.string().min(1).max(300),
        answer: z.string().min(1).max(2000),
      })
    )
    .max(20)
    .optional(),
  guide: z
    .array(
      z.object({
        title: z.string().min(1).max(120),
        text: z.string().max(400),
        image: imageUrl.optional().or(z.literal("")),
      })
    )
    .max(8)
    .optional(),
  reviews: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        place: z.string().max(100),
        text: z.string().min(1).max(1000),
      })
    )
    .max(30)
    .optional(),
  sections: z
    .object({
      features: z.boolean().optional(),
      results: z.boolean().optional(),
      trust: z.boolean().optional(),
      description: z.boolean().optional(),
    })
    .optional(),
  sectionOrder: z
    .array(z.enum(["image", "features", "results", "trust"]))
    .length(4)
    .refine(v => new Set(v).size === 4)
    .optional(),
});
/** Drops half-filled FAQ and review rows instead of rejecting the save. */
function withoutEmptyRows(input: unknown) {
  if (!input || typeof input !== "object") return input;
  const page = { ...(input as Record<string, unknown>) };
  const filled = (row: unknown, keys: string[]) =>
    keys.every(key =>
      String((row as Record<string, unknown>)?.[key] ?? "").trim()
    );
  if (Array.isArray(page.faq))
    page.faq = page.faq.filter(row => filled(row, ["question", "answer"]));
  if (Array.isArray(page.guide))
    page.guide = page.guide.filter(row => filled(row, ["title"]));
  if (Array.isArray(page.reviews))
    page.reviews = page.reviews.filter(row => filled(row, ["name", "text"]));
  return page;
}
export function validatePage(input: unknown): ProductLandingConfig {
  const page = pageSchema.parse(withoutEmptyRows(input));
  if (new Set(page.bundles.map(b => b.quantity)).size !== page.bundles.length)
    throw new Error("Duplicate bundle quantities");
  page.price = page.bundles[0].price;
  if (
    page.defaultBundleQuantity !== undefined &&
    !page.bundles.some(b => b.quantity === page.defaultBundleQuantity)
  )
    delete page.defaultBundleQuantity;
  if (page.slug === DEFAULT_PRODUCT.slug)
    page.tracking = DEFAULT_PRODUCT.tracking;
  return page;
}
export async function publishedPage(
  slug = DEFAULT_PRODUCT.slug
): Promise<ProductLandingConfig | null> {
  if (sql) {
    const rows =
      await sql`SELECT published FROM mv_landing_pages WHERE slug=${slug}`;
    if (rows[0]?.published) return validatePage(rows[0].published);
  }
  return slug === DEFAULT_PRODUCT.slug ? DEFAULT_PRODUCT : null;
}
