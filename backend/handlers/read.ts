import {
  sql,
  Request,
  Response,
  selectColumns,
  isAdmin,
  queryValue,
  loadEcoSettings,
} from "../repositories/index.js";
import { pixelConfig } from "./read-pixel-config.js";
import { settings } from "./read-settings.js";
import { stock } from "./read-stock.js";
import { fees } from "./read-fees.js";
import { communes } from "./read-communes.js";
import { events } from "./read-events.js";
import { shipment } from "./read-shipment.js";
import { sync } from "./read-sync.js";
export async function readOrders(request: Request, response: Response) {
  const resource = queryValue(request, "resource");
  if (
    resource !== "fees" &&
    resource !== "communes" &&
    resource !== "pixel-config" &&
    resource !== "sync" &&
    !isAdmin(request)
  ) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  if (resource === "pixel-config")
    return pixelConfig(
      request,
      response,
      {} as Awaited<ReturnType<typeof loadEcoSettings>>
    );
  const ecoSettings = await loadEcoSettings();
  if (resource === "pixel-config")
    return pixelConfig(request, response, ecoSettings);

  if (resource === "settings") return settings(request, response, ecoSettings);

  if (resource === "stock") return stock(request, response, ecoSettings);

  if (resource === "fees") return fees(request, response, ecoSettings);

  if (resource === "communes") return communes(request, response, ecoSettings);

  if (resource === "events") return events(request, response, ecoSettings);

  if (resource !== "sync" && !isAdmin(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  if (resource === "shipment") return shipment(request, response, ecoSettings);

  if (resource === "sync") return sync(request, response, ecoSettings);

  const page = Math.max(
      1,
      Math.floor(Number(queryValue(request, "page")) || 1)
    ),
    limit = 50;
  const status = queryValue(request, "status") || "",
    stage = queryValue(request, "stage") || "",
    q = "%" + (queryValue(request, "q") || "").trim().slice(0, 100) + "%";
  const queue = queryValue(request, "queue") || "orders";
  const queueStatuses: Record<string, string[]> = {
    confirmation: ["abandoned", "complete"],
    incomplete: ["abandoned", "not_responding"],
    shipping: ["confirmed"],
    returns: ["returned"],
    completed: ["delivered"],
    trash: ["trashed"],
  };
  const allowed = queueStatuses[queue] || [
    "abandoned",
    "complete",
    "confirmed",
    "not_responding",
    "shipped",
    "delivered",
    "returned",
    "cancelled",
  ];
  const from = queryValue(request, "from") || "1970-01-01",
    to = queryValue(request, "to") || "2100-01-01";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    response.status(400).json({ error: "Invalid dates" });
    return;
  }
  const orders =
    await sql!`SELECT ${sql!.unsafe(selectColumns)} FROM atlasio_orders WHERE (status=ANY(${allowed}::text[]) OR (${queue}='shipping' AND shipment_status='failed')) AND (${queue}<>'tracking' OR (ecotrack_tracking IS NOT NULL AND status NOT IN ('delivered','returned'))) AND (${status}='' OR status=${status}) AND (${stage}='' OR ecotrack_status=${stage}) AND concat_ws(' ',phone,full_name,wilaya,commune,campaign,ecotrack_tracking,lead_id) ILIKE ${q} AND created_at>=(${from}::date AT TIME ZONE 'Africa/Algiers') AND created_at<((${to}::date+INTERVAL '1 day') AT TIME ZONE 'Africa/Algiers') ORDER BY created_at DESC,id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
  const counts =
    await sql!`SELECT COUNT(*)::int AS total FROM atlasio_orders WHERE (status=ANY(${allowed}::text[]) OR (${queue}='shipping' AND shipment_status='failed')) AND (${queue}<>'tracking' OR (ecotrack_tracking IS NOT NULL AND status NOT IN ('delivered','returned'))) AND (${status}='' OR status=${status}) AND (${stage}='' OR ecotrack_status=${stage}) AND concat_ws(' ',phone,full_name,wilaya,commune,campaign,ecotrack_tracking,lead_id) ILIKE ${q} AND created_at>=(${from}::date AT TIME ZONE 'Africa/Algiers') AND created_at<((${to}::date+INTERVAL '1 day') AT TIME ZONE 'Africa/Algiers')`;
  const summary =
    await sql!`SELECT status,COUNT(*)::int AS count,COALESCE(SUM(price+delivery_fee),0)::bigint AS amount FROM atlasio_orders GROUP BY status`;
  const stages =
    await sql!`SELECT DISTINCT ecotrack_status FROM atlasio_orders WHERE ecotrack_status IS NOT NULL ORDER BY ecotrack_status`;
  response.status(200).json({
    orders,
    page,
    total: counts[0]?.total || 0,
    summary,
    stages: stages.map(r => r.ecotrack_status),
  });
}
