import {
  sql,
  selectColumns,
  loadEcoSettings,
  rowById,
  recordEvent,
} from "../repositories/index.js";
import type { Request, Response } from "../http/contracts.js";
export async function updateEdit(
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
  if (
    order.ecotrack_tracking ||
    order.status === "shipped" ||
    order.status === "delivered" ||
    order.status === "returned"
  ) {
    response
      .status(409)
      .json({ error: "لا يمكن تعديل طلب تم رفعه إلى شركة التوصيل" });
    return;
  }
  const phone = String(body.phone || "").replace(/\D/g, "");
  const fullName = String(body.fullName || "").trim();
  const wilaya = String(body.wilaya || "").trim();
  const commune = String(body.commune || "").trim();
  if (!/^0[5-7]\d{8}$/.test(phone) || !wilaya || !commune) {
    response
      .status(400)
      .json({ error: "الهاتف والولاية والبلدية مطلوبة بشكل صحيح" });
    return;
  }
  const price = Number(body.price);
  const deliveryFee = Number(body.deliveryFee);
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(deliveryFee) ||
    deliveryFee < 0
  ) {
    response.status(400).json({
      error: "سعر المنتج وسعر التوصيل يجب أن يكونا أرقاماً صحيحة أو صفراً",
    });
    return;
  }
  const deliveryType = body.deliveryType
    ? String(body.deliveryType).slice(0, 24)
    : order.delivery_type;
  const updated =
    await sql!`UPDATE atlasio_orders SET price = ${Math.round(price)}, phone = ${phone}, full_name = ${fullName || null}, wilaya = ${wilaya}, commune = ${commune}, delivery_fee = ${Math.round(deliveryFee)}, delivery_type = ${deliveryType}, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
  await recordEvent(orderId, "order_updated", "تم تعديل بيانات الطلب");
  response
    .status(200)
    .json({ order: updated[0], message: "تم تعديل بيانات الطلب" });
  return;
}
