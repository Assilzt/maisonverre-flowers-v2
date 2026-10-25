import { FormEvent } from "react";
import type { DashboardState } from "./state";
import type { DashboardSession } from "./session";

export function createMutationActions(
  context: Pick<
    DashboardState & DashboardSession,
    | "editing"
    | "setLoading"
    | "setError"
    | "authHeaders"
    | "editForm"
    | "setOrders"
    | "setEditing"
    | "setShippingNotice"
    | "orderShippingModes"
    | "shipFromStock"
    | "setOrderShippingModes"
    | "selectedProviderId"
    | "orders"
    | "selectedStockProductId"
    | "loadOrders"
    | "setSyncing"
  >
) {
  const {
    editing,
    setLoading,
    setError,
    authHeaders,
    editForm,
    setOrders,
    setEditing,
    setShippingNotice,
    orderShippingModes,
    shipFromStock,
    setOrderShippingModes,
    selectedProviderId,
    orders,
    selectedStockProductId,
    loadOrders,
    setSyncing,
  } = context;
  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          id: editing.id,
          ...editForm,
          price: Number(editForm.price),
          deliveryFee: Number(editForm.deliveryFee),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تعديل الطلب");
      setOrders(current =>
        current.map(order => (order.id === editing.id ? data.order : order))
      );
      setEditing(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تعديل الطلب"
      );
    } finally {
      setLoading(false);
    }
  };
  const runAction = async (
    id: number,
    action: "ship" | "unship" | "trash" | "restore",
    shippingModeOverride?: "stock" | "without_stock"
  ) => {
    setLoading(true);
    setError("");
    const isShippingAction = action === "ship" || action === "unship";
    if (isShippingAction)
      setShippingNotice({
        type: "loading",
        title: action === "ship" ? "جارٍ رفع الطلب" : "جارٍ إلغاء الرفع",
        message:
          action === "ship"
            ? "يتم إرسال بيانات الطلب إلى EcoTrack، يرجى الانتظار قليلاً."
            : "يتم طلب إلغاء الشحنة من EcoTrack.",
      });
    try {
      const shippingMode =
        action === "ship"
          ? shippingModeOverride ||
            orderShippingModes[id] ||
            (shipFromStock ? "stock" : "without_stock")
          : undefined;
      if (action === "ship" && shippingMode)
        setOrderShippingModes(current => ({ ...current, [id]: shippingMode }));
      const shouldUseStock = shippingMode === "stock";
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          providerId: action === "ship" ? selectedProviderId : undefined,
          quantity:
            action === "ship"
              ? orders.find(order => order.id === id)?.quantity || 1
              : undefined,
          shippingMode,
          stockProductId:
            action === "ship" && shouldUseStock
              ? Number(selectedStockProductId)
              : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر تنفيذ العملية");
      setOrders(current =>
        current.map(order => (order.id === id ? data.order : order))
      );
      if (isShippingAction) {
        const tracking = data.order?.ecotrack_tracking;
        setShippingNotice({
          type: "success",
          title: action === "ship" ? "تم شحن الطلب بنجاح" : "تم إلغاء الرفع",
          message:
            action === "ship"
              ? tracking
                ? `تم قبول الطلب من EcoTrack. رقم التتبع: ${tracking}`
                : "تم قبول الطلب من EcoTrack وتسجيله كمرفوع."
              : "تم إلغاء الشحنة من EcoTrack بنجاح.",
        });
      }
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "تعذر تنفيذ العملية";
      setError(message);
      if (isShippingAction)
        setShippingNotice({
          type: "error",
          title: action === "ship" ? "تعذر شحن الطلب" : "تعذر إلغاء الرفع",
          message: `${message}. لم يتم تأكيد العملية، يمكنك المحاولة مجدداً.`,
        });
    } finally {
      setLoading(false);
    }
  };
  const shipAll = async () => {
    setLoading(true);
    setError("");
    try {
      const shouldUseStock = shipFromStock;
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "shipAll",
          ids: orders
            .filter(
              order => order.status === "confirmed" && !order.ecotrack_tracking
            )
            .slice(0, 10)
            .map(order => order.id),
          providerId: selectedProviderId,
          shippingMode: shouldUseStock ? "stock" : "without_stock",
          stockProductId: shouldUseStock
            ? Number(selectedStockProductId)
            : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر شحن الطلبات");
      await loadOrders();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر شحن الطلبات"
      );
    } finally {
      setLoading(false);
    }
  };
  const syncStatuses = async () => {
    setSyncing(true);
    setError("");
    try {
      const response = await fetch("/api/orders?resource=sync", {
        headers: authHeaders(),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        synced?: number;
        matched?: number;
        total?: number;
        providers?: Array<{
          provider: string;
          error?: string;
        }>;
      };
      if (!response.ok) throw new Error(data.error || "تعذرت مزامنة EcoTrack");
      await loadOrders();
      const providerError = data.providers?.find(item => item.error)?.error;
      if (providerError) throw new Error(providerError);
      setShippingNotice({
        type: "success",
        title: "تمت مزامنة EcoTrack",
        message: `تم فحص ${data.total || 0} شحنة، وتحديث ${data.synced || 0} طلبية (${data.matched || 0} مطابقة).`,
      });
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذرت مزامنة EcoTrack"
      );
    } finally {
      setSyncing(false);
    }
  };
  return { saveEdit, runAction, shipAll, syncStatuses };
}
export type MutationActions = ReturnType<typeof createMutationActions>;
