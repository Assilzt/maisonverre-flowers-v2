import {
  sql,
  Request,
  Response,
  selectColumns,
  loadEcoSettings,
  rowById,
  recordEvent,
} from "../repositories/index.js";
import { canTrash } from "../../shared/order-flow.js";
export async function updateTrash(
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
  if (order.status === "trashed") {
    response
      .status(200)
      .json({ order, message: "الطلب موجود مسبقاً في سلة المهملات" });
    return;
  }
  if (!canTrash(order)) {
    response.status(409).json({
      error: "الشحنة في الطريق؛ ألغِ الشحنة أولاً ثم احذف الطلب",
    });
    return;
  }
  const updated =
    await sql!`UPDATE atlasio_orders SET status = 'trashed', status_before_trash = ${order.status}, trashed_at = NOW(), updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
  await recordEvent(
    orderId,
    "order_trashed",
    "تم نقل الطلب إلى سلة المهملات",
    order.status,
    "trashed"
  );
  response.status(200).json({
    order: updated[0],
    message: "تم نقل الطلب إلى سلة المهملات",
  });
  return;
}
