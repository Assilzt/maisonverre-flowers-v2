import type { EcoTrackSettings } from "./types.js";
import { ecoFetch, getBaseUrl, getHeaders, ensureToken } from "./transport.js";
export async function carrierAction(
  action: string,
  tracking: string,
  settings: EcoTrackSettings,
  fields: Record<string, unknown> = {}
) {
  ensureToken(settings);
  const routes: Record<string, [string, string]> = {
    validate: ["POST", "/valid/order"],
    pickup: ["POST", "/valid/order"],
    edit: ["POST", "/update/order"],
    delete: ["DELETE", "/delete/order"],
    note: ["POST", "/add/maj"],
    return: ["POST", "/ask/for/order/return"],
    "receive-return": ["POST", "/valid/returns"],
  };
  const route = routes[action];
  if (!route) throw new Error("Unsupported carrier action");
  const params = new URLSearchParams({ tracking });
  if (action === "validate" || action === "pickup")
    params.set("ask_collection", action === "pickup" ? "1" : "0");
  if (action === "note") {
    const note = String(fields.content || "").trim();
    if (!note || note.length > 1000)
      throw new Error("الملاحظة مطلوبة وبحد أقصى 1000 حرف");
    params.set("content", note);
  }
  if (action === "receive-return" && settings.kind === "osen")
    params.set("trackings", JSON.stringify([tracking]));
  if (action === "edit")
    for (const key of [
      "client",
      "tel",
      "tel2",
      "adresse",
      "code_postal",
      "commune",
      "wilaya",
      "montant",
      "remarque",
      "product",
    ])
      if (fields[key] != null)
        params.set(key, String(fields[key]).slice(0, 255));
  const response = await ecoFetch(
    getBaseUrl(settings) +
      route[1] +
      (action === "receive-return" && settings.kind !== "osen"
        ? ""
        : "?" + params),
    {
      method: route[0],
      headers: getHeaders(settings),
      ...(action === "receive-return" && settings.kind !== "osen"
        ? { body: JSON.stringify({ trackings: [tracking] }) }
        : {}),
    }
  );
  const data = (await response.json()) as Record<string, unknown>;
  if (
    !response.ok ||
    (action === "receive-return"
      ? data.returned !== "success"
      : data.success !== true)
  )
    throw new Error("رفضت الشركة الإجراء؛ تحقق من حالة الشحنة وصلاحيات الحساب");
  return data;
}
export async function carrierLabel(
  tracking: string,
  settings: EcoTrackSettings
) {
  const response = await ecoFetch(
    getBaseUrl(settings) +
      "/get/order/label?tracking=" +
      encodeURIComponent(tracking),
    { headers: getHeaders(settings) }
  );
  if (!response.ok || !response.headers.get("content-type")?.includes("pdf"))
    throw new Error("ملصق PDF غير متاح");
  return Buffer.from(await response.arrayBuffer());
}
