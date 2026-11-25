import { waitUntil } from "@vercel/functions";
import { sql } from "../repositories/connection.js";
import {
  loadCapiSettings,
  type CapiSettings,
} from "../repositories/settings.js";
import {
  buildUserData,
  CapiError,
  sendCapiEvents,
  type CapiEvent,
  type MetaContext,
} from "../integrations/meta/capi.js";

export type CapiEventName =
  "Lead" | "Purchase" | "OrderConfirmed" | "OrderDelivered" | "OrderReturned";

const PREFIX: Record<CapiEventName, string> = {
  Lead: "lead",
  Purchase: "purchase",
  OrderConfirmed: "confirmed",
  OrderDelivered: "delivered",
  OrderReturned: "returned",
};

/** Same id the browser Pixel sends, so Meta counts the event once. */
export const capiEventId = (name: CapiEventName, leadId: string) =>
  `${PREFIX[name]}.${leadId}`;

export type CapiOrder = {
  id?: number | string | null;
  lead_id: string;
  phone?: unknown;
  full_name?: unknown;
  wilaya?: unknown;
  commune?: unknown;
  price?: unknown;
  quantity?: unknown;
  order_snapshot?: unknown;
};

const parsed = <T>(value: unknown): T | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
  return value as T;
};

export function buildCapiEvent(
  name: CapiEventName,
  order: CapiOrder,
  context?: MetaContext | null,
  now = Date.now()
): CapiEvent {
  const snapshot =
    parsed<{ name?: string; tracking?: { contentId?: string } }>(
      order.order_snapshot
    ) || {};
  const ctx = context || {};
  // Meta requires the browser's user agent for website events.
  const website = Boolean(ctx.userAgent);
  return {
    event_name: name,
    event_id: capiEventId(name, order.lead_id),
    event_time: Math.floor(now / 1000),
    action_source: website ? "website" : "system_generated",
    ...(website && ctx.sourceUrl ? { event_source_url: ctx.sourceUrl } : {}),
    user_data: buildUserData(order, ctx),
    custom_data: {
      currency: "DZD",
      value: Number(order.price) || 0,
      order_id: order.lead_id,
      content_type: "product",
      ...(snapshot.tracking?.contentId
        ? { content_ids: [snapshot.tracking.contentId] }
        : {}),
      ...(snapshot.name ? { content_name: snapshot.name } : {}),
      num_items: Number(order.quantity) || 1,
    },
  };
}

/** Queues one event. Returns false when CAPI is off or it was already queued. */
export async function enqueueCapiEvent(
  name: CapiEventName,
  order: CapiOrder,
  context?: MetaContext | null,
  settings?: CapiSettings
) {
  if (!sql) return false;
  const capi = settings ?? (await loadCapiSettings());
  if (!capi.enabled) return false;
  const event = buildCapiEvent(name, order, context);
  const rows =
    await sql`INSERT INTO mv_capi_events(event_id,event_name,order_id,payload) VALUES(${event.event_id},${name},${order.id ?? null},${JSON.stringify(event)}::jsonb) ON CONFLICT(event_id) DO NOTHING RETURNING event_id`;
  return rows.length > 0;
}

/**
 * Queues a later status event (confirmed, delivered, returned) from the stored
 * order and the customer's saved browser context, never the admin's request.
 */
export async function enqueueStatusEvent(name: CapiEventName, orderId: number) {
  if (!sql) return false;
  const capi = await loadCapiSettings();
  if (!capi.enabled) return false;
  const rows =
    await sql`SELECT id,lead_id,phone,full_name,wilaya,commune,price,quantity,order_snapshot,meta_context FROM atlasio_orders WHERE id=${orderId}`;
  const order = rows[0] as (CapiOrder & { meta_context?: unknown }) | undefined;
  if (!order) return false;
  const queued = await enqueueCapiEvent(
    name,
    order,
    parsed<MetaContext>(order.meta_context),
    capi
  );
  if (queued) scheduleCapi();
  return queued;
}

/** Sends due events one by one, so one rejected event never blocks others. */
export async function flushCapi(limit = 20) {
  if (!sql) return { sent: 0, failed: 0 };
  const capi = await loadCapiSettings();
  if (!capi.enabled) return { sent: 0, failed: 0 };
  // Meta rejects events older than 7 days.
  await sql`UPDATE mv_capi_events SET status='expired',payload=NULL,locked_until=NULL WHERE status IN ('pending','processing') AND created_at<NOW()-INTERVAL '160 hours'`;
  const jobs =
    await sql`WITH candidates AS(SELECT event_id FROM mv_capi_events WHERE (status='pending' AND available_at<=NOW()) OR (status='processing' AND locked_until<NOW()) ORDER BY created_at LIMIT ${limit} FOR UPDATE SKIP LOCKED) UPDATE mv_capi_events e SET status='processing',locked_until=NOW()+INTERVAL '5 minutes' FROM candidates c WHERE e.event_id=c.event_id RETURNING e.event_id,e.payload,e.attempts`;
  let sent = 0,
    failed = 0;
  for (const job of jobs) {
    const event = parsed<CapiEvent>(job.payload);
    try {
      if (!event) throw new CapiError("Missing event payload", false);
      await sendCapiEvents(
        capi.pixelId,
        capi.token,
        [event],
        capi.testEventCode || undefined
      );
      await sql`UPDATE mv_capi_events SET status='sent',sent_at=NOW(),payload=NULL,locked_until=NULL,last_error=NULL WHERE event_id=${job.event_id}`;
      sent++;
    } catch (error) {
      const attempts = Number(job.attempts) + 1,
        delay = Math.min(3600, 2 ** attempts * 15);
      const retryable = error instanceof CapiError ? error.retryable : true;
      const status = !retryable || attempts >= 8 ? "failed" : "pending";
      const message =
        error instanceof Error
          ? error.message.slice(0, 300)
          : "Meta delivery failed";
      await sql`UPDATE mv_capi_events SET status=${status},attempts=${attempts},available_at=NOW()+(${delay} * INTERVAL '1 second'),locked_until=NULL,last_error=${message} WHERE event_id=${job.event_id}`;
      failed++;
    }
  }
  return { sent, failed };
}

/** Daily housekeeping: old queue rows and saved browser context. */
export async function cleanupCapi() {
  if (!sql) return;
  await sql`DELETE FROM mv_capi_events WHERE status IN ('sent','expired') AND created_at<NOW()-INTERVAL '30 days'`;
  await sql`UPDATE atlasio_orders SET meta_context=NULL WHERE meta_context IS NOT NULL AND created_at<NOW()-INTERVAL '30 days'`;
}

export async function capiSummary() {
  if (!sql) return { counts: {}, lastError: null };
  const counts =
    (await sql`SELECT status, COUNT(*)::int AS count FROM mv_capi_events GROUP BY status`) as Array<{
      status: string;
      count: number;
    }>;
  const failed =
    await sql`SELECT event_name,last_error,created_at FROM mv_capi_events WHERE status='failed' ORDER BY created_at DESC LIMIT 1`;
  return {
    counts: Object.fromEntries(counts.map(row => [row.status, row.count])),
    lastError: failed[0] || null,
  };
}

export const scheduleCapi = () => {
  if (process.env.NODE_ENV === "test") return;
  const task = flushCapi().catch(() => ({ sent: 0, failed: 1 }));
  if (process.env.VERCEL) waitUntil(task);
};
