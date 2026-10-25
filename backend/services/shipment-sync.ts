import { sql } from "../repositories/connection.js";
import {
  loadEcoSettings,
  rowById,
  saveShipmentUpdate,
  recordEvent,
  textValue,
} from "../repositories/index.js";
import {
  fetchEcoTrackTrackingsInfo,
  latestEcoTrackActivity,
  fetchEcoTrackTracking,
  fetchEcoTrackUpdates,
} from "../integrations/ecotrack/client.js";
import { shippingStatus } from "../../shared/shipping-status.js";
export async function persistTracking(
  order: NonNullable<Awaited<ReturnType<typeof rowById>>>,
  detail: Record<string, unknown>
) {
  const activities = Array.isArray(detail.activity)
    ? (detail.activity as Record<string, unknown>[])
    : [];
  const latest = latestEcoTrackActivity(activities);
  const stateActivity = latestEcoTrackActivity(
    activities.filter(
      item => item.status && item.status !== "notification_on_order"
    )
  );
  const raw = String(detail.status || stateActivity.status || "");
  if (!raw) throw new Error("لم تُرجع الشركة حالة الشحنة");
  const state = shippingStatus(raw);
  const terminal =
    state.group === "paid" || state.group === "delivered"
      ? "delivered"
      : state.group === "returned"
        ? "returned"
        : state.group === "cancelled"
          ? "cancelled"
          : null;
  const timestamp = stateActivity.date
    ? `${stateActivity.date} ${stateActivity.time || "00:00:00"}+01:00`
    : null;
  for (const activity of activities)
    await saveShipmentUpdate(
      order.id,
      order.ecotrack_tracking!,
      "tracking",
      activity
    );
  const applied =
    await sql!`UPDATE atlasio_orders SET ecotrack_status=${raw},shipment_status=${state.group},status=CASE WHEN status='trashed' THEN status ELSE COALESCE(${terminal},status) END,
 payment_status=CASE WHEN ${state.group}='paid' THEN 'paid' WHEN ${state.key}='encaisse_non_paye' THEN 'collected' WHEN ${state.key}='paiements_prets' THEN 'payout_ready' ELSE payment_status END,
 ecotrack_driver=COALESCE(${textValue(detail.driver ?? latest.driver ?? latest.livreur)},ecotrack_driver),ecotrack_driver_phone=COALESCE(${textValue(detail.driver_phone ?? latest.driver_phone)},ecotrack_driver_phone),
 ecotrack_desk_phone=COALESCE(${textValue(detail.desk_phone ?? latest.desk_phone)},ecotrack_desk_phone),ecotrack_station=COALESCE(${textValue(detail.station ?? latest.station ?? latest.scanLocation)},ecotrack_station),
 ecotrack_last_note=COALESCE(${textValue(latest.reason ?? latest.remarque ?? latest.details)},ecotrack_last_note),
 ecotrack_last_activity_at=COALESCE(${timestamp}::timestamptz,ecotrack_last_activity_at),ecotrack_status_at=COALESCE(${timestamp}::timestamptz,ecotrack_status_at),ecotrack_last_synced_at=NOW(),sync_attempt_at=NOW(),ecotrack_sync_error=NULL,updated_at=NOW()
 WHERE id=${order.id} AND (${timestamp}::timestamptz IS NULL OR ecotrack_status_at IS NULL OR ${timestamp}::timestamptz>=ecotrack_status_at) RETURNING id`;
  if (!applied.length) {
    await sql!`UPDATE atlasio_orders SET ecotrack_last_synced_at=NOW(),sync_attempt_at=NOW(),ecotrack_sync_error=NULL WHERE id=${order.id}`;
    return;
  }
  if (order.ecotrack_status !== raw)
    await recordEvent(
      order.id,
      "ecotrack_status_updated",
      `EcoTrack: ${raw}`,
      order.ecotrack_status,
      raw
    );
}
export async function refreshShipment(id: number) {
  const order = await rowById(id);
  if (!order?.ecotrack_tracking) throw new Error("لا توجد شحنة مرتبطة");
  const settings = await loadEcoSettings(
    order.shipping_provider_id || undefined
  );
  const results = await Promise.allSettled([
    fetchEcoTrackTracking(order.ecotrack_tracking, settings),
    fetchEcoTrackUpdates(order.ecotrack_tracking, settings),
  ]);
  if (results[0].status === "fulfilled")
    await persistTracking(order, {
      status: results[0].value.status,
      activity: results[0].value.activity,
    });
  else throw results[0].reason;
  if (results[1].status === "fulfilled")
    for (const note of results[1].value)
      await saveShipmentUpdate(
        order.id,
        order.ecotrack_tracking,
        "company_note",
        note
      );
  return {
    order: await rowById(id),
    warnings:
      results[1].status === "rejected" ? ["تعذر تحميل ملاحظات الشركة"] : [],
  };
}
export async function syncShipments(
  settings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  const providers = settings.providers.length
    ? [...settings.providers]
    : [
        {
          id: settings.providerId,
          provider: settings.provider,
          token: settings.token,
        },
      ];
  const attempts =
    await sql!`SELECT account_id,last_attempt FROM mv_provider_sync`;
  const previous = new Map(
    attempts.map(row => [
      String(row.account_id),
      new Date(row.last_attempt as string).getTime(),
    ])
  );
  providers.sort(
    (a, b) => (previous.get(a.id) || 0) - (previous.get(b.id) || 0)
  );
  const started = Date.now(),
    results = [];
  let synced = 0,
    total = 0;
  for (const provider of providers) {
    if (Date.now() - started > 35_000) break;
    const owner = crypto.randomUUID(),
      key = "sync:" + provider.id;
    const locks =
      await sql!`INSERT INTO mv_jobs(key,locked_until,owner) VALUES(${key},NOW()+INTERVAL '90 seconds',${owner}) ON CONFLICT(key) DO UPDATE SET locked_until=EXCLUDED.locked_until,owner=EXCLUDED.owner WHERE mv_jobs.locked_until<NOW() RETURNING key`;
    if (!locks.length) {
      results.push({
        provider: provider.provider,
        error: "المزامنة قيد التنفيذ",
      });
      continue;
    }
    await sql!`INSERT INTO mv_provider_sync(account_id) VALUES(${provider.id}) ON CONFLICT(account_id) DO UPDATE SET last_attempt=NOW()`;
    try {
      const rows =
        await sql!`SELECT * FROM atlasio_orders WHERE ecotrack_tracking IS NOT NULL AND status<>'trashed' AND shipping_provider_id=${provider.id} AND (sync_attempt_at IS NULL OR sync_attempt_at<NOW()-CASE WHEN status IN ('delivered','returned','cancelled') THEN INTERVAL '24 hours' ELSE INTERVAL '3 minutes' END) ORDER BY sync_attempt_at ASC NULLS FIRST LIMIT 100`;
      total += rows.length;
      let count = 0;
      const errors = [];
      if (rows.length) {
        const details = await fetchEcoTrackTrackingsInfo(
          rows.map(r => String(r.ecotrack_tracking)),
          provider
        );
        for (const row of rows) {
          try {
            if (!details[String(row.ecotrack_tracking)])
              throw new Error("لا توجد تفاصيل في رد الشركة");
            await persistTracking(
              row as unknown as NonNullable<
                Awaited<ReturnType<typeof rowById>>
              >,
              details[String(row.ecotrack_tracking)]
            );
            count++;
            synced++;
          } catch (e) {
            const message = e instanceof Error ? e.message : "Sync failed";
            await sql!`UPDATE atlasio_orders SET sync_attempt_at=NOW(),ecotrack_sync_error=${message} WHERE id=${row.id}`;
            errors.push({ id: row.id, error: message });
          }
        }
      }
      results.push({
        provider: provider.provider,
        fetched: rows.length,
        matched: rows.length,
        synced: count,
        errors,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Sync failed";
      await sql!`UPDATE atlasio_orders SET sync_attempt_at=NOW(),ecotrack_sync_error=${message} WHERE shipping_provider_id=${provider.id} AND ecotrack_tracking IS NOT NULL AND status<>'trashed'`;
      results.push({ provider: provider.provider, error: message });
    } finally {
      await sql!`DELETE FROM mv_jobs WHERE key=${key} AND owner=${owner}`;
    }
  }
  return { synced, matched: total, total, providers: results };
}
