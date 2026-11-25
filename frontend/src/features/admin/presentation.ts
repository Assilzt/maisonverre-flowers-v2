import type { OrderStatus } from "@shared/orders";
/** Order status labels and colors: the one place to rename a status. */
export const statusLabels: Record<OrderStatus | "all", string> = {
  all: "الكل",
  complete: "جديد — يحتاج تأكيد",
  abandoned: "طلب غير مكتمل",
  not_responding: "لا يرد",
  confirmed: "مؤكد",
  shipped: "أُرسل للشحن",
  delivered: "تم التسليم",
  returned: "مرتجع",
  cancelled: "ملغى",
  trashed: "محذوف",
};
export type StatusTone = "blue" | "green" | "indigo" | "amber" | "red" | "gray";
export const statusTones: Record<OrderStatus, StatusTone> = {
  complete: "blue",
  abandoned: "amber",
  not_responding: "amber",
  confirmed: "green",
  shipped: "indigo",
  delivered: "green",
  returned: "red",
  cancelled: "red",
  trashed: "gray",
};
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ar-DZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export const customerSmsMessage =
  "السلام عليكم، طلبيتكم لبذور الأزهار قيد التجهيز يرجى إنتظار مكالمة عامل التوصيل";
export const escapeHtml = (value: unknown) =>
  String(value ?? "—").replace(
    /[&<>'"]/g,
    character =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] || character
  );
/** The single wilaya list lives in shared/locations.ts. */
export { WILAYAS } from "@shared/locations";
