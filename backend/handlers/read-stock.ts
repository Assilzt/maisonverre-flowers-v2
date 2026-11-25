import { sql, StockProduct, loadEcoSettings } from "../repositories/index.js";
import { isAdmin, queryValue } from "../http/request.js";
import type { Request, Response } from "../http/contracts.js";
import { fetchEcoTrackProducts } from "../integrations/ecotrack/client.js";

export async function stock(
  request: Request,
  response: Response,
  ecoSettings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  if (!isAdmin(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  const requestedProviderId =
    queryValue(request, "providerId") || ecoSettings.providerId;
  const providerSettings = await loadEcoSettings(requestedProviderId);
  if (queryValue(request, "mode") === "local") {
    const products =
      await sql!`SELECT * FROM atlasio_stock_products WHERE active=TRUE AND provider_id=${providerSettings.providerId} ORDER BY name`;
    response.status(200).json({ products });
    return;
  }
  const remoteProducts = await fetchEcoTrackProducts(providerSettings);
  if (remoteProducts.length === 0) {
    const products =
      (await sql!`SELECT id, name, sku, quantity, active, created_at, updated_at FROM atlasio_stock_products WHERE active = TRUE AND provider_id = ${providerSettings.providerId} ORDER BY name ASC`) as StockProduct[];
    response.status(200).json({
      products,
      providerId: providerSettings.providerId,
      providerName: providerSettings.providerName,
      synced: 0,
      preserved: true,
    });
    return;
  }
  for (const product of remoteProducts) {
    const existing =
      await sql!`SELECT id FROM atlasio_stock_products WHERE provider_id = ${providerSettings.providerId} AND provider_product_id = ${product.id} LIMIT 1`;
    if (existing[0]) {
      await sql!`UPDATE atlasio_stock_products SET name = ${product.name.slice(0, 160)}, sku = ${product.reference}, quantity = ${Math.floor(product.quantity)}, active = TRUE, updated_at = NOW() WHERE id = ${existing[0].id}`;
    } else {
      await sql!`INSERT INTO atlasio_stock_products (name, sku, quantity, active, provider_id, provider_product_id) VALUES (${product.name.slice(0, 160)}, ${product.reference}, ${Math.floor(product.quantity)}, TRUE, ${providerSettings.providerId}, ${product.id})`;
    }
  }
  const remoteIds = remoteProducts.map(product => product.id);
  const existingProducts =
    (await sql!`SELECT id, provider_product_id FROM atlasio_stock_products WHERE provider_id = ${providerSettings.providerId}`) as Array<{
      id: number;
      provider_product_id: string | null;
    }>;
  for (const product of existingProducts) {
    if (
      product.provider_product_id &&
      !remoteIds.includes(product.provider_product_id)
    ) {
      await sql!`UPDATE atlasio_stock_products SET active = FALSE, updated_at = NOW() WHERE id = ${product.id}`;
    }
  }
  const products =
    (await sql!`SELECT id, name, sku, quantity, active, created_at, updated_at FROM atlasio_stock_products WHERE active = TRUE AND provider_id = ${providerSettings.providerId} ORDER BY name ASC`) as StockProduct[];
  response.status(200).json({
    products,
    providerId: providerSettings.providerId,
    providerName: providerSettings.providerName,
    synced: remoteProducts.length,
  });
  return;
}
