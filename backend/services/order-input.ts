import { createHash } from "node:crypto";
import type { ProductLandingConfig } from "../../shared/catalog.js";
export const tokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function validateOrderInput(
  body: Record<string, unknown>,
  page: ProductLandingConfig
) {
  const phone = String(body.phone || "").trim(),
    complete = body.status === "complete";
  if (!phone || phone.length > 32) throw new Error("رقم الهاتف غير صالح");
  if (
    complete &&
    !/^(?:0[5-7]\d{8}|\+?213[5-7]\d{8})$/.test(phone.replace(/\s/g, ""))
  )
    throw new Error("رقم الهاتف غير صالح");
  if (complete && (!body.wilaya || !String(body.commune || "").trim()))
    throw new Error("الولاية والبلدية مطلوبتان");
  const quantity = Number(body.quantity || 1);
  const bundle = page.bundles?.find(b => b.quantity === quantity);
  if (!bundle) throw new Error("العرض غير صالح");
  const leadId = String(body.leadId || ""),
    leadToken = String(body.leadToken || "");
  if (!/^[\w-]{8,64}$/.test(leadId) || !/^[\w-]{24,128}$/.test(leadToken))
    throw new Error("معرّف الطلب غير صالح؛ أعد تحميل الصفحة");
  return { phone, complete, quantity, price: bundle.price, leadId, leadToken };
}
