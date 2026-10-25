import { EcoTrackSettings } from "./types.js";
import { getHeaders, getBaseUrl, ensureToken, ecoFetch } from "./transport.js";

export const firstArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of [
    "products",
    "data",
    "items",
    "results",
    "result",
    "rows",
  ]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested;
    if (nested && typeof nested === "object") {
      const found = firstArray(nested);
      if (found.length > 0) return found;
    }
  }
  return [];
};

export const quantityFrom = (item: Record<string, unknown>) => {
  const candidates = [
    item.quantity,
    item.quantite,
    item.qte,
    item.stock_quantity,
    item.quantity_available,
    item.available_quantity,
    item.available_qty,
    item.stock_qty,
    item.qty,
    item.available,
    item.stock,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate))
      return Math.max(0, candidate);
    if (
      typeof candidate === "string" &&
      candidate.trim() !== "" &&
      Number.isFinite(Number(candidate))
    )
      return Math.max(0, Number(candidate));
    if (candidate && typeof candidate === "object") {
      const nested = candidate as Record<string, unknown>;
      const nestedValue =
        nested.quantity ??
        nested.quantite ??
        nested.qte ??
        nested.available ??
        nested.qty;
      if (typeof nestedValue === "number" && Number.isFinite(nestedValue))
        return Math.max(0, nestedValue);
      if (
        typeof nestedValue === "string" &&
        nestedValue.trim() !== "" &&
        Number.isFinite(Number(nestedValue))
      )
        return Math.max(0, Number(nestedValue));
    }
  }
  return 0;
};

export async function fetchEcoTrackProducts(settings?: EcoTrackSettings) {
  ensureToken(settings);
  const items: unknown[] = [];
  for (let page = 1; ; page += 1) {
    const response = await ecoFetch(
      `${getBaseUrl(settings)}/get/products/list?page=${page}`,
      {
        headers: getHeaders(settings),
      }
    );
    if (!response.ok)
      throw new Error(`تعذر جلب منتجات المخزون (${response.status})`);
    const data = (await response.json()) as Record<string, unknown>;
    if (data.success === false)
      throw new Error("EcoTrack رفض جلب منتجات المخزون");
    items.push(...firstArray(data));
    const pagination = data.pagination as { last_page?: unknown } | undefined;
    const lastPage = Number(pagination?.last_page ?? 1);
    if (!Number.isInteger(lastPage) || lastPage < 1 || lastPage > 250)
      throw new Error("EcoTrack أرسل بيانات صفحات مخزون غير صالحة");
    if (page >= lastPage) break;
  }
  return (items as Array<Record<string, unknown>>)
    .map(item => ({
      id: String(
        item.reference ??
          item.id ??
          item.product_id ??
          item.productId ??
          item.code ??
          item.ref ??
          ""
      ),
      name: String(
        item.title ??
          item.name ??
          item.nom ??
          item.product_name ??
          item.productName ??
          item.produit ??
          ""
      ),
      reference:
        (item.reference ?? item.ref ?? item.sku ?? item.product_reference)
          ? String(
              item.reference ?? item.ref ?? item.sku ?? item.product_reference
            )
          : null,
      quantity: quantityFrom({
        ...item,
        quantity: item.stock_disponible ?? item.quantity,
      }),
      active:
        item.is_active !== 0 &&
        item.is_active !== "0" &&
        item.is_active !== false &&
        item.active !== false &&
        item.status !== false &&
        item.deleted !== true,
    }))
    .filter(item => item.id && item.name && item.active);
}
