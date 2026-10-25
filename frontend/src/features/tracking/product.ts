import type { ProductLandingConfig } from "@shared/catalog";
export * from "@shared/catalog";

export function getProductCampaignLabel(
  product: ProductLandingConfig,
  price: number,
  isLimitedOffer: boolean
): string {
  if (isLimitedOffer && price === product.price) return "عرض محدود";
  if (product.compareAtPrice && price === product.compareAtPrice)
    return "السعر العادي";
  return product.tracking.campaignName;
}

export function getProductEventData(
  product: ProductLandingConfig,
  price: number
): Record<string, unknown> {
  return {
    content_name: product.name,
    content_ids: [product.tracking.contentId],
    content_type: "product",
    value: price,
    // Meta Pixel expects an ISO 4217 code; keep product.currency (دج) for display only.
    currency: "DZD",
  };
}

export function getProductPurchaseEventData(
  product: ProductLandingConfig,
  price: number
): Record<string, unknown> {
  const { currency: _currency, ...purchaseData } = getProductEventData(
    product,
    price
  );
  // Meta rejects DZD for Purchase in the browser Pixel. Keep the amount and
  // product data, but omit only the invalid currency parameter for this event.
  return purchaseData;
}

export function getProductStoragePrefix(product: ProductLandingConfig): string {
  return `maisonverre:${product.slug}`;
}

export function getProductSessionLeadId(product: ProductLandingConfig): string {
  const storageKey = `${getProductStoragePrefix(product)}:lead-id:active-form-draft`;
  try {
    const existingId = window.sessionStorage.getItem(storageKey);
    if (existingId) return existingId;
    const leadId = `AT-${crypto.randomUUID()}`;
    window.sessionStorage.setItem(storageKey, leadId);
    return leadId;
  } catch {
    return `AT-${crypto.randomUUID()}`;
  }
}

export function resetProductSessionLeadId(product: ProductLandingConfig): void {
  try {
    window.sessionStorage.removeItem(
      `${getProductStoragePrefix(product)}:lead-id:active-form-draft`
    );
  } catch {
    // Starting a new form still works when session storage is unavailable.
  }
}

export function getPixelStorageKey(
  product: ProductLandingConfig,
  dedupeKey: string
): string {
  return `${getProductStoragePrefix(product)}:pixel:${dedupeKey}`;
}
