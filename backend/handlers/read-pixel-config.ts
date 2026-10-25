import {
  Request,
  Response,
  loadMetaPixelId,
  loadEcoSettings,
} from "../repositories/index.js";
export async function pixelConfig(
  request: Request,
  response: Response,
  ecoSettings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  response.status(200).json({ pixelId: await loadMetaPixelId() });
  return;
}
