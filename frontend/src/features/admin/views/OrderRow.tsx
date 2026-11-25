import type { MouseEvent } from "react";
import { Check, Phone, Truck, X } from "lucide-react";
import type { Order } from "@shared/orders";
import { shippingStatus } from "@shared/shipping-status";
import type { DashboardContext } from "../useDashboard";
import { canConfirmOrder } from "../ui/order-ui";
import {
  statusLabels,
  statusTones,
  type StatusTone as Tone,
} from "../presentation";

/** One label and one color per order: carrier status wins once shipped. */
export function orderStatusView(order: Order): { label: string; tone: Tone } {
  if (order.ecotrack_tracking) {
    const state = shippingStatus(order.ecotrack_status);
    const tone: Tone =
      state.group === "delivered" || state.group === "paid"
        ? "green"
        : state.group === "returned"
          ? "red"
          : state.group === "cancelled"
            ? "gray"
            : state.group === "failed_delivery"
              ? "amber"
              : "indigo";
    return { label: state.label.split(" — ").pop() || state.label, tone };
  }
  return {
    label: statusLabels[order.status] || order.status,
    tone: statusTones[order.status] || "gray",
  };
}

const relative = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
export function timeAgo(value: string, now = Date.now()) {
  const minutes = Math.round((new Date(value).getTime() - now) / 60000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 7) return relative.format(days, "day");
  return new Intl.DateTimeFormat("ar-DZ", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

const place = (wilaya: string | null) =>
  (wilaya || "").replace(/^\s*\d+\s*-\s*/, "");

/** Stops row clicks from opening the order when a control is used. */
const keep = (event: MouseEvent) => event.stopPropagation();

export function OrderRow({
  order,
  context: c,
}: {
  order: Order;
  context: DashboardContext;
}) {
  const selected = c.selectedIds.includes(order.id);
  const status = orderStatusView(order);
  const confirmable =
    !order.ecotrack_tracking &&
    ["abandoned", "complete", "not_responding"].includes(order.status);
  const shippable = order.status === "confirmed" && !order.ecotrack_tracking;
  const name = order.full_name?.trim() || "عميل بدون اسم";
  return (
    <div
      className={"ops-row" + (selected ? " is-selected" : "")}
      onClick={() => c.openOrder(order)}
    >
      <div className="ops-cell ops-col-check" onClick={keep}>
        <input
          type="checkbox"
          className="ops-check"
          checked={selected}
          onChange={() => c.toggleSelected(order.id)}
          aria-label={"تحديد طلب " + name}
        />
      </div>
      <div className="ops-cell ops-col-customer">
        <button
          type="button"
          className="ops-name"
          onClick={event => {
            keep(event);
            c.openOrder(order);
          }}
        >
          <span className="ops-primary">{name}</span>
          <span className="ops-secondary ops-phone num">{order.phone}</span>
        </button>
      </div>
      <div className="ops-cell ops-col-destination">
        <span className="ops-primary">
          {place(order.wilaya) || "العنوان غير مكتمل"}
        </span>
        <span className="ops-secondary">
          {[
            order.commune,
            order.delivery_type === "stop_desk" ? "مكتب الشحن" : "المنزل",
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      <div className="ops-cell ops-col-product">
        <span className="ops-primary">
          {order.order_snapshot?.name || order.campaign || "—"}
        </span>
        <span className="ops-secondary num">× {order.quantity || 1}</span>
      </div>
      <div className="ops-cell ops-col-amount">
        <span className="ops-amount num">
          {(order.price + (order.delivery_fee || 0)).toLocaleString("en-US")}{" "}
          <small>دج</small>
        </span>
      </div>
      <div className="ops-cell ops-col-status">
        <span className={"ops-badge " + status.tone}>{status.label}</span>
        <span className="ops-secondary num" title={order.created_at}>
          {timeAgo(order.created_at)}
        </span>
      </div>
      <div className="ops-cell ops-col-actions" onClick={keep}>
        <div className="ops-actions">
          {confirmable && (
            <>
              <button
                type="button"
                className="ops-btn small primary"
                disabled={c.loading || c.contactBusy || !canConfirmOrder(order)}
                title={
                  canConfirmOrder(order) ? undefined : "رقم الهاتف غير مكتمل"
                }
                onClick={() => void c.recordContact(order, "confirmed")}
              >
                <Check size={15} />
                تأكيد
              </button>
              <button
                type="button"
                className="ops-btn small icon"
                aria-label={"رفض طلب " + name}
                title="رفض"
                disabled={c.loading || c.contactBusy}
                onClick={() => void c.recordContact(order, "refused")}
              >
                <X size={15} />
              </button>
            </>
          )}
          {shippable && (
            <button
              type="button"
              className="ops-btn small primary"
              disabled={c.loading}
              onClick={() => void c.runAction(order.id, "ship")}
            >
              <Truck size={15} />
              رفع للشحن
            </button>
          )}
          <a
            className="ops-btn small icon"
            href={"tel:" + order.phone}
            aria-label={"اتصال بـ " + name}
            title="اتصال"
          >
            <Phone size={15} />
          </a>
        </div>
      </div>
    </div>
  );
}
