import type { MouseEvent } from "react";
import { Check, ChevronLeft, Phone, Truck, X } from "lucide-react";
import type { Order } from "@shared/orders";
import { shippingStatus } from "@shared/shipping-status";
import type { DashboardContext } from "../useDashboard";
import { canDo } from "@shared/order-flow";
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
            ? "red"
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
  selecting = false,
}: {
  order: Order;
  context: DashboardContext;
  selecting?: boolean;
}) {
  const selected = c.selectedIds.includes(order.id);
  const status = orderStatusView(order);
  // Only the next step the order flow allows is offered on the row.
  const confirmable = canDo(order, "refused");
  const canConfirm = canDo(order, "confirm");
  const shippable = canDo(order, "ship");
  const name = order.full_name?.trim() || "عميل بدون اسم";
  const where = [
    place(order.wilaya) || "العنوان غير مكتمل",
    order.commune,
    order.delivery_type === "stop_desk" ? "مكتب الشحن" : "المنزل",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <div
      className={
        "ops-row tone-" +
        status.tone +
        (selected ? " is-selected" : "") +
        (selecting ? " selecting" : "")
      }
      onClick={() =>
        selecting ? c.toggleSelected(order.id) : c.openOrder(order)
      }
    >
      <div className="ops-col-check" onClick={keep}>
        <input
          type="checkbox"
          className="ops-check"
          checked={selected}
          onChange={() => c.toggleSelected(order.id)}
          aria-label={"تحديد طلب " + name}
        />
      </div>
      <div className="ops-avatar" aria-hidden="true">
        {name.slice(0, 1)}
      </div>
      <div className="ops-main">
        <button
          type="button"
          className="ops-name"
          onClick={event => {
            keep(event);
            c.openOrder(order);
          }}
        >
          {name}
        </button>
        <span className="ops-line">{where}</span>
        <span className="ops-line small">
          <span className="ops-phone num">{order.phone}</span>
          {" · "}
          {order.order_snapshot?.name || order.campaign || "—"} ×{" "}
          <span className="num">{order.quantity || 1}</span>
        </span>
      </div>
      <div className="ops-meta">
        <span className="ops-amount num">
          {(order.price + (order.delivery_fee || 0)).toLocaleString("en-US")}{" "}
          <small>دج</small>
        </span>
        <span className={"ops-badge " + status.tone}>{status.label}</span>
        <span className="ops-time num" title={order.created_at}>
          {timeAgo(order.created_at)}
        </span>
      </div>
      <div className="ops-actions" onClick={keep}>
        {!selecting && confirmable && (
          <>
            <button
              type="button"
              className="ops-btn small primary"
              disabled={c.loading || c.contactBusy || !canConfirm}
              title={canConfirm ? undefined : "رقم الهاتف غير مكتمل"}
              onClick={() => void c.recordContact(order, "confirmed")}
            >
              <Check size={16} />
              تأكيد
            </button>
            <button
              type="button"
              className="ops-btn small round danger"
              aria-label={"رفض طلب " + name}
              title="رفض"
              disabled={c.loading || c.contactBusy}
              onClick={() => void c.recordContact(order, "refused")}
            >
              <X size={16} />
            </button>
          </>
        )}
        {!selecting && shippable && (
          <button
            type="button"
            className="ops-btn small primary"
            disabled={c.loading}
            onClick={() => void c.runAction(order.id, "ship")}
          >
            <Truck size={16} />
            رفع للشحن
          </button>
        )}
        {!selecting && (
          <a
            className="ops-btn small round tinted"
            href={"tel:" + order.phone}
            aria-label={"اتصال بـ " + name}
            title="اتصال"
          >
            <Phone size={16} />
          </a>
        )}
      </div>
      <ChevronLeft className="ops-chevron" size={18} aria-hidden="true" />
    </div>
  );
}
