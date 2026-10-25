export const shippingModeFromBody = (
  body: Record<string, unknown>
): "stock" | "without_stock" | null => {
  if (body.shippingMode === "stock" || body.shippingMode === "without_stock")
    return body.shippingMode;
  if (body.shipFromStock === true) return "stock";
  if (body.shipFromStock === false) return "without_stock";
  return null;
};
