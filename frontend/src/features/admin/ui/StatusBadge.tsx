import type { OrderStatus } from "@shared/orders";
import { statusLabels } from "../presentation";
import { shippingStatus } from "@shared/shipping-status";
export function StatusBadge({
  status,
  carrier = false,
}: {
  status: string | null;
  carrier?: boolean;
}) {
  const shipping = carrier ? shippingStatus(status) : null;
  const tone = carrier
    ? shipping?.group === "delivered" || shipping?.group === "paid"
      ? "success"
      : shipping?.group === "returned" || shipping?.group === "cancelled"
        ? "muted"
        : "info"
    : status === "confirmed" || status === "delivered"
      ? "success"
      : status === "shipped"
        ? "info"
        : status === "abandoned" ||
            status === "complete" ||
            status === "not_responding"
          ? "warning"
          : "muted";
  return (
    <span className={"status-badge " + tone}>
      <i aria-hidden="true" />
      {shipping?.label ||
        statusLabels[status as OrderStatus] ||
        status ||
        "غير متاح"}
    </span>
  );
}
