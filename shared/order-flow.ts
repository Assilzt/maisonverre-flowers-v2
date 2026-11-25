/**
 * The order lifecycle, in one place for the server and the dashboard.
 * An order only moves one sensible step at a time:
 *
 *   new ─► confirmed ─► shipped ─► delivered
 *    │         │            └────► returned
 *    └─► cancelled ◄────────┘ (before shipping)
 *
 * Shipped, delivered and returned are set by the carrier sync, never by hand.
 */
export type FlowOrder = {
  status: string;
  phone?: string | null;
  ecotrack_tracking?: string | null;
  shipment_status?: string | null;
};

export type FlowAction =
  | "confirm"
  | "no_answer"
  | "busy"
  | "call_later"
  | "wrong_number"
  | "refused"
  | "ship"
  | "unconfirm"
  | "cancel"
  | "reopen";

const NEW = ["abandoned", "complete", "not_responding"];
const COMPLETE_PHONE = /^(0[567]\d{8}|\+213[567]\d{8})$/;

export const hasCompletePhone = (order: FlowOrder) =>
  COMPLETE_PHONE.test(String(order.phone || "").replace(/\s/g, ""));

/** The next steps allowed from where the order is now. */
export function allowedActions(order: FlowOrder): FlowAction[] {
  if (order.ecotrack_tracking) return [];
  if (NEW.includes(order.status))
    return [
      ...(hasCompletePhone(order) ? (["confirm"] as const) : []),
      "no_answer",
      "busy",
      "call_later",
      "wrong_number",
      "refused",
    ];
  if (order.status === "confirmed")
    return ["processing", "uncertain"].includes(order.shipment_status || "")
      ? []
      : ["ship", "unconfirm", "cancel"];
  if (order.status === "cancelled") return ["reopen"];
  return [];
}

export const canDo = (order: FlowOrder, action: FlowAction) =>
  allowedActions(order).includes(action);

/** The status a manual action leads to (contact results are handled apart). */
export const manualTarget: Partial<Record<FlowAction, string>> = {
  confirm: "confirmed",
  cancel: "cancelled",
  unconfirm: "complete",
  reopen: "complete",
};

/** Can this order go to the trash? Not while a parcel is on its way. */
export const canTrash = (order: FlowOrder) =>
  order.status !== "trashed" &&
  !(order.ecotrack_tracking && order.status === "shipped");

/** Progress for the stepper: 0 new, 1 confirmed, 2 shipped, 3 delivered. */
export function orderStage(order: FlowOrder): {
  step: number;
  ended?: "cancelled" | "returned";
} {
  if (order.status === "cancelled") return { step: 0, ended: "cancelled" };
  if (order.status === "returned") return { step: 2, ended: "returned" };
  if (order.status === "delivered") return { step: 3 };
  if (order.ecotrack_tracking || order.status === "shipped") return { step: 2 };
  if (order.status === "confirmed") return { step: 1 };
  return { step: 0 };
}
