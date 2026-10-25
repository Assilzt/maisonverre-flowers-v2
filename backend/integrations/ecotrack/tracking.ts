import { EcoTrackSettings, EcoTrackTrackingActivity } from "./types.js";
import { getHeaders, getBaseUrl, ensureToken, ecoFetch } from "./transport.js";

export const latestEcoTrackActivity = (items: EcoTrackTrackingActivity[]) =>
  items.reduce<EcoTrackTrackingActivity>((latest, item) => {
    const stamp = (entry: EcoTrackTrackingActivity) =>
      String(
        entry.created_at || `${entry.date || ""} ${entry.time || ""}`
      ).trim();
    return stamp(item) >= stamp(latest) ? item : latest;
  }, {});

export async function fetchEcoTrackOrders(
  settings?: EcoTrackSettings,
  page = 1
) {
  ensureToken(settings);
  const response = await ecoFetch(
    `${getBaseUrl(settings)}/get/orders?page=${page}`,
    { headers: getHeaders(settings) }
  );
  if (!response.ok)
    throw new Error(`تعذر جلب حالات EcoTrack (${response.status})`);
  const payload = (await response.json()) as Record<string, unknown>;
  const nested =
    payload.data &&
    typeof payload.data === "object" &&
    !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : null;
  const data = Array.isArray(payload.data)
    ? payload.data
    : Array.isArray(nested?.data)
      ? nested.data
      : Array.isArray(payload.orders)
        ? payload.orders
        : [];
  const meta =
    payload.meta && typeof payload.meta === "object"
      ? (payload.meta as Record<string, unknown>)
      : null;
  return {
    data: data as Array<Record<string, unknown>>,
    last_page:
      Number(payload.last_page ?? nested?.last_page ?? meta?.last_page ?? 1) ||
      1,
    total:
      Number(payload.total ?? nested?.total ?? meta?.total ?? data.length) ||
      data.length,
  };
}

export async function fetchEcoTrackTracking(
  tracking: string,
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const response = await ecoFetch(
    `${getBaseUrl(settings)}/get/tracking/info?tracking=${encodeURIComponent(tracking)}`,
    { headers: getHeaders(settings) }
  );
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw new Error(`تعذر جلب تتبع الشحنة (${response.status})`);
  const nested = extractTrackingRecord(payload, tracking);
  const activity = trackingActivities(nested);
  const stateActivity = latestEcoTrackActivity(
    activity.filter(
      item => item.status && item.status !== "notification_on_order"
    )
  );
  return {
    status: trackingStatusValue(nested) ?? stateActivity.status ?? null,
    activity,
    raw: payload,
  };
}

export const trackingStatusValue = (record: Record<string, unknown>) =>
  record.status ??
  record.status_name ??
  record.state ??
  record.etat ??
  record.last_status ??
  null;

export const trackingActivities = (record: Record<string, unknown>) => {
  const value =
    record.activity ??
    record.activities ??
    record.history ??
    record.updates ??
    record.maj;
  return Array.isArray(value) ? (value as EcoTrackTrackingActivity[]) : [];
};

export const trackingKey = (record: Record<string, unknown>) =>
  String(
    record.tracking ??
      record.tracking_number ??
      record.trackingNumber ??
      record.numero ??
      record.num_colis ??
      ""
  );

export const extractTrackingRecord = (
  payload: Record<string, unknown>,
  tracking: string
) => {
  const data = payload.data;
  if (Array.isArray(data)) {
    return (data.find(
      item =>
        item &&
        typeof item === "object" &&
        trackingKey(item as Record<string, unknown>) === tracking
    ) || {}) as Record<string, unknown>;
  }
  if (data && typeof data === "object") {
    const objectData = data as Record<string, unknown>;
    const direct = objectData[tracking];
    if (direct && typeof direct === "object")
      return direct as Record<string, unknown>;
    if (trackingKey(objectData) === tracking) return objectData;
    const nested = Object.values(objectData).find(
      item =>
        item &&
        typeof item === "object" &&
        trackingKey(item as Record<string, unknown>) === tracking
    );
    if (nested && typeof nested === "object")
      return nested as Record<string, unknown>;
    return objectData;
  }
  return payload;
};

export async function fetchEcoTrackTrackingsInfo(
  trackings: string[],
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  if (trackings.length === 0) return {};
  if (trackings.length > 100)
    throw new Error("EcoTrack يقبل حتى 100 رقم تتبع في الطلب الواحد");
  const query = trackings
    .map(item => `trackings[]=${encodeURIComponent(item)}`)
    .join("&");
  const response = await ecoFetch(
    `${getBaseUrl(settings)}/get/trackings/info?${query}`,
    { headers: getHeaders(settings) }
  );
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  if (!response.ok)
    throw new Error(`تعذر جلب تفاصيل الشحنات (${response.status})`);
  const result: Record<string, Record<string, unknown>> = {};
  const data = payload.data;
  if (Array.isArray(data)) {
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const key = trackingKey(record);
      if (key) result[key] = record;
    }
  } else if (data && typeof data === "object") {
    for (const [key, value] of Object.entries(
      data as Record<string, unknown>
    )) {
      if (value && typeof value === "object")
        result[key] = value as Record<string, unknown>;
    }
  }
  for (const tracking of trackings) {
    if (result[tracking]) continue;
    const direct = payload[tracking];
    if (direct && typeof direct === "object")
      result[tracking] = direct as Record<string, unknown>;
  }
  return result;
}

export async function fetchEcoTrackUpdates(
  tracking: string,
  settings?: EcoTrackSettings
) {
  ensureToken(settings);
  const response = await ecoFetch(
    `${getBaseUrl(settings)}/get/maj?tracking=${encodeURIComponent(tracking)}`,
    { headers: getHeaders(settings) }
  );
  const payload = (await response.json().catch(() => [])) as unknown;
  if (!response.ok)
    throw new Error(`تعذر جلب تعليقات شركة التوصيل (${response.status})`);
  if (Array.isArray(payload)) return payload as EcoTrackTrackingActivity[];
  if (payload && typeof payload === "object")
    return Object.values(payload as Record<string, unknown>).filter(
      item => item && typeof item === "object"
    ) as EcoTrackTrackingActivity[];
  return [];
}
