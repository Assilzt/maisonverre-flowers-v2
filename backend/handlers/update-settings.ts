import { z } from "zod";
import {
  sql,
  loadEcoSettings,
  loadMetaPixelId,
  loadCapiSettings,
  invalidateCapiSettings,
  publicProviders,
  type Request,
  type Response,
} from "../repositories/index.js";
import { invalidateFeeCache } from "../services/delivery-fees.js";
import { purgeCache, STOREFRONT_CACHE_TAG } from "../services/cache-tags.js";
import { validateOsenConnection } from "../integrations/osen/connection.js";
const feeSchema = z.record(
  z.string().regex(/^(?:[1-9]|[1-4]\d|5[0-8])$/),
  z.object({
    home: z.number().int().min(0).max(100000),
    stopDesk: z.number().int().min(0).max(100000),
  })
);
const providerSchema = z.object({
  kind: z.enum(["ecotrack", "osen"]).default("ecotrack"),
  merchantId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,128}$/)
    .optional(),
  storeId: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,128}$/)
    .optional(),
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(160),
  provider: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  token: z.string().max(2000).optional(),
  deliveryFees: feeSchema.optional(),
});
/** Public CAPI status for the dashboard: never the token itself. */
export async function capiStatus() {
  const capi = await loadCapiSettings();
  return {
    capiConfigured: Boolean(capi.token),
    testEventCode: capi.testEventCode,
  };
}
export async function updateSettings(
  _request: Request,
  response: Response,
  body: Record<string, unknown>,
  existing: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  try {
    const updates: Array<{ key: string; value: string }> = [];
    if (Object.hasOwn(body, "pixelId")) {
      const id = String(body.pixelId || "").trim();
      if (id && !/^\d{8,20}$/.test(id)) throw new Error("Pixel ID غير صالح");
      updates.push({ key: "meta_pixel_id", value: id });
    }
    if (Object.hasOwn(body, "capiToken")) {
      // Write-only secret: an empty value removes it.
      const token = String(body.capiToken || "").trim();
      if (token && !/^[A-Za-z0-9_\-.|]{20,1000}$/.test(token))
        throw new Error("رمز Conversions API غير صالح");
      updates.push({ key: "meta_capi_token", value: token });
    }
    if (Object.hasOwn(body, "testEventCode")) {
      const code = String(body.testEventCode || "").trim();
      if (code && !/^[A-Za-z0-9]{1,40}$/.test(code))
        throw new Error("رمز Test Events غير صالح");
      updates.push({ key: "meta_test_event_code", value: code });
    }
    if (Object.hasOwn(body, "shippingMode")) {
      const mode = z.enum(["stock", "without_stock"]).parse(body.shippingMode);
      updates.push({ key: "shipping_mode", value: mode });
    }
    if (Array.isArray(body.providers)) {
      const input = z.array(providerSchema).max(10).parse(body.providers);
      if (new Set(input.map(p => p.id)).size !== input.length)
        throw new Error("معرّفات شركات مكررة");
      const providers = input.map(p => {
        const old = existing.providers.find(v => v.id === p.id);
        if (old && (old.kind || "ecotrack") !== p.kind && !p.token)
          throw new Error(
            "تغيير نوع التكامل يتطلب مفتاحًا جديدًا للحساب الجديد"
          );
        if (
          p.kind === "osen" &&
          (!p.merchantId || !p.storeId || p.provider !== "osen-express")
        )
          throw new Error("أكمل Merchant ID وStore ID لحساب Osen Express");
        return {
          ...p,
          token: p.token || old?.token || "",
          deliveryFees: p.deliveryFees || old?.deliveryFees || {},
        };
      });
      for (const old of existing.providers) {
        const next = providers.find(p => p.id === old.id);
        if (
          !next ||
          next.provider !== old.provider ||
          next.kind !== (old.kind || "ecotrack") ||
          next.merchantId !== old.merchantId ||
          next.storeId !== old.storeId
        ) {
          const rows =
            await sql!`SELECT id FROM atlasio_orders WHERE shipping_provider_id=${old.id} LIMIT 1`;
          if (rows.length)
            throw new Error(
              "يوجد سجل طلبات مرتبط بهذا الحساب؛ أبقه للحفاظ على التتبع"
            );
        }
      }
      for (const p of providers)
        if (!p.token && p.id !== "default")
          throw new Error("Token مطلوب للشركة الجديدة");
      for (const p of providers) {
        const old = existing.providers.find(v => v.id === p.id);
        if (
          p.kind === "osen" &&
          (!old ||
            old.token !== p.token ||
            old.merchantId !== p.merchantId ||
            old.storeId !== p.storeId)
        ) {
          if (!(await validateOsenConnection(p)))
            throw new Error(
              "مفتاح Osen لا يطابق Merchant ID وStore ID أو لا يملك صلاحية المتجر"
            );
        }
      }
      const active = String(body.activeProviderId || providers[0]?.id || "");
      if (providers.length && !providers.some(p => p.id === active))
        throw new Error("الشركة الفعالة غير موجودة");
      updates.push(
        { key: "shipping_providers", value: JSON.stringify(providers) },
        { key: "active_provider_id", value: active }
      );
    }
    if (!updates.length) throw new Error("لا توجد إعدادات للحفظ");
    await sql!.transaction(
      updates.map(
        item =>
          sql!`INSERT INTO atlasio_settings(key,value) VALUES(${item.key},${item.value}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`
      )
    );
    invalidateFeeCache();
    invalidateCapiSettings();
    await purgeCache(STOREFRONT_CACHE_TAG);
    const current = await loadEcoSettings();
    response.status(200).json({
      provider: current.provider,
      providerName: current.providerName,
      activeProviderId: current.providerId,
      providers: publicProviders(current.providers),
      tokenConfigured: Boolean(current.token),
      deliveryFees: current.deliveryFees,
      shippingMode: current.shippingMode,
      pixelId: await loadMetaPixelId(),
      ...(await capiStatus()),
    });
  } catch (e) {
    response
      .status(400)
      .json({ error: e instanceof Error ? e.message : "تعذر حفظ الإعدادات" });
  }
}
