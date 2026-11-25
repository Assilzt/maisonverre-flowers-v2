import {
  sql,
  selectColumns,
  loadEcoSettings,
  rowById,
  recordEvent,
  canManualTransition,
} from "../repositories/index.js";
import { isAdmin } from "../http/request.js";
import type { Request, Response } from "../http/contracts.js";
import { updateContact } from "./update-contact.js";
import { updateNote } from "./update-note.js";
import { updateEdit } from "./update-edit.js";
import { updateStock } from "./update-stock.js";
import { updateSettings } from "./update-settings.js";
import { updateTrash } from "./update-trash.js";
import { updateRestore } from "./update-restore.js";
import { updateShip } from "./update-ship.js";
import { updateUnship } from "./update-unship.js";
import { updateShipAll } from "./update-ship-all.js";
export async function updateOrders(
  request: Request,
  response: Response,
  body: Record<string, unknown>
) {
  const ecoSettings = await loadEcoSettings();
  if (!isAdmin(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  if (body.action === "contact")
    return updateContact(request, response, body, ecoSettings);

  if (body.action === "note")
    return updateNote(request, response, body, ecoSettings);

  if (body.action === "edit")
    return updateEdit(request, response, body, ecoSettings);

  if (body.resource === "stock")
    return updateStock(request, response, body, ecoSettings);

  if (body.resource === "settings")
    return updateSettings(request, response, body, ecoSettings);

  if (body.action === "trash")
    return updateTrash(request, response, body, ecoSettings);

  if (body.action === "restore")
    return updateRestore(request, response, body, ecoSettings);

  if (body.action === "ship")
    return updateShip(request, response, body, ecoSettings);

  if (body.action === "unship")
    return updateUnship(request, response, body, ecoSettings);

  if (body.action === "shipAll")
    return updateShipAll(request, response, body, ecoSettings);

  const orderId = Number(body.id);
  const status = String(body.status || "");
  const allowedStatuses = ["confirmed", "cancelled", "complete"];
  if (!Number.isInteger(orderId) || !allowedStatuses.includes(status)) {
    response.status(400).json({ error: "بيانات الحالة غير صالحة" });
    return;
  }
  const order = await rowById(orderId);
  if (!order) {
    response.status(404).json({ error: "الطلب غير موجود" });
    return;
  }
  if (!canManualTransition(order, status)) {
    response.status(409).json({
      error: "لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية للطلب",
    });
    return;
  }
  const updated =
    await sql!`UPDATE atlasio_orders SET status = ${status}, confirmation_status = CASE WHEN ${status} = 'confirmed' THEN 'confirmed' WHEN ${status} = 'cancelled' THEN 'cancelled' ELSE 'pending' END, contact_result = CASE WHEN ${status} = 'cancelled' THEN 'refused' ELSE contact_result END, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
  await recordEvent(
    orderId,
    "status_changed",
    status === "confirmed"
      ? "تم تأكيد الطلب"
      : status === "cancelled"
        ? "تم إلغاء الطلب"
        : order.status === "cancelled"
          ? "أُعيد فتح الطلب للمراجعة"
          : "أُعيد الطلب للمراجعة قبل الشحن",
    order.status,
    status
  );
  response
    .status(200)
    .json({ order: updated[0], message: "تم تحديث حالة الطلب" });
  return;
}
