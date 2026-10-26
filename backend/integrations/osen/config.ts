// Official OpenAPI: https://backendmain.osenexpress.com/api-json
// Osen publishes a dedicated EcoTrack v1 compatibility API at this fixed origin.
export const OSEN_ORIGIN = "https://backendmain.osenexpress.com";
export const OSEN_COMPAT_BASE = OSEN_ORIGIN + "/api/v1";
export const OSEN_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
export type OsenIdentity = {
  token?: string | null;
  merchantId?: string | null;
  storeId?: string | null;
};
export function osenHeaders(settings: OsenIdentity) {
  if (!settings.token?.trim())
    throw new Error("أدخل API Key الخاص بـ Osen Express");
  if (
    !OSEN_ID_PATTERN.test(settings.merchantId || "") ||
    !OSEN_ID_PATTERN.test(settings.storeId || "")
  )
    throw new Error("أدخل Merchant ID وStore ID الصحيحين لحساب Osen");
  return {
    Authorization: "Bearer " + settings.token.trim(),
    "X-Api-Id": settings.merchantId!,
    "Content-Type": "application/json",
  };
}
