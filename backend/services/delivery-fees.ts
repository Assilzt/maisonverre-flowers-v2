import { fetchEcoTrackFees } from "../integrations/ecotrack/client.js";
import type { loadEcoSettings } from "../repositories/index.js";
type Settings = Awaited<ReturnType<typeof loadEcoSettings>>;
const cache = new Map<
  string,
  {
    expires: number;
    fees: Array<{ wilaya_id: number; tarif: number; tarif_stopdesk: number }>;
  }
>();
export const invalidateFeeCache = () => cache.clear();
export async function deliveryFees(settings: Settings) {
  const key = settings.providerId + ":" + settings.token;
  const previous = cache.get(key);
  if (previous && previous.expires > Date.now()) return previous.fees;
  const fees = new Map<
    number,
    { wilaya_id: number; tarif: number; tarif_stopdesk: number }
  >();
  try {
    const remote = (await fetchEcoTrackFees(settings)) as Array<
      Record<string, unknown>
    >;
    for (const item of remote) {
      const id = Number(item.wilaya_id ?? item.code_wilaya);
      const home = Number(item.tarif ?? item.home ?? item.price),
        desk = Number(item.tarif_stopdesk ?? item.stop_desk ?? home);
      if (
        id >= 1 &&
        id <= 58 &&
        Number.isFinite(home) &&
        home >= 0 &&
        Number.isFinite(desk) &&
        desk >= 0
      )
        fees.set(id, { wilaya_id: id, tarif: home, tarif_stopdesk: desk });
    }
  } catch {
    // Keep selling while the carrier API is down: the last known fees are a
    // better answer than refusing the order.
    if (previous) return previous.fees;
    if (!Object.keys(settings.deliveryFees).length)
      throw new Error("تعذر تحميل رسوم التوصيل");
  }
  for (const [code, value] of Object.entries(settings.deliveryFees)) {
    const id = Number(code);
    if (id >= 1 && id <= 58 && Number.isFinite(value.home) && value.home >= 0)
      fees.set(id, {
        wilaya_id: id,
        tarif: value.home,
        tarif_stopdesk: value.stopDesk ?? value.home,
      });
  }
  if (!fees.size) throw new Error("رسوم التوصيل غير مهيأة");
  const result = Array.from(fees.values());
  cache.set(key, { expires: Date.now() + 60_000, fees: result });
  return result;
}
