import {
  sql,
  selectColumns,
  loadEcoSettings,
  rowById,
  recordEvent,
} from "../repositories/index.js";
import type { Request, Response } from "../http/contracts.js";
export async function updateRestore(
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
  if (order.status !== "trashed") {
    response.status(409).json({ error: "الطلب ليس في سلة المهملات" });
    return;
  }
  const restoredStatus = [
    "abandoned",
    "complete",
    "confirmed",
    "not_responding",
    "cancelled",
    "shipped",
    "delivered",
    "returned",
  ].includes(order.status_before_trash || "")
    ? order.status_before_trash
    : "abandoned";
  const updated =
    await sql!`UPDATE atlasio_orders SET status = ${restoredStatus}, status_before_trash = NULL, trashed_at = NULL, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
  await recordEvent(
    orderId,
    "order_restored",
    "تم استرجاع الطلب من سلة المهملات",
    "trashed",
    restoredStatus
  );
  response.status(200).json({
    order: updated[0],
    message: "تم استرجاع الطلب من سلة المهملات",
  });
  return;
}
