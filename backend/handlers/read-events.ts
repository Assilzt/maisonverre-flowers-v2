import {
  sql,
  Request,
  Response,
  isAdmin,
  queryValue,
  loadEcoSettings,
} from "../repositories/index.js";
export async function events(
  request: Request,
  response: Response,
  ecoSettings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  if (!isAdmin(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  const orderId = Number(queryValue(request, "orderId"));
  if (!Number.isInteger(orderId) || orderId <= 0) {
    response.status(400).json({ error: "رقم الطلب غير صالح" });
    return;
  }
  const events =
    await sql!`SELECT id, order_id, event_type, from_value, to_value, message, metadata, created_at FROM atlasio_order_events WHERE order_id = ${orderId} ORDER BY created_at DESC LIMIT 100`;
  response.status(200).json({ events });
  return;
}
