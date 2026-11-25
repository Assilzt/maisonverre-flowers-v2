import {
  loadMetaPixelId,
  loadEcoSettings,
  publicProviders,
} from "../repositories/index.js";
import { isAdmin } from "../http/request.js";
import type { Request, Response } from "../http/contracts.js";
import { capiStatus } from "./update-settings.js";
export async function settings(
  request: Request,
  response: Response,
  ecoSettings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  if (!isAdmin(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  response.status(200).json({
    provider: ecoSettings.provider,
    providerName: ecoSettings.providerName,
    activeProviderId: ecoSettings.providerId,
    providers: publicProviders(ecoSettings.providers),
    tokenConfigured: Boolean(ecoSettings.token),
    deliveryFees: ecoSettings.deliveryFees,
    shippingMode: ecoSettings.shippingMode,
    pixelId: await loadMetaPixelId(),
    ...(await capiStatus()),
  });
  return;
}
