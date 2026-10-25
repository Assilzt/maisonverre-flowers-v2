import type { StockProduct } from "./../../shared/orders.js";
import { sql } from "./connection.js";

export const stockById = async (id: number, providerId: string) => {
  if (!Number.isInteger(id) || id <= 0) return undefined;
  const result =
    await sql!`SELECT id, name, sku, quantity, active, created_at, updated_at FROM atlasio_stock_products WHERE id = ${id} AND provider_id = ${providerId} AND active = TRUE LIMIT 1`;
  return result[0] as StockProduct | undefined;
};

export const reserveStockUnits = async (
  productId: number,
  quantity: number
) => {
  const rows =
    await sql!`UPDATE atlasio_stock_products SET quantity=quantity-${quantity},updated_at=NOW() WHERE id=${productId} AND active=TRUE AND quantity>=${quantity} RETURNING id`;
  if (!rows[0]) throw new Error("الكمية غير متاحة");
};

export const releaseStockUnits = async (
  productId: number,
  quantity: number
) => {
  await sql!`UPDATE atlasio_stock_products SET quantity=quantity+${quantity},updated_at=NOW() WHERE id=${productId}`;
};

// Cancellation and local stock release commit together, once per order.
export async function cancelLocalShipment(orderId: number) {
  await sql!`WITH cancelled AS (
    UPDATE atlasio_orders SET status='cancelled',shipment_status='cancelled',ecotrack_status='annule',updated_at=NOW()
    WHERE id=${orderId} AND status<>'cancelled'
    RETURNING stock_product_id,ship_from_stock,quantity
  ) UPDATE atlasio_stock_products SET quantity=atlasio_stock_products.quantity+cancelled.quantity,updated_at=NOW()
    FROM cancelled WHERE atlasio_stock_products.id=cancelled.stock_product_id AND cancelled.ship_from_stock=TRUE`;
}
