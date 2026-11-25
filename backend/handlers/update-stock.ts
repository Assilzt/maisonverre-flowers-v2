import { sql, loadEcoSettings } from "../repositories/index.js";
import type { Request, Response } from "../http/contracts.js";
export async function updateStock(
  request: Request,
  response: Response,
  body: Record<string, unknown>,
  ecoSettings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  const action = String(body.action || "");
  const name = String(body.name || "").trim();
  const sku = String(body.sku || "").trim() || null;
  const quantity = Number(body.quantity || 0);
  if (!Number.isInteger(quantity) || quantity < 0) {
    response.status(400).json({ error: "الكمية غير صالحة" });
    return;
  }
  const providerId = String(body.providerId || ecoSettings.providerId);
  await loadEcoSettings(providerId);
  if (action === "save") {
    if (!name) {
      response.status(400).json({ error: "اسم المنتج مطلوب" });
      return;
    }
    const productId = Number(body.id || 0);
    const saved =
      productId > 0
        ? await sql!`UPDATE atlasio_stock_products SET name = ${name.slice(0, 160)}, sku = ${sku}, quantity = ${quantity}, active = TRUE, updated_at = NOW() WHERE id = ${productId} RETURNING id, name, sku, quantity, active, created_at, updated_at`
        : await sql!`INSERT INTO atlasio_stock_products (name, sku, quantity,provider_id) VALUES (${name.slice(0, 160)}, ${sku}, ${quantity},${providerId}) RETURNING id, name, sku, quantity, active, created_at, updated_at`;
    response.status(200).json({ product: saved[0] });
    return;
  }
  if (action === "archive") {
    const productId = Number(body.id);
    await sql!`UPDATE atlasio_stock_products SET active = FALSE, updated_at = NOW() WHERE id = ${productId}`;
    response.status(200).json({ message: "تم أرشفة المنتج" });
    return;
  }
  response.status(400).json({ error: "إجراء المخزون غير صالح" });
  return;
}
