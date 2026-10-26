import { EcoTrackSettings, EcoTrackShippingMode } from "./types.js";
import {
  getHeaders,
  getBaseUrl,
  ensureToken,
  ecoFetch,
  EcoTrackRejectedError,
} from "./transport.js";
import { RateLimitError } from "../../services/rate-limit.js";
import {
  wilayaCode,
  canonicalCommuneForEcoTrack,
  fetchEcoTrackWilayas,
} from "./locations.js";

export const normalizePhone = (value: string) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("213") && digits.length === 12)
    return `0${digits.slice(3)}`;
  if (digits.length === 9) return `0${digits}`;
  return digits;
};
export class UncertainShipmentError extends Error {}

export async function createEcoTrackParcel(
  order: {
    leadId: string;
    price: number;
    deliveryFee?: number;
    phone: string;
    fullName?: string | null;
    wilaya?: string | null;
    commune?: string | null;
    deliveryType?: string | null;
    giftBooklet?: boolean;
    productName?: string | null;
    shippingMode: EcoTrackShippingMode;
    quantity?: number;
  },
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const phone = normalizePhone(order.phone);
  if (!/^0[5-7]\d{8}$/.test(phone))
    throw new Error("رقم الهاتف غير صالح لـ EcoTrack");
  if (!order.wilaya || !order.commune)
    throw new Error("الولاية والبلدية مطلوبتان قبل رفع الشحنة");
  const code = wilayaCode(order.wilaya);
  if (!code) throw new Error("رقم الولاية غير صالح لـ EcoTrack");
  const supportedWilayas = await fetchEcoTrackWilayas(settings);
  if (
    supportedWilayas.length > 0 &&
    !supportedWilayas.some(item => item.id === code)
  ) {
    throw new Error(
      `شركة التوصيل الحالية لا تدعم ولاية ${order.wilaya} في EcoTrack. اطلب تفعيلها من الشركة أو اختر شركة تدعم عين قزام.`
    );
  }
  const commune = await canonicalCommuneForEcoTrack(
    order.wilaya,
    order.commune,
    settings
  );

  const params = new URLSearchParams({
    reference: order.leadId,
    nom_client: order.fullName || "زبون Atlasio",
    telephone: phone,
    adresse: `${commune.name} - ${order.wilaya}`,
    code_postal: commune.postalCode || "",
    commune: commune.name,
    code_wilaya: String(code),
    montant: String(Math.round(order.price + (order.deliveryFee || 0))),
    produit: order.productName || "بذور الزهور - 4 أنواع",
    type: "1",
    stop_desk: order.deliveryType === "stop_desk" ? "1" : "0",
    stock: order.shippingMode === "stock" ? "1" : "0",
    quantite:
      order.shippingMode === "stock"
        ? String(Math.max(1, Math.floor(order.quantity || 1)))
        : "",
    remarque: `Atlasio ${order.leadId}${order.giftBooklet ? " - كتيب عناية مجاني" : ""}`,
    weight: "1",
  });
  let response: globalThis.Response;
  try {
    response = await ecoFetch(
      `${getBaseUrl(settings)}/create/order?${params.toString()}`,
      {
        method: "POST",
        headers:
          settings?.kind === "osen"
            ? getHeaders(settings)
            : { Authorization: getHeaders(settings).Authorization },
      }
    );
  } catch (error) {
    if (
      error instanceof RateLimitError ||
      error instanceof EcoTrackRejectedError
    )
      throw error;
    throw new UncertainShipmentError(
      "انقطع الرد أثناء إنشاء الشحنة؛ تحقق بالمرجع قبل إعادة المحاولة"
    );
  }

  const text = await response.text();
  if (!response.ok) {
    if (response.status >= 500)
      throw new UncertainShipmentError("تعذر تأكيد نتيجة الرفع؛ تحقق بالمرجع");
    throw new EcoTrackRejectedError(`EcoTrack رفض الشحنة (${response.status})`);
  }
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* text response */
  }
  const tracking =
    data.tracking ||
    (data.data as Record<string, unknown> | undefined)?.tracking ||
    data.tracking_number;
  if (!tracking)
    throw new UncertainShipmentError(
      "تم قبول الطلب لكن لم يصل رقم التتبع من EcoTrack"
    );
  return String(tracking);
}

export const createEcoTrackStockParcel = (
  order: Omit<Parameters<typeof createEcoTrackParcel>[0], "shippingMode"> & {
    quantity?: number;
  },
  settings?: EcoTrackSettings
) => createEcoTrackParcel({ ...order, shippingMode: "stock" }, settings);

export const createEcoTrackNonStockParcel = (
  order: Omit<Parameters<typeof createEcoTrackParcel>[0], "shippingMode">,
  settings?: EcoTrackSettings
) =>
  createEcoTrackParcel({ ...order, shippingMode: "without_stock" }, settings);

export async function cancelEcoTrackParcel(
  tracking: string,
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const response = await ecoFetch(
    `${getBaseUrl(settings)}/delete/order?tracking=${encodeURIComponent(tracking)}`,
    { method: "DELETE", headers: getHeaders(settings) }
  );
  const data = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok || !(data.delete === "success" || data.success === true))
    throw new Error("تعذر إلغاء الشحنة من EcoTrack");
  return data;
}
