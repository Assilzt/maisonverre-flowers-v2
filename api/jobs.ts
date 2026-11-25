import { sql, loadEcoSettings } from "../backend/repositories/index.js";
import { isAdmin, isCron, getBody } from "../backend/http/request.js";
import type { Request, Response } from "../backend/http/contracts.js";
import { flushNotifications } from "../backend/jobs/notifications.js";
import { capiSummary, cleanupCapi, flushCapi } from "../backend/jobs/capi.js";
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
    if (
      request.method === "POST" &&
      getBody(request.body).action === "retry-capi"
    ) {
      await sql!`UPDATE mv_capi_events SET status='pending',attempts=0,available_at=NOW() WHERE status='failed' AND payload IS NOT NULL`;
      response.status(200).json({ capi: await flushCapi() });
      return;
    }
    if (isCron(request) || request.method === "POST") {
      const [notifications, shipping] = await Promise.all([
        flushNotifications(),
        syncShipments(await loadEcoSettings()),
      ]);
      // After the sync, so delivered/returned events it queued go out now.
      const capi = await flushCapi();
      await cleanupCapi();
      await sql!`DELETE FROM mv_rate_limits WHERE expires_at<NOW()`;
      response.status(200).json({ notifications, shipping, capi });
      return;
    }
    const notifications =
      await sql!`SELECT q.order_id,q.status,q.attempts,q.last_error,q.updated_at FROM mv_notification_outbox q WHERE status<>'sent' ORDER BY updated_at DESC LIMIT 100`;
    const shipments =
      await sql!`SELECT id,lead_id,shipment_status,ecotrack_sync_error,ecotrack_last_synced_at FROM atlasio_orders WHERE ecotrack_tracking IS NOT NULL OR shipment_status IN ('processing','uncertain') ORDER BY updated_at DESC LIMIT 100`;
    response
      .status(200)
      .json({ notifications, shipments, capi: await capiSummary() });
  } catch {
    response
      .status(503)
      .json({ error: "تعذر تنفيذ المهام؛ راجع إعدادات قاعدة البيانات" });
  }
}
