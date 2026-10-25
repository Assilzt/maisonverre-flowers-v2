import { sql } from "./connection.js";

export type ShippingProvider = {
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
  if (providerId && !providers.some(item => item.id === providerId))
    throw new Error("حساب شركة التوصيل المرتبط غير متاح؛ أعد ربط الحساب");
  const selected =
    providers.find(item => item.id === providerId) ||
    providers.find(item => item.id === values.active_provider_id) ||
    providers[0];
  return {
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
  providers.map(({ id, name, provider, deliveryFees, token }) => ({
    id,
    name,
    provider,
    deliveryFees,
    tokenConfigured: Boolean(token),
  }));
