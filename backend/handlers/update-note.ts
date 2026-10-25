import {
  sql,
  Request,
  Response,
  loadEcoSettings,
  rowById,
  recordEvent,
} from "../repositories/index.js";
export async function updateNote(
  request: Request,
  response: Response,
  body: Record<string, unknown>,
  ecoSettings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  const orderId = Number(body.id);
  const note = String(body.note || "").trim();
  if (!Number.isInteger(orderId) || orderId <= 0 || !note) {
    response.status(400).json({ error: "معرّف الطلب والتعليق مطلوبان" });
    return;
  }
  if (note.length > 1000) {
    response.status(400).json({ error: "التعليق طويل جداً" });
    return;
  }
  const order = await rowById(orderId);
  if (!order) {
    response.status(404).json({ error: "الطلب غير موجود" });
    return;
  }
  await recordEvent(orderId, "admin_note", note);
  const events =
    await sql!`SELECT id, order_id, event_type, from_value, to_value, message, metadata, created_at FROM atlasio_order_events WHERE order_id = ${orderId} ORDER BY created_at DESC LIMIT 100`;
  response.status(200).json({ events, message: "تمت إضافة التعليق" });
  return;
}
