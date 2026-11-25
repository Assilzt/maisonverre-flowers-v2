import {
  sql,
  loadEcoSettings,
  loadCapiSettings,
  type CapiSettings,
} from "../repositories/index.js";
import type { Request, Response } from "../http/contracts.js";
import { publishedPage } from "../services/pages.js";
import { validateOrderInput, tokenHash } from "../services/order-input.js";
import { deliveryFees } from "../services/delivery-fees.js";
import { consumeBudget } from "../services/rate-limit.js";
import { scheduleNotifications } from "../jobs/notifications.js";
import { enqueueCapiEvent, scheduleCapi } from "../jobs/capi.js";
import { readMetaContext } from "../integrations/meta/capi.js";

const VALID_PHONE = /^(?:0[5-7]\d{8}|\+?213[5-7]\d{8})$/;

/** Tracking must never cost an order: any CAPI problem only disables it. */
const capiSettings = async (): Promise<CapiSettings | null> => {
  try {
    const settings = await loadCapiSettings();
    return settings.enabled ? settings : null;
  } catch {
    return null;
  }
};

export async function createOrder(
  request: Request,
  response: Response,
  body: Record<string, unknown>
) {
  const ip = String(request.headers["x-forwarded-for"] || "local").split(
    ","
  )[0];
  await consumeBudget("checkout:" + ip, 500, 60);
  await consumeBudget("lead:" + String(body.leadId || ""), 60, 60);
  const page = await publishedPage(
    String(body.productSlug || "flower-seed-mix")
  );
  if (!page) {
    response.status(400).json({ error: "المنتج غير متاح" });
    return;
  }
  let input: ReturnType<typeof validateOrderInput>;
  try {
    input = validateOrderInput(body, page);
  } catch (e) {
    response
      .status(400)
      .json({ error: e instanceof Error ? e.message : "بيانات غير صالحة" });
    return;
  }
  const { phone, complete, quantity, price, leadId, leadToken } = input;
  const wilaya = String(body.wilaya || "").slice(0, 120),
    commune = String(body.commune || "")
      .trim()
      .slice(0, 160);
  const free = quantity === page.freeShippingQuantity;
  const deliveryType =
    body.deliveryType === "stop_desk" ? "stop_desk" : ("home" as const);
  let fee = 0;
  if (!free && wilaya) {
    const code = Number(wilaya.match(/^\s*(\d{1,2})/)?.[1]);
    let fees: Awaited<ReturnType<typeof deliveryFees>> | null = null;
    try {
      fees = await deliveryFees(await loadEcoSettings());
    } catch (error) {
      // A draft is only a call-back lead: never lose it because fees are down.
      if (complete) throw error;
    }
    const selected = fees?.find(f => f.wilaya_id === code);
    if (fees && !selected) {
      response.status(400).json({ error: "التوصيل غير متاح لهذه الولاية" });
      return;
    }
    if (selected)
      fee =
        deliveryType === "stop_desk" ? selected.tarif_stopdesk : selected.tarif;
  }
  const status = complete ? "complete" : "abandoned";
  const campaign = String(body.campaign || page.tracking.campaignName).slice(
    0,
    64
  );
  const name = String(body.fullName || "")
      .trim()
      .slice(0, 160),
    source = String(body.sourceUrl || "").slice(0, 1000),
    hash = tokenHash(leadToken);
  // A second complete order from the same phone within a day is still saved,
  // only flagged so the team can check it during the confirmation call.
  const duplicate = complete
    ? ((await sql!`SELECT lead_id FROM atlasio_orders WHERE phone=${phone} AND lead_id<>${leadId} AND status NOT IN ('abandoned','trashed') AND created_at>NOW()-INTERVAL '24 hours' ORDER BY created_at DESC LIMIT 1`) as Array<{
        lead_id: string;
      }>)
    : [];
  const snapshot = JSON.stringify({
    slug: page.slug,
    name: page.name,
    tracking: page.tracking,
    bundle: page.bundles?.find(b => b.quantity === quantity),
    deliveryFee: fee,
    deliveryType,
    ...(duplicate[0] ? { duplicateOf: duplicate[0].lead_id } : {}),
  });
  // The customer's browser context, kept for later confirmed/delivered events.
  const capi = await capiSettings();
  const metaContext = capi ? readMetaContext(request, source) : null;
  // One SQL statement commits the order and durable notification intent together.
  const rows = await sql!`WITH saved AS (
  INSERT INTO atlasio_orders(lead_id,status,campaign,price,quantity,delivery_fee,delivery_type,phone,full_name,wilaya,commune,source_url,gift_booklet,product_slug,order_snapshot,lead_token_hash,meta_context)
  VALUES(${leadId},${status},${campaign},${price},${quantity},${fee},${deliveryType},${phone},${name || null},${wilaya || null},${commune || null},${source || null},FALSE,${page.slug},${snapshot}::jsonb,${hash},${metaContext ? JSON.stringify(metaContext) : null}::jsonb)
  ON CONFLICT(lead_id) DO UPDATE SET status=EXCLUDED.status,campaign=EXCLUDED.campaign,price=EXCLUDED.price,quantity=EXCLUDED.quantity,delivery_fee=EXCLUDED.delivery_fee,delivery_type=EXCLUDED.delivery_type,phone=EXCLUDED.phone,full_name=EXCLUDED.full_name,wilaya=EXCLUDED.wilaya,commune=EXCLUDED.commune,source_url=EXCLUDED.source_url,order_snapshot=EXCLUDED.order_snapshot,meta_context=COALESCE(EXCLUDED.meta_context,atlasio_orders.meta_context),updated_at=NOW()
  WHERE atlasio_orders.lead_token_hash=EXCLUDED.lead_token_hash AND atlasio_orders.status IN ('abandoned','complete') AND NOT(atlasio_orders.status='complete' AND EXCLUDED.status='abandoned')
  RETURNING id,lead_id,status
 ), queued AS (
  INSERT INTO mv_notification_outbox(order_id) SELECT id FROM saved
  ON CONFLICT(order_id) DO UPDATE SET version=mv_notification_outbox.version+1,status=CASE WHEN mv_notification_outbox.status='processing' THEN 'processing' ELSE 'pending' END,attempts=0,available_at=NOW(),updated_at=NOW() RETURNING order_id
 ) SELECT * FROM saved`;
  if (!rows[0]) {
    const existing =
      await sql!`SELECT id,lead_id,status FROM atlasio_orders WHERE lead_id=${leadId} AND lead_token_hash=${hash}`;
    if (!existing[0]) {
      response.status(409).json({ error: "تعذر تحديث معرّف الطلب" });
      return;
    }
    response.status(200).json({ order: existing[0] });
    return;
  }
  scheduleNotifications();
  if (capi) {
    try {
      const order = {
        id: rows[0].id,
        lead_id: leadId,
        phone,
        full_name: name,
        wilaya,
        commune,
        price,
        quantity,
        order_snapshot: snapshot,
      };
      // Same event ids as the browser Pixel, so Meta keeps one copy of each.
      if (VALID_PHONE.test(phone.replace(/\s/g, "")))
        await enqueueCapiEvent("Lead", order, metaContext, capi);
      if (complete)
        await enqueueCapiEvent("Purchase", order, metaContext, capi);
      scheduleCapi();
    } catch (error) {
      console.error(
        "CAPI enqueue",
        error instanceof Error ? error.message : "unknown"
      );
    }
  }
  response.status(200).json({ order: rows[0] });
}
