import {
  Request,
  Response,
  isAdmin,
  isCron,
  loadEcoSettings,
} from "../repositories/index.js";
import { syncShipments } from "../services/shipment-sync.js";
export async function sync(
  request: Request,
  response: Response,
  settings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  if (!isAdmin(request) && !isCron(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  response.status(200).json(await syncShipments(settings));
}
