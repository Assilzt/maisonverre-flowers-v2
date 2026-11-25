import {
  publicReadCache,
  PUBLIC_CACHE_TTL_MS,
  Request,
  Response,
  queryValue,
  loadEcoSettings,
} from "../repositories/index.js";
import { fetchEcoTrackCommunes } from "../integrations/ecotrack/client.js";

export async function communes(
  request: Request,
  response: Response,
  ecoSettings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  const wilaya = queryValue(request, "wilaya");
  if (!wilaya) {
    response.status(400).json({ error: "الولاية مطلوبة" });
    return;
  }
  const cacheKey = `communes:${ecoSettings.providerId}:${wilaya}`;
  const cached = publicReadCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    response.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=604800"
    );
    response.status(200).json(cached.body);
    return;
  }
  const body = {
    communes: await fetchEcoTrackCommunes(wilaya, ecoSettings),
  };
  publicReadCache.set(cacheKey, {
    expiresAt: Date.now() + PUBLIC_CACHE_TTL_MS,
    body,
  });
  response.setHeader(
    "Cache-Control",
    "public, s-maxage=86400, stale-while-revalidate=604800"
  );
  response.status(200).json(body);
  return;
}
