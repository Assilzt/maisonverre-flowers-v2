import { UncertainShipmentError } from "../integrations/ecotrack/parcels.js";
import {
  sql,
  selectColumns,
  loadEcoSettings,
  rowById,
  stockById,
  reserveStockUnits,
  releaseStockUnits,
  recordEvent,
} from "../repositories/index.js";
import type { Request, Response } from "../http/contracts.js";
import { shippingModeFromBody } from "../services/shipping-input.js";
import {
  createEcoTrackNonStockParcel,
  createEcoTrackStockParcel,
} from "../integrations/ecotrack/client.js";

export async function updateShip(
  request: Request,
  response: Response,
  body: Record<string, unknown>,
  ecoSettings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  const orderId = Number(body.id);
  const order = await rowById(orderId);
  if (!order) {
    response.status(404).json({ error: "الطلب غير موجود" });
    return;
  }
  if (order.status !== "confirmed") {
    response.status(409).json({ error: "يمكن شحن الطلبات المؤكدة فقط" });
    return;
  }
  if (order.ecotrack_tracking) {
    response.status(200).json({ order, message: "الشحنة مرفوعة مسبقاً" });
    return;
  }
  const shippingMode = shippingModeFromBody(body);
  if (!shippingMode) {
    response
      .status(400)
      .json({ error: "حدد طريقة الشحن: من المخزون أو بدون مخزون" });
    return;
  }
  const useStock = shippingMode === "stock";
  const selectedProviderId = String(
    body.providerId || order.shipping_provider_id || ecoSettings.providerId
  );
  const selectedSettings = await loadEcoSettings(selectedProviderId);
  const shipmentQuantity = order.quantity || 1;
  const selectedProduct = useStock
    ? await stockById(
        Number(body.stockProductId || order.stock_product_id || 0),
        selectedProviderId
      )
    : null;
  if (useStock && selectedSettings.kind === "osen" && !selectedProduct?.sku) {
    response
      .status(400)
      .json({ error: "اختر منتج Osen بمرجع SKU من كتالوج المخزون قبل الشحن" });
    return;
  }

  if (body.stockProductId && !selectedProduct) {
    response
      .status(400)
      .json({ error: "منتج المخزون المختار غير متاح لهذا الحساب" });
    return;
  }
  // EcoTrack's standard API represents stock with stock=1 and quantite;
  // it does not require a product id from a remote product catalogue.
  if (
    useStock &&
    selectedProduct &&
    selectedProduct.quantity < shipmentQuantity
  ) {
    response
      .status(409)
      .json({ error: "الكمية المطلوبة غير متوفرة في المخزون" });
    return;
  }

  const claim =
    await sql!`UPDATE atlasio_orders SET shipment_status = 'processing', shipping_provider_id = ${selectedSettings.providerId}, shipping_provider_name = ${selectedSettings.providerName}, stock_product_id = ${selectedProduct?.id || null}, ship_from_stock = ${useStock}, updated_at = NOW() WHERE id = ${orderId} AND status = 'confirmed' AND ecotrack_tracking IS NULL AND COALESCE(shipment_status, '') NOT IN ('processing','uncertain') RETURNING id`;
  if (!claim[0]) {
    response.status(409).json({
      error:
        "الشحنة قيد المعالجة أو تم رفعها مسبقاً، انتظر النتيجة قبل إعادة المحاولة",
    });
    return;
  }

  const productName =
    selectedProduct?.sku ||
    selectedProduct?.name ||
    (order.product_slug && order.product_slug !== "flower-seed-mix"
      ? order.order_snapshot?.name
      : null) ||
    "بذور الزهور - 4 أنواع";
  const createParcel = useStock
    ? createEcoTrackStockParcel
    : createEcoTrackNonStockParcel;
  let stockReserved = false;
  let tracking: string;

  try {
    if (useStock && selectedProduct) {
      await reserveStockUnits(selectedProduct.id, shipmentQuantity);
      stockReserved = true;
    }

    tracking = await createParcel(
      {
        leadId: order.lead_id,
        price: order.price,
        deliveryFee: order.delivery_fee,
        phone: order.phone,
        fullName: order.full_name,
        wilaya: order.wilaya,
        commune: order.commune,
        deliveryType: order.delivery_type,
        giftBooklet: order.gift_booklet,
        productName,
        quantity: shipmentQuantity,
      },
      selectedSettings
    );
  } catch (shipError) {
    if (
      !(shipError instanceof UncertainShipmentError) &&
      stockReserved &&
      selectedProduct
    )
      await releaseStockUnits(selectedProduct.id, shipmentQuantity);
    await sql!`UPDATE atlasio_orders SET shipment_status = ${shipError instanceof UncertainShipmentError ? "uncertain" : "failed"}, updated_at = NOW() WHERE id = ${orderId} AND ecotrack_tracking IS NULL`;
    throw shipError;
  }

  const updated =
    await sql!`UPDATE atlasio_orders SET status = 'shipped', shipment_status = 'shipped', ecotrack_tracking = ${tracking}, ecotrack_status = 'created', shipping_provider_id = ${selectedSettings.providerId}, shipping_provider_name = ${selectedSettings.providerName}, stock_product_id = ${useStock && selectedProduct ? selectedProduct.id : null}, stock_product_name = ${useStock && selectedProduct ? selectedProduct.name : null}, ship_from_stock = ${useStock}, updated_at = NOW() WHERE id = ${orderId} RETURNING ${sql!.unsafe(selectColumns)}`;
  await recordEvent(
    orderId,
    "shipment_succeeded",
    `تم قبول الشحنة من ${selectedSettings.providerName} برقم تتبع ${tracking}`,
    "shipping",
    "shipped",
    { tracking, providerId: selectedSettings.providerId }
  );
  response.status(200).json({
    order: updated[0],
    message: "تم رفع الشحنة إلى EcoTrack",
    tracking,
  });
  return;
}
