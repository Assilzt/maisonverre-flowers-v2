import { toast } from "../ui/store";
import type {
  OrderStatus,
  Order,
  OrderEvent,
  ShipmentUpdate,
} from "@shared/orders";
import type { DashboardState } from "./state";
import type { DashboardSession } from "./session";
import type { DashboardDerived } from "./derived";

export function createOrderActions(
  context: Pick<
    DashboardState & DashboardSession & DashboardDerived,
    | "setShipmentUpdates"
    | "setShipmentBusy"
    | "authHeaders"
    | "setOrders"
    | "setError"
    | "setActiveOrderId"
    | "setOrderEvents"
    | "setCommentDraft"
    | "setEditing"
    | "orders"
    | "setSection"
    | "setStatus"
    | "setContactBusy"
    | "commentDraft"
    | "setCommentBusy"
    | "visibleOrders"
    | "selectedIds"
    | "setSelectedIds"
    | "setBulkBusy"
  >
) {
  const {
    setShipmentUpdates,
    setShipmentBusy,
    authHeaders,
    setOrders,
    setError,
    setActiveOrderId,
    setOrderEvents,
    setCommentDraft,
    setEditing,
    orders,
    setSection,
    setStatus,
    setContactBusy,
    commentDraft,
    setCommentBusy,
    visibleOrders,
    selectedIds,
    setSelectedIds,
    setBulkBusy,
  } = context;
  const loadShipmentDetails = async (order: Order) => {
    if (!order.ecotrack_tracking) {
      setShipmentUpdates([]);
      return;
    }
    setShipmentBusy(true);
    try {
      const response = await fetch(
        `/api/orders?resource=shipment&orderId=${order.id}`,
        { headers: authHeaders() }
      );
      const data = (await response.json().catch(() => ({}))) as {
        order?: Order;
        updates?: ShipmentUpdate[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "تعذر جلب تفاصيل الشحنة");
      if (data.order)
        setOrders(current =>
          current.map(item =>
            item.id === order.id ? (data.order as Order) : item
          )
        );
      setShipmentUpdates(data.updates || []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر جلب تفاصيل الشحنة"
      );
    } finally {
      setShipmentBusy(false);
    }
  };
  const openOrder = (order: Order) => {
    setActiveOrderId(order.id);
    setOrderEvents([]);
    setShipmentUpdates([]);
    setCommentDraft("");
    void fetch(`/api/orders?resource=events&orderId=${order.id}`, {
      headers: authHeaders(),
    })
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("events"))
      )
      .then((data: { events?: OrderEvent[] }) =>
        setOrderEvents(data.events || [])
      )
      .catch(() => setOrderEvents([]));
    if (order.ecotrack_tracking) void loadShipmentDetails(order);
  };
  const closeOrder = () => {
    setActiveOrderId(null);
    setEditing(null);
    setOrderEvents([]);
    setShipmentUpdates([]);
    setCommentDraft("");
  };
  const startWork = () => {
    const next =
      orders.find(order => ["abandoned", "complete"].includes(order.status)) ||
      orders.find(order => ["not_responding"].includes(order.status)) ||
      orders.find(
        order =>
          order.status === "confirmed" || order.shipment_status === "failed"
      ) ||
      orders.find(
        order =>
          Boolean(order.ecotrack_tracking) &&
          !["delivered", "returned"].includes(order.status)
      );
    if (!next) {
      setError("لا توجد طلبات تحتاج إلى إجراء حالياً");
      return;
    }
    const nextSection = ["abandoned", "complete"].includes(next.status)
      ? "confirmation"
      : ["not_responding"].includes(next.status)
        ? "incomplete"
        : next.status === "confirmed"
          ? "shipping"
          : "tracking";
    setSection(nextSection);
    setStatus("all");
    openOrder(next);
  };
  const CONTACT_TEXT: Record<string, string> = {
    confirmed: "تم تأكيد الطلب",
    no_answer: "سُجّل: لم يرد",
    busy: "سُجّل: مشغول",
    call_later: "سُجّل: الاتصال لاحقًا",
    wrong_number: "أُلغي الطلب: رقم خاطئ",
    refused: "أُلغي الطلب: رفض العميل",
  };
  const recordContact = async (order: Order, result: string) => {
    setContactBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "contact", id: order.id, result }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "تعذر تسجيل نتيجة الاتصال");
      setOrders(current =>
        current.map(item => (item.id === order.id ? data.order : item))
      );
      // Confirming or cancelling can be undone with one tap.
      const undoable = ["confirmed", "wrong_number", "refused"].includes(
        result
      );
      toast(CONTACT_TEXT[result] || "تم التسجيل", {
        tone: result === "confirmed" ? "success" : undoable ? "error" : "info",
        undo: undoable
          ? () => void changeStatus(data.order, "complete", true)
          : undefined,
      });
      const eventsResponse = await fetch(
        `/api/orders?resource=events&orderId=${order.id}`,
        { headers: authHeaders() }
      );
      const eventsData = await eventsResponse.json().catch(() => ({}));
      setOrderEvents(eventsData.events || []);
      return true;
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "تعذر تسجيل نتيجة الاتصال";
      setError(message);
      toast(message, { tone: "error" });
      return false;
    } finally {
      setContactBusy(false);
    }
  };
  /** One step in the order flow: confirm, cancel, back to review, reopen. */
  const changeStatus = async (
    order: Order,
    status: "confirmed" | "cancelled" | "complete",
    silent = false
  ): Promise<boolean> => {
    setContactBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تغيير حالة الطلب");
      setOrders(current =>
        current.map(item => (item.id === order.id ? data.order : item))
      );
      if (silent) toast("تم التراجع", { tone: "info" });
      else if (status === "cancelled")
        toast("تم إلغاء الطلب", {
          tone: "error",
          undo: () => void changeStatus(data.order, "complete", true),
        });
      else if (status === "complete")
        toast(
          order.status === "cancelled"
            ? "أُعيد فتح الطلب"
            : "أُعيد الطلب للمراجعة",
          { tone: "info" }
        );
      else toast("تم تأكيد الطلب");
      const eventsResponse = await fetch(
        `/api/orders?resource=events&orderId=${order.id}`,
        { headers: authHeaders() }
      );
      const eventsData = await eventsResponse.json().catch(() => ({}));
      setOrderEvents(eventsData.events || []);
      return true;
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "تعذر تغيير حالة الطلب";
      setError(message);
      toast(message, { tone: "error" });
      return false;
    } finally {
      setContactBusy(false);
    }
  };
  const addOrderComment = async (order: Order) => {
    const note = commentDraft.trim();
    if (!note) return;
    setCommentBusy(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ action: "note", id: order.id, note }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        events?: OrderEvent[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "تعذر حفظ التعليق");
      setOrderEvents(data.events || []);
      setCommentDraft("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر حفظ التعليق"
      );
    } finally {
      setCommentBusy(false);
    }
  };
  const visibleIds = visibleOrders.map(order => order.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));
  const toggleSelected = (id: number) =>
    setSelectedIds(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    );
  const toggleSelectAll = () =>
    setSelectedIds(current =>
      allVisibleSelected
        ? current.filter(id => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    );
  const bulkUpdate = async (
    nextStatus: OrderStatus | null,
    action: "trash" | "restore" | null = null
  ) => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    setError("");
    try {
      const results = await Promise.all(
        selectedIds.map(async id => {
          const body = action ? { id, action } : { id, status: nextStatus };
          const response = await fetch("/api/orders", {
            method: "PATCH",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(data.error || "تعذر تنفيذ العملية الجماعية");
          return { id, order: data.order };
        })
      );
      setOrders(current =>
        current.map(order => {
          const result = results.find(item => item.id === order.id);
          return result?.order || order;
        })
      );
      setSelectedIds([]);
      setActiveOrderId(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تنفيذ العملية الجماعية"
      );
    } finally {
      setBulkBusy(false);
    }
  };
  return {
    loadShipmentDetails,
    openOrder,
    closeOrder,
    startWork,
    recordContact,
    changeStatus,
    addOrderComment,
    visibleIds,
    allVisibleSelected,
    toggleSelected,
    toggleSelectAll,
    bulkUpdate,
  };
}
export type OrderActions = ReturnType<typeof createOrderActions>;
