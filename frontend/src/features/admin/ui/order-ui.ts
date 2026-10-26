import type { Order } from "@shared/orders";
export function canConfirmOrder(order: Order) {
  return (
    !order.ecotrack_tracking &&
    ["abandoned", "complete", "not_responding"].includes(order.status) &&
    /^(0[567]\d{8}|\+213[567]\d{8})$/.test(order.phone.trim())
  );
}
