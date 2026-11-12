import {
  Check,
  CheckCircle2,
  ChevronDown,
  MessageCircle,
  Pencil,
  Phone,
  Truck,
  X,
} from "lucide-react";
import { statusLabels, customerSmsMessage } from "../presentation";
import { shippingStatus } from "@shared/shipping-status";
import type { DashboardContext } from "../useDashboard";
import type { Order } from "@shared/orders";
export function OrderCard({
  context,
  order,
}: {
  context: DashboardContext;
  order: Order;
}) {
  const {
    statusEdge,
    statusCardTone,
    selectedIds,
    toggleSelected,
    openOrder,
    statusAvatarTone,
    statusTone,
    recordContact,
    loading,
    contactBusy,
    runAction,
    startEditing,
  } = context;
  return (
    <article
      key={order.id}
      className={`rounded-2xl border bg-white p-2.5 shadow-sm ring-1 transition hover:shadow-md sm:rounded-[24px] sm:p-4 ${statusEdge(order.status)} ${statusCardTone(order.status)} ${selectedIds.includes(order.id) ? "ring-emerald-300" : "ring-slate-200/70"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              toggleSelected(order.id);
            }}
            className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${selectedIds.includes(order.id) ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent hover:border-emerald-400"}`}
            aria-label={
              selectedIds.includes(order.id)
                ? "إلغاء تحديد الطلب"
                : "تحديد الطلب"
            }
          >
            {selectedIds.includes(order.id) && <Check className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => openOrder(order)}
            className="min-w-0 flex-1 text-right"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base font-black ${statusAvatarTone(order.status)}`}
              >
                {(order.full_name || "ز").slice(0, 1)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">
                  {(order.full_name || "زبون").trim().split(/\s+/)[0]}
                </p>
              </div>
            </div>
          </button>
        </div>
        <button
          type="button"
          onClick={() => openOrder(order)}
          className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 text-slate-500 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          aria-label="فتح تفاصيل الطلب"
        >
          <span className="hidden text-[10px] font-black sm:inline">
            تفاصيل
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <a
            href={`tel:${order.phone}`}
            onClick={event => event.stopPropagation()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
            aria-label={`الاتصال بـ ${order.full_name || "العميل"}`}
            title="اتصال"
          >
            <Phone className="h-4 w-4" />
          </a>
          <a
            href={`sms:${order.phone}?body=${encodeURIComponent(customerSmsMessage)}`}
            onClick={event => event.stopPropagation()}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
            aria-label={`إرسال رسالة إلى ${order.full_name || "العميل"}`}
            title="رسالة SMS"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
          <p className="mr-1 text-base font-black text-slate-950">
            {order.price + (order.delivery_fee || 0)}{" "}
            <span className="text-[10px] font-bold text-slate-400">دج</span>
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-black ring-1 ${statusTone(order.status)}`}
        >
          {order.ecotrack_tracking
            ? shippingStatus(order.ecotrack_status).label
            : statusLabels[order.status]}
        </span>
      </div>
      <div className="mt-2 border-t border-slate-100 pt-2">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-xs font-semibold text-slate-400">
              {order.shipping_provider_name || "شركة التوصيل غير محددة"}
            </p>
            {order.ecotrack_tracking && (
              <span className="truncate text-[10px] font-bold text-blue-600">
                رقم التتبع: {order.ecotrack_tracking}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            إجراءات الطلب
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {!order.ecotrack_tracking &&
            ["abandoned", "complete", "not_responding"].includes(
              order.status
            ) && (
              <>
                <button
                  type="button"
                  onClick={() => void recordContact(order, "confirmed")}
                  disabled={loading || contactBusy}
                  className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-emerald-500 px-2 py-2.5 text-[11px] font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> تأكيد
                </button>
                <button
                  type="button"
                  onClick={() => void recordContact(order, "refused")}
                  disabled={loading || contactBusy}
                  className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-rose-50 px-2 py-2.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5 shrink-0" /> رفض
                </button>
              </>
            )}
          {order.status === "confirmed" && !order.ecotrack_tracking && (
            <button
              type="button"
              onClick={() => void runAction(order.id, "ship")}
              disabled={loading}
              className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-emerald-500 px-2 py-2.5 text-[11px] font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <Truck className="h-3.5 w-3.5 shrink-0" /> رفع
            </button>
          )}
          {order.ecotrack_tracking && (
            <button
              type="button"
              onClick={() => openOrder(order)}
              className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-blue-50 px-2 py-2.5 text-[11px] font-black text-blue-700 transition hover:bg-blue-100"
            >
              <Truck className="h-3.5 w-3.5 shrink-0" /> تتبع
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              openOrder(order);
              startEditing(order);
            }}
            className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-blue-50 px-2 py-2.5 text-[11px] font-black text-blue-700 transition hover:bg-blue-100"
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">تعديل الطلب</span>
          </button>
          <button
            type="button"
            onClick={() => openOrder(order)}
            className="flex min-w-0 items-center justify-center gap-1 rounded-xl bg-emerald-50 px-2 py-2.5 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100"
          >
            <Truck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">تفاصيل</span>
          </button>
        </div>
      </div>
    </article>
  );
}
