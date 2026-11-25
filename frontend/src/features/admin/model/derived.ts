import { useMemo } from "react";
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
  };
}
export type DashboardDerived = ReturnType<typeof useDashboardDerived>;
