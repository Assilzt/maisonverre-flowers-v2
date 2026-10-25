import { z } from "zod";
import {
  sql,
  loadEcoSettings,
  loadMetaPixelId,
  publicProviders,
  type Request,
  type Response,
} from "../repositories/index.js";
import { invalidateFeeCache } from "../services/delivery-fees.js";
const feeSchema = z.record(
  z.string().regex(/^(?:[1-9]|[1-4]\d|5[0-8])$/),
  z.object({
    home: z.number().int().min(0).max(100000),
    stopDesk: z.number().int().min(0).max(100000),
  })
);
const providerSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(160),
  provider: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  token: z.string().max(2000).optional(),
  deliveryFees: feeSchema.optional(),
});
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
        return {
          ...p,
          token: p.token || old?.token || "",
          deliveryFees: p.deliveryFees || old?.deliveryFees || {},
        };
      });
      for (const old of existing.providers) {
        const next = providers.find(p => p.id === old.id);
        if (!next || next.provider !== old.provider) {
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
    });
  } catch (e) {
    response
      .status(400)
      .json({ error: e instanceof Error ? e.message : "تعذر حفظ الإعدادات" });
  }
}
