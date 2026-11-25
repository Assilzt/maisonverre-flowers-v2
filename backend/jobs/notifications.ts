import { waitUntil } from "@vercel/functions";
import { sql } from "../repositories/connection.js";
import { deliverTelegram } from "../integrations/telegram/client.js";
export function notificationText(order: Record<string, unknown>) {
  const complete = order.status !== "abandoned";
  return `${complete ? "✅ طلب مكتمل" : "🟡 طلب غير مكتمل"}\n🆔 رقم المتابعة: ${order.lead_id}\n🏷️ الحملة: ${order.campaign}\n💰 السعر: ${order.price} دج\n📦 العدد: ${order.quantity}\n🚚 التوصيل: ${order.delivery_fee} دج — ${order.delivery_type === "stop_desk" ? "مكتب الشحن" : "إلى المنزل"}\n👤 الاسم: ${order.full_name || "لم يُحدد بعد"}\n📍 الولاية: ${order.wilaya || "لم تُحدد بعد"}\n🏘️ البلدية: ${order.commune || "لم تُحدد بعد"}\n📞 الهاتف: ${order.phone}\n${complete ? "✅ جاهز للتأكيد الهاتفي" : "⏳ تُحدّث هذه الرسالة أثناء تعبئة النموذج"}`;
}
export async function flushNotifications(limit = 3) {
  if (!sql) return { sent: 0, failed: 0 };
  const jobs =
    await sql`WITH candidates AS(SELECT order_id FROM mv_notification_outbox WHERE (status='pending' AND available_at<=NOW()) OR (status='processing' AND locked_until<NOW()) ORDER BY updated_at LIMIT ${limit} FOR UPDATE SKIP LOCKED) UPDATE mv_notification_outbox q SET status='processing',locked_until=NOW()+INTERVAL '5 minutes' FROM candidates c WHERE q.order_id=c.order_id RETURNING q.order_id,q.version,q.attempts`;
  let sent = 0,
    failed = 0;
  for (const job of jobs) {
    try {
      const rows =
        await sql`SELECT * FROM atlasio_orders WHERE id=${job.order_id}`;
      const order = rows[0];
      if (!order) throw new Error("Order not found");
      const messageId = await deliverTelegram(
        notificationText(order),
        Number(order.telegram_message_id) || undefined
      );
      await sql.transaction([
        sql`UPDATE atlasio_orders SET telegram_message_id=${messageId} WHERE id=${job.order_id}`,
        sql`UPDATE mv_notification_outbox SET status=CASE WHEN version=${job.version} THEN 'sent' ELSE 'pending' END,locked_until=NULL,last_error=NULL,updated_at=NOW() WHERE order_id=${job.order_id}`,
      ]);
      sent++;
    } catch {
      const attempts = Number(job.attempts) + 1,
        delay = Math.min(3600, 2 ** attempts * 15);
      await sql`UPDATE mv_notification_outbox SET status=CASE WHEN ${attempts}>=8 THEN 'failed' ELSE 'pending' END,attempts=${attempts},available_at=NOW()+(${delay} * INTERVAL '1 second'),locked_until=NULL,last_error='Telegram delivery failed',updated_at=NOW() WHERE order_id=${job.order_id}`;
      failed++;
    }
  }
  return { sent, failed };
}
export const scheduleNotifications = () => {
  if (process.env.NODE_ENV === "test") return;
  const task = flushNotifications().catch(() => ({ sent: 0, failed: 1 }));
  if (process.env.VERCEL) waitUntil(task);
};
