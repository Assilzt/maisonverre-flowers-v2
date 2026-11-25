import { sql } from "./connection.js";

export type ShippingProvider = {
  kind?: "ecotrack" | "osen";
  merchantId?: string;
  storeId?: string;
  id: string;
  name: string;
  provider: string;
  token: string;
  deliveryFees: Record<string, { home: number; stopDesk: number }>;
};

export const loadMetaPixelId = async () => {
  const rows =
    (await sql!`SELECT value FROM atlasio_settings WHERE key = 'meta_pixel_id' LIMIT 1`) as Array<{
      value: string;
    }>;
  return String(rows[0]?.value || "").trim();
};

export type CapiSettings = {
  pixelId: string;
  token: string;
  testEventCode: string;
  enabled: boolean;
};
let capiCache: { expires: number; value: CapiSettings } | null = null;
export const invalidateCapiSettings = () => {
  capiCache = null;
};
/** Conversions API settings. Server-only: the token never leaves the server. */
export const loadCapiSettings = async (): Promise<CapiSettings> => {
  if (capiCache && capiCache.expires > Date.now()) return capiCache.value;
  const rows =
    (await sql!`SELECT key, value FROM atlasio_settings WHERE key IN ('meta_pixel_id', 'meta_capi_token', 'meta_test_event_code')`) as Array<{
      key: string;
      value: string;
    }>;
  const value = (key: string) =>
    String(rows.find(row => row.key === key)?.value || "").trim();
  const pixelId = value("meta_pixel_id"),
    token = value("meta_capi_token");
  const settings = {
    pixelId,
    token,
    testEventCode: value("meta_test_event_code"),
    enabled: /^\d{8,20}$/.test(pixelId) && Boolean(token),
  };
  capiCache = { expires: Date.now() + 30_000, value: settings };
  return settings;
};

export const loadEcoSettings = async (providerId?: string) => {
  const rows =
    (await sql!`SELECT key, value FROM atlasio_settings WHERE key IN ('ecotrack_provider', 'ecotrack_token', 'delivery_fees', 'shipping_providers', 'active_provider_id', 'shipping_mode')`) as Array<{
      key: string;
      value: string;
    }>;
  const values = Object.fromEntries(rows.map(row => [row.key, row.value]));
  let legacyFees: Record<string, { home: number; stopDesk: number }> = {};
  try {
    legacyFees = JSON.parse(values.delivery_fees || "{}") as Record<
      string,
      { home: number; stopDesk: number }
    >;
  } catch {
    legacyFees = {};
  }
  let providers: ShippingProvider[] = [];
  try {
    providers = JSON.parse(
      values.shipping_providers || "[]"
    ) as ShippingProvider[];
  } catch {
    providers = [];
  }
  if (
    !providers.length &&
    (values.ecotrack_provider || process.env.ECOTRACK_PROVIDER)
  )
    providers = [
      {
        id: "default",
        name: values.ecotrack_provider || "EcoTrack",
        provider:
          values.ecotrack_provider ||
          process.env.ECOTRACK_PROVIDER ||
          "navexdelivery",
        token: values.ecotrack_token || process.env.ECOTRACK_API_TOKEN || "",
        deliveryFees: legacyFees,
      },
    ];
  if (process.env.OSEN_API_TOKEN && !providers.some(p => p.id === "osen-env"))
    providers.push({
      id: "osen-env",
      name: "Osen Express",
      kind: "osen",
      provider: "osen-express",
      token: process.env.OSEN_API_TOKEN,
      merchantId: process.env.OSEN_MERCHANT_ID || "",
      storeId: process.env.OSEN_STORE_ID || "",
      deliveryFees: {},
    });
  if (providerId && !providers.some(item => item.id === providerId))
    throw new Error("حساب شركة التوصيل المرتبط غير متاح؛ أعد ربط الحساب");
  const selected =
    providers.find(item => item.id === providerId) ||
    providers.find(item => item.id === values.active_provider_id) ||
    providers[0];
  return {
    kind: selected?.kind || "ecotrack",
    merchantId: selected?.merchantId,
    storeId: selected?.storeId,
    provider:
      selected?.provider || process.env.ECOTRACK_PROVIDER || "navexdelivery",
    token: selected?.token || process.env.ECOTRACK_API_TOKEN || "",
    deliveryFees: selected?.deliveryFees || legacyFees,
    providerId: selected?.id || "default",
    providerName: selected?.name || selected?.provider || "EcoTrack",
    shippingMode:
      values.shipping_mode === "without_stock" ? "without_stock" : "stock",
    providers,
  };
};

export const publicProviders = (providers: ShippingProvider[]) =>
  providers.map(
    ({
      id,
      name,
      provider,
      deliveryFees,
      token,
      kind,
      merchantId,
      storeId,
    }) => ({
      kind: kind || "ecotrack",
      merchantId,
      storeId,
      id,
      name,
      provider,
      deliveryFees,
      tokenConfigured: Boolean(token),
    })
  );
