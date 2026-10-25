import {
  Request,
  Response,
  isAdmin,
  loadMetaPixelId,
  loadEcoSettings,
  publicProviders,
} from "../repositories/index.js";
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
  });
  return;
}
