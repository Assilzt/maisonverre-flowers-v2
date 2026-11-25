import { invalidateByTag } from "@vercel/functions";

/** CDN cache tags for server-rendered landing pages. */
export const pageCacheTag = (slug: string) => "page-" + slug;
export const STOREFRONT_CACHE_TAG = "storefront";

/** Purges cached landing pages on Vercel; a no-op elsewhere. Never throws. */
export async function purgeCache(tags: string | string[]) {
  try {
    await invalidateByTag(tags);
  } catch (error) {
    console.error(
      "Cache purge",
      error instanceof Error ? error.message : "unknown"
    );
  }
}
