import {
  Request,
  Response,
  isAdmin,
  queryValue,
  sql,
  loadEcoSettings,
} from "../repositories/index.js";
import { refreshShipment } from "../services/shipment-sync.js";
export async function shipment(
  request: Request,
  response: Response,
  _settings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  if (!isAdmin(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  const id = Number(queryValue(request, "orderId"));
  const result = await refreshShipment(id);
  const updates =
    await sql!`SELECT * FROM atlasio_shipment_updates WHERE order_id=${id} ORDER BY activity_date DESC NULLS LAST,activity_time DESC NULLS LAST,id DESC LIMIT 200`;
  response.status(200).json({ ...result, updates });
}
