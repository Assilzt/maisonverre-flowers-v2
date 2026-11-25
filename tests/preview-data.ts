import type { testDatabase } from "./database";
import { previewOrders } from "./preview-catalog";

/** Fills the isolated preview database with ~150 fake orders. */
export async function seedPreviewOrders(
  db: Awaited<ReturnType<typeof testDatabase>>
) {
  if (process.env.NODE_ENV !== "test" || process.env.DATABASE_URL)
    throw new Error("Preview data requires an isolated fixture database");
  for (const order of previewOrders())
    await db.query(
      `INSERT INTO atlasio_orders(lead_id,status,phone,full_name,wilaya,commune,price,delivery_fee,delivery_type,quantity,product_slug,order_snapshot,shipping_provider_id,shipping_provider_name,ecotrack_tracking,ecotrack_status,shipment_status,payment_status,confirmation_status,contact_result,contact_attempts,status_before_trash,trashed_at,created_at,updated_at)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'flower-seed-mix',$11::jsonb,'default','حساب تجريبي',$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$21)`,
      [
        order.lead_id,
        order.status,
        order.phone,
        order.full_name,
        order.wilaya,
        order.commune,
        order.price,
        order.delivery_fee,
        order.delivery_type,
        order.quantity,
        JSON.stringify(order.snapshot),
        order.tracking,
        order.carrier,
        order.shipment_status,
        order.payment_status,
        order.confirmation_status,
        order.contact_result,
        order.contact_attempts,
        order.status_before_trash,
        order.status === "trashed" ? order.created_at : null,
        order.created_at,
      ]
    );
}
