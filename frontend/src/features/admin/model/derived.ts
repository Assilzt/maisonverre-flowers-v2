import { useMemo } from "react";
import type { OrderStatus, Order } from "@shared/orders";
import { shippingStatus } from "@shared/shipping-status";
import type { DashboardState } from "./state";

export function useDashboardDerived(
  context: Pick<
    DashboardState,
    | "globalCounts"
    | "orders"
    | "section"
    | "status"
    | "query"
    | "dateRange"
    | "activeOrderId"
  >
) {
  const {
    globalCounts,
    orders,
    section,
    status,
    query,
    dateRange,
    activeOrderId,
  } = context;
  const visibleOrders = useMemo(
    () =>
      orders.filter(order => {
        const inSection =
          section === "trash"
            ? order.status === "trashed"
            : section === "incomplete"
              ? ["abandoned", "not_responding"].includes(order.status)
              : section === "confirmation"
                ? ["abandoned", "complete"].includes(order.status)
                : section === "shipping"
                  ? order.status === "confirmed" ||
                    order.shipment_status === "failed"
                  : section === "tracking"
                    ? Boolean(order.ecotrack_tracking) &&
                      !["returned", "delivered"].includes(order.status)
                    : section === "returns"
                      ? order.status === "returned"
                      : section === "completed"
                        ? order.status === "delivered"
                        : section === "analytics"
                          ? order.status !== "trashed"
                          : order.status !== "trashed";
        const matchesStatus = status === "all" || order.status === status;
        const normalizedQuery = query.trim().toLowerCase();
        const haystack = [
          order.lead_id,
          order.phone,
          order.full_name,
          order.wilaya,
          order.commune,
          order.campaign,
          order.ecotrack_tracking,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const createdAt = new Date(order.created_at).getTime();
        const matchesDate =
          !dateRange ||
          (createdAt >= dateRange.start.getTime() &&
            createdAt <= dateRange.end.getTime());
        return (
          inSection &&
          matchesStatus &&
          matchesDate &&
          (!normalizedQuery || haystack.includes(normalizedQuery))
        );
      }),
    [dateRange, orders, query, section, status]
  );
  const counts = globalCounts;
  const confirmationQueueCount =
    (counts.abandoned || 0) + (counts.complete || 0);
  const followUpCount = counts.not_responding || 0;
  const shippingQueueCount = counts.confirmed || 0;
  const trackingQueueCount = orders.filter(
    order =>
      Boolean(order.ecotrack_tracking) &&
      !["delivered", "returned"].includes(order.status)
  ).length;
  const sectionTitle =
    section === "orders"
      ? "الواردة"
      : section === "incomplete"
        ? "تحتاج متابعة"
        : section === "trash"
          ? "سلة المهملات"
          : section === "confirmation"
            ? "التأكيد"
            : section === "shipping"
              ? "الشحن"
              : section === "tracking"
                ? "التتبع"
                : section === "returns"
                  ? "المرتجعات"
                  : section === "completed"
                    ? "تم التسليم"
                    : "التحليلات";
  const sectionDescription =
    section === "orders"
      ? "كل الطلبات غير المحذوفة — ابدأ من طابور العمل اليومي"
      : section === "incomplete"
        ? "طلبات لم تُحسم بعد وتحتاج متابعة أو محاولة اتصال جديدة"
        : section === "trash"
          ? "الطلبات المحذوفة مؤقتاً ويمكن استرجاعها"
          : section === "confirmation"
            ? "اعمل على الطلبات التي تحتاج اتصالاً ثم انقل المؤكد منها للشحن"
            : section === "shipping"
              ? "الطلبات المؤكدة التي تنتظر الرفع أو تحتاج إعادة محاولة"
              : section === "tracking"
                ? "تابع الشحنات المرفوعة وآخر حالة معروفة"
                : section === "returns"
                  ? "الشحنات المرتجعة التي تحتاج قراراً أو متابعة"
                  : section === "completed"
                    ? "أرشيف الطلبات المسلّمة — خارج طوابير العمل اليومية"
                    : "مؤشرات تشغيلية مبنية على الطلبات المحملة حالياً";
  const activeOrder = orders.find(order => order.id === activeOrderId) || null;
  const confirmedCount = counts.confirmed || 0;
  const shippedCount = counts.shipped || 0;
  const deliveredCount = counts.delivered || 0;
  const totalOrderCount = Object.entries(counts)
    .filter(([status]) => status !== "trashed")
    .reduce((sum, [, count]) => sum + count, 0);
  const confirmedLifecycleCount = [
    "confirmed",
    "shipped",
    "delivered",
    "returned",
  ].reduce((sum, status) => sum + (counts[status] || 0), 0);
  const confirmationRate = totalOrderCount
    ? Math.round((confirmedLifecycleCount / totalOrderCount) * 100)
    : 0;
  const statusTone = (value: OrderStatus) =>
    value === "confirmed"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-300"
      : value === "shipped"
        ? "bg-blue-100 text-blue-800 ring-blue-300"
        : value === "abandoned" || value === "not_responding"
          ? "bg-slate-100 text-slate-700 ring-slate-300"
          : value === "cancelled" || value === "returned" || value === "trashed"
            ? "bg-rose-100 text-rose-800 ring-rose-300"
            : value === "delivered"
              ? "bg-emerald-200 text-emerald-900 ring-emerald-400"
              : "bg-white text-slate-700 ring-slate-300";
  const statusCardTone = (value: OrderStatus) =>
    value === "delivered"
      ? "bg-gradient-to-br from-emerald-100 via-emerald-50 to-teal-100 shadow-emerald-200"
      : value === "shipped"
        ? "bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 shadow-blue-200"
        : value === "returned"
          ? "bg-gradient-to-br from-rose-100 via-rose-50 to-orange-100 shadow-rose-200"
          : value === "confirmed"
            ? "bg-gradient-to-br from-teal-100 via-emerald-50 to-green-100 shadow-emerald-200"
            : value === "cancelled"
              ? "bg-gradient-to-br from-rose-100 via-rose-50 to-slate-100 shadow-rose-100"
              : "bg-white shadow-slate-100";
  const statusAvatarTone = (value: OrderStatus) =>
    value === "delivered"
      ? "bg-emerald-200 text-emerald-900"
      : value === "shipped"
        ? "bg-blue-200 text-blue-900"
        : value === "returned" || value === "cancelled"
          ? "bg-rose-200 text-rose-900"
          : value === "confirmed"
            ? "bg-teal-200 text-teal-900"
            : "bg-slate-200 text-slate-800";
  const statusEdge = (value: OrderStatus) =>
    value === "delivered"
      ? "border-emerald-400"
      : value === "shipped"
        ? "border-blue-400"
        : value === "returned"
          ? "border-rose-400"
          : value === "confirmed"
            ? "border-teal-300"
            : "border-slate-300";
  const trackingStatusLabel = (order: Order) =>
    order.ecotrack_tracking
      ? shippingStatus(order.ecotrack_status).label
      : "غير مرفوعة";
  return {
    visibleOrders,
    counts,
    confirmationQueueCount,
    followUpCount,
    shippingQueueCount,
    trackingQueueCount,
    sectionTitle,
    sectionDescription,
    activeOrder,
    confirmedCount,
    shippedCount,
    deliveredCount,
    totalOrderCount,
    confirmedLifecycleCount,
    confirmationRate,
    statusTone,
    statusCardTone,
    statusAvatarTone,
    statusEdge,
    trackingStatusLabel,
  };
}
export type DashboardDerived = ReturnType<typeof useDashboardDerived>;
