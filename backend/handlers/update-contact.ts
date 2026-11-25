import {
  sql,
  Request,
  Response,
  selectColumns,
  loadEcoSettings,
  rowById,
  recordEvent,
} from "../repositories/index.js";
import { enqueueStatusEvent } from "../jobs/capi.js";
import { canDo, type FlowAction } from "../../shared/order-flow.js";
export async function updateContact(
  request: Request,
  response: Response,
  body: Record<string, unknown>,
  ecoSettings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  // Compatibility marker: body.action === 'contact'
  const orderId = Number(body.id);
  const order = await rowById(orderId);
  if (!order) {
    response.status(404).json({ error: "الطلب غير موجود" });
    return;
  }
  if (
    order.ecotrack_tracking ||
    ["delivered", "returned", "cancelled", "trashed"].includes(order.status)
  ) {
    response
      .status(409)
      .json({ error: "لا يمكن تسجيل اتصال لطلب مرفوع أو نهائي" });
    return;
  }
  const result = String(body.result || "contacted").slice(0, 32);
  const allowedResults = [
    "contacted",
    "confirmed",
    "no_answer",
    "busy",
    "call_later",
    "wrong_number",
    "refused",
  ];
  if (!allowedResults.includes(result)) {
    response.status(400).json({ error: "نتيجة الاتصال غير صالحة" });
    return;
  }
  const step = (result === "confirmed" ? "confirm" : result) as FlowAction;
  if (result !== "contacted" && !canDo(order, step)) {
    response.status(409).json({
      error:
        result === "confirmed"
          ? "لا يمكن تأكيد هذا الطلب الآن؛ تأكد من رقم الهاتف وحالة الطلب"
          : "لا يمكن تسجيل هذه النتيجة في حالة الطلب الحالية",
    });
    return;
  }
  const nextConfirmation =
    result === "confirmed"
      ? "confirmed"
      : result === "refused" || result === "wrong_number"
        ? "cancelled"
        : "pending";
  const nextOrderStatus =
    result === "confirmed"
      ? "confirmed"
      : result === "refused" || result === "wrong_number"
        ? "cancelled"
        : order.status;
  const updated =
    await sql!`UPDATE atlasio_orders SET confirmation_status = ${nextConfirmation}, contact_result = ${result}, contact_attempts = contact_attempts + 1, last_contacted_at = NOW(), status = ${nextOrderStatus}, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
  await recordEvent(
    orderId,
    "contact_result",
    `نتيجة الاتصال: ${result}`,
    order.confirmation_status,
    nextConfirmation,
    { result }
  );
  if (result === "confirmed")
    await recordEvent(
      orderId,
      "order_confirmed",
      "تم تأكيد الطلب وتجهيزه للشحن",
      order.status,
      "confirmed"
    );
  try {
    if (result === "confirmed" && order.confirmation_status !== "confirmed")
      await enqueueStatusEvent("OrderConfirmed", orderId);
    if (nextOrderStatus === "cancelled")
      await sql!`UPDATE atlasio_orders SET meta_context=NULL WHERE id=${orderId}`;
  } catch (error) {
    console.error(
      "CAPI status event",
      error instanceof Error ? error.message : "unknown"
    );
  }
  response.status(200).json({
    order: updated[0],
    message:
      result === "confirmed"
        ? "تم تأكيد الطلب وتجهيزه للشحن"
        : "تم تسجيل نتيجة الاتصال",
  });
  return;
}
