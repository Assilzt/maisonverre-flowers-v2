import {
  loadEcoSettings,
  rowById,
  cancelLocalShipment,
  recordEvent,
} from "../repositories/index.js";
import type { Request, Response } from "../http/contracts.js";
import { cancelEcoTrackParcel } from "../integrations/ecotrack/client.js";

export async function updateUnship(
  request: Request,
  response: Response,
  body: Record<string, unknown>,
  ecoSettings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  const orderId = Number(body.id);
  const order = await rowById(orderId);
  if (!order) {
    response.status(404).json({ error: "الطلب غير موجود" });
    return;
  }
  if (!order.ecotrack_tracking) {
    response.status(409).json({ error: "الطلب غير مرفوع إلى EcoTrack" });
    return;
  }
  if (order.status === "cancelled") {
    response.status(200).json({ order });
    return;
  }
  await cancelEcoTrackParcel(
    order.ecotrack_tracking,
    await loadEcoSettings(order.shipping_provider_id || ecoSettings.providerId)
  );
  await cancelLocalShipment(orderId);
  await recordEvent(
    orderId,
    "shipment_cancelled",
    "تم إلغاء الشحنة",
    "shipped",
    "cancelled"
  );
  response.status(200).json({
    order: await rowById(orderId),
    message: "تم إلغاء الشحنة",
  });
  return;
}
