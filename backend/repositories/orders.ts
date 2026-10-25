import type { Order as OrderRow } from "./../../shared/orders.js";
import { sql } from "./connection.js";
import { createHash } from "node:crypto";

export const selectColumns = `id, lead_id, status, campaign, price, quantity, delivery_fee, delivery_type, phone, full_name, wilaya, commune, source_url, ecotrack_tracking, ecotrack_status, ecotrack_driver, ecotrack_driver_phone, ecotrack_desk_phone, ecotrack_station, ecotrack_last_note, ecotrack_last_activity_at, ecotrack_last_synced_at, gift_booklet, shipping_provider_id, shipping_provider_name, stock_product_id, stock_product_name, ship_from_stock, status_before_trash, trashed_at, confirmation_status, contact_result, contact_attempts, last_contacted_at, follow_up_at, shipment_status, payment_status, created_at, updated_at, remote_validated, ecotrack_sync_error, product_slug, order_snapshot`;

export const rowById = async (id: number) => {
  const result =
    await sql!`SELECT ${sql!.unsafe(selectColumns)} FROM atlasio_orders WHERE id = ${id} LIMIT 1`;
  return result[0] as OrderRow | undefined;
};

export const recordEvent = async (
  orderId: number,
  eventType: string,
  message: string,
  fromValue?: string | null,
  toValue?: string | null,
  metadata: Record<string, unknown> = {}
) => {
  try {
    await sql!`INSERT INTO atlasio_order_events (order_id, event_type, from_value, to_value, message, metadata) VALUES (${orderId}, ${eventType.slice(0, 64)}, ${fromValue || null}, ${toValue || null}, ${message.slice(0, 1000)}, ${JSON.stringify(metadata)})`;
  } catch (error) {
    console.error(
      "Atlasio order event error",
      error instanceof Error ? error.message : "unknown"
    );
  }
};

export const textValue = (value: unknown) =>
  value == null ? null : String(value).trim().slice(0, 2000) || null;

export const shipmentFingerprint = (
  orderId: number,
  tracking: string,
  source: string,
  item: Record<string, unknown>
) =>
  createHash("sha256")
    .update(JSON.stringify([orderId, tracking, source, item]))
    .digest("hex");

export const saveShipmentUpdate = async (
  orderId: number,
  tracking: string,
  source: string,
  item: Record<string, unknown>
) => {
  const activityDate = textValue(item.date ?? item.created_at);
  const activityTime = textValue(item.time);
  const note = textValue(
    item.reason ?? item.remarque ?? item.content ?? item.details
  );
  const details = textValue(item.details);
  const station = textValue(item.station);
  const driver = textValue(item.driver ?? item.livreur);
  const driverPhone = textValue(item.driver_phone);
  const deskPhone = textValue(item.desk_phone);
  const postponedTo = textValue(item.postponed_to);
  const status = textValue(item.status ?? item.activity);
  const fingerprint = shipmentFingerprint(orderId, tracking, source, item);
  await sql!`
    INSERT INTO atlasio_shipment_updates (order_id, tracking, source, status, reason, details, station, driver, driver_phone, desk_phone, activity_date, activity_time, postponed_to, fingerprint, raw_payload)
    VALUES (${orderId}, ${tracking}, ${source}, ${status}, ${note}, ${details}, ${station}, ${driver}, ${driverPhone}, ${deskPhone}, ${activityDate}, ${activityTime}, ${postponedTo}, ${fingerprint}, ${JSON.stringify(item)})
    ON CONFLICT (fingerprint) DO NOTHING
  `;
  return {
    note,
    station,
    driver,
    driverPhone,
    deskPhone,
    activityDate,
    activityTime,
  };
};

export const canManualTransition = (order: OrderRow, nextStatus: string) => {
  if (order.ecotrack_tracking) return false;
  if (nextStatus === "confirmed")
    return ["abandoned", "complete", "not_responding"].includes(order.status);
  if (nextStatus === "cancelled")
    return ["abandoned", "complete", "not_responding", "confirmed"].includes(
      order.status
    );
  return false;
};
