/** Delivery fee row as served by `/api/orders?resource=fees`. */
export type DeliveryFeeRow = {
  wilaya_id: number | string;
  tarif: number;
  tarif_stopdesk?: number;
};

/**
 * Public, non-secret values the server embeds in the page so the browser
 * does not need extra API round trips before the visitor can order.
 */
export type StorefrontConfig = {
  pixelId?: string;
  fees?: DeliveryFeeRow[];
};

export const STOREFRONT_CONFIG_ID = "storefront-config";

export function readEmbeddedStorefront(): StorefrontConfig {
  if (typeof document === "undefined") return {};
  try {
    const value = JSON.parse(
      document.getElementById(STOREFRONT_CONFIG_ID)?.textContent || "null"
    );
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}
