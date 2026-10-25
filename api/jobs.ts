import {
  sql,
  isAdmin,
  isCron,
  Request,
  Response,
  loadEcoSettings,
  getBody,
} from "../backend/repositories/index.js";
import { flushNotifications } from "../backend/jobs/notifications.js";
import { syncShipments } from "../backend/services/shipment-sync.js";
export default async function jobs(request: Request, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  if (!isAdmin(request) && !isCron(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  try {
    if (
      request.method === "POST" &&
      getBody(request.body).action === "retry-notifications"
    )
      await sql!`UPDATE mv_notification_outbox SET status='pending',attempts=0,available_at=NOW() WHERE status='failed'`;
    if (isCron(request) || request.method === "POST") {
      const [notifications, shipping] = await Promise.all([
        flushNotifications(),
        syncShipments(await loadEcoSettings()),
      ]);
      await sql!`DELETE FROM mv_rate_limits WHERE expires_at<NOW()`;
      response.status(200).json({ notifications, shipping });
      return;
    }
    const notifications =
      await sql!`SELECT q.order_id,q.status,q.attempts,q.last_error,q.updated_at FROM mv_notification_outbox q WHERE status<>'sent' ORDER BY updated_at DESC LIMIT 100`;
    const shipments =
      await sql!`SELECT id,lead_id,shipment_status,ecotrack_sync_error,ecotrack_last_synced_at FROM atlasio_orders WHERE ecotrack_tracking IS NOT NULL OR shipment_status IN ('processing','uncertain') ORDER BY updated_at DESC LIMIT 100`;
    response.status(200).json({ notifications, shipments });
  } catch {
    response
      .status(503)
      .json({ error: "تعذر تنفيذ المهام؛ راجع إعدادات قاعدة البيانات" });
  }
}
