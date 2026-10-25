import { MessageCircle, RefreshCw, X } from "lucide-react";
import { statusLabels, formatDate } from "../presentation";
import { ShippingActions } from "../ShippingActions";
import type { DashboardContext } from "../useDashboard";
export function OrderDialog({ context }: { context: DashboardContext }) {
  const {
    activeOrder,
    closeOrder,
    statusTone,
    trackingStatusLabel,
    loadShipmentDetails,
    shipmentBusy,
    shipmentUpdates,
    commentDraft,
    setCommentDraft,
    commentBusy,
    addOrderComment,
    orderEvents,
    runAction,
    loadOrders,
  } = context;
  return (
    <>
      {activeOrder && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/35 p-3 backdrop-blur-[2px] sm:p-6"
          onClick={closeOrder}
        >
          <div
            className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-[24px] bg-white p-4 shadow-2xl sm:p-5"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-600">
                  {activeOrder.lead_id}
                </p>
                <h2 className="mt-1 text-lg font-black">
                  {activeOrder.full_name || "زبون بدون اسم"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeOrder}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-400">الهاتف</p>
                <p className="mt-1 text-sm font-black" dir="ltr">
                  {activeOrder.phone}
                </p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-[10px] font-bold text-emerald-700">
                  الإجمالي
                </p>
                <p className="mt-1 text-lg font-black text-emerald-900">
                  {activeOrder.price + (activeOrder.delivery_fee || 0)}{" "}
                  <span className="text-xs">دج</span>
                </p>
              </div>
              <div className="col-span-2 rounded-2xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold text-slate-400">العنوان</p>
                <p className="mt-1 text-sm font-bold">
                  {activeOrder.wilaya || "—"}
                  {activeOrder.commune ? `، ${activeOrder.commune}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2.5">
              <span className="text-xs font-bold text-slate-500">الحالة</span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${statusTone(activeOrder.status)}`}
              >
                {statusLabels[activeOrder.status]}
              </span>
            </div>
            {activeOrder.ecotrack_tracking && (
              <div className="mt-2 rounded-2xl bg-blue-50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-blue-700">
                    حالة التتبع
                  </span>
                  <span className="rounded-full bg-blue-600 px-2 py-1 text-[10px] font-black text-white">
                    {trackingStatusLabel(activeOrder)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3 border-t border-blue-100 pt-2">
                  <span className="text-[10px] font-bold text-blue-700">
                    رقم التتبع
                  </span>
                  <span
                    className="max-w-[190px] truncate text-xs font-black text-blue-900"
                    dir="ltr"
                  >
                    {activeOrder.ecotrack_tracking}
                  </span>
                </div>
              </div>
            )}
            {activeOrder.ecotrack_tracking && (
              <div className="mt-3 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-700">
                    تفاصيل شركة التوصيل
                  </p>
                  <button
                    type="button"
                    onClick={() => void loadShipmentDetails(activeOrder)}
                    disabled={shipmentBusy}
                    className="rounded-xl bg-slate-100 px-2.5 py-1.5 text-[10px] font-black text-slate-700 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`mr-1 inline h-3 w-3 ${shipmentBusy ? "animate-spin" : ""}`}
                    />{" "}
                    تحديث
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <span>
                    العامل:{" "}
                    <b className="text-slate-700">
                      {activeOrder.ecotrack_driver || "—"}
                    </b>
                  </span>
                  <span>
                    هاتف العامل:{" "}
                    <b dir="ltr" className="text-slate-700">
                      {activeOrder.ecotrack_driver_phone || "—"}
                    </b>
                  </span>
                  <span>
                    هاتف المكتب:{" "}
                    <b dir="ltr" className="text-slate-700">
                      {activeOrder.ecotrack_desk_phone || "—"}
                    </b>
                  </span>
                  <span>
                    المحطة:{" "}
                    <b className="text-slate-700">
                      {activeOrder.ecotrack_station || "—"}
                    </b>
                  </span>
                </div>
                {activeOrder.ecotrack_last_note && (
                  <p className="rounded-xl bg-amber-50 p-2 text-[10px] font-bold text-amber-900">
                    آخر تعليق: {activeOrder.ecotrack_last_note}
                  </p>
                )}
                <details open className="rounded-xl border border-slate-100">
                  <summary className="cursor-pointer px-2.5 py-2 text-[10px] font-black text-slate-600">
                    تاريخ التتبع والتعليقات ({shipmentUpdates.length})
                  </summary>
                  <div className="max-h-64 space-y-2 overflow-y-auto border-t border-slate-100 p-2.5">
                    {shipmentUpdates.length === 0 ? (
                      <p className="text-[10px] font-bold text-slate-400">
                        لا توجد تحديثات من الشركة بعد.
                      </p>
                    ) : (
                      shipmentUpdates.map(item => (
                        <div
                          key={item.id}
                          className="border-r-2 border-blue-300 pr-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-black text-blue-800">
                              {item.reason || item.status || "تحديث"}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {item.activity_date || ""}{" "}
                              {item.activity_time || ""}
                            </span>
                          </div>
                          {item.details && (
                            <p className="mt-1 text-[10px] font-bold text-slate-600">
                              {item.details}
                            </p>
                          )}
                          {(item.driver ||
                            item.station ||
                            item.postponed_to) && (
                            <p className="mt-1 text-[9px] font-semibold text-slate-500">
                              {item.driver ? `العامل: ${item.driver}` : ""}
                              {item.station ? ` · المحطة: ${item.station}` : ""}
                              {item.postponed_to
                                ? ` · تأجيل إلى: ${item.postponed_to}`
                                : ""}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </details>
              </div>
            )}
            <section className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-800">
                    ملاحظات الطلب
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500">
                    أضف ملاحظة داخلية لفريق المتابعة.
                  </p>
                </div>
                <MessageCircle className="h-5 w-5 text-slate-400" />
              </div>
              <textarea
                value={commentDraft}
                onChange={event => setCommentDraft(event.target.value)}
                placeholder="اكتب تعليقاً على الطلب..."
                maxLength={1000}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold text-slate-400">
                  {commentDraft.length}/1000
                </span>
                <button
                  type="button"
                  disabled={commentBusy || !commentDraft.trim()}
                  onClick={() => void addOrderComment(activeOrder)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {commentBusy ? "جارٍ الحفظ..." : "إضافة تعليق"}
                </button>
              </div>
              <details
                open
                className="mt-3 rounded-xl border border-slate-200 bg-white"
              >
                <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-black text-slate-600">
                  سجل النشاط ({orderEvents.length})
                </summary>
                <div className="space-y-2 border-t border-slate-100 p-3">
                  {orderEvents.length === 0 ? (
                    <p className="text-xs font-bold text-slate-400">
                      لا توجد ملاحظات أو تحديثات مسجلة بعد.
                    </p>
                  ) : (
                    orderEvents.map(event => (
                      <div
                        key={event.id}
                        className="border-r-2 border-emerald-300 pr-2"
                      >
                        <p className="text-xs font-bold text-slate-700">
                          {event.message}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          {formatDate(event.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </details>
            </section>
            <div className="mt-4 space-y-2">
              {activeOrder.status === "confirmed" &&
                !activeOrder.ecotrack_tracking && (
                  <>
                    <div className="mb-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-black text-slate-700">
                        جاهزية الشحن
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
                        <span
                          className={
                            activeOrder.full_name
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }
                        >
                          {activeOrder.full_name ? "✓" : "×"} الاسم
                        </span>
                        <span
                          className={
                            activeOrder.phone
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }
                        >
                          {activeOrder.phone ? "✓" : "×"} الهاتف
                        </span>
                        <span
                          className={
                            activeOrder.wilaya
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }
                        >
                          {activeOrder.wilaya ? "✓" : "×"} الولاية
                        </span>
                        <span
                          className={
                            activeOrder.commune
                              ? "text-emerald-700"
                              : "text-rose-600"
                          }
                        >
                          {activeOrder.commune ? "✓" : "×"} البلدية
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={
                          !activeOrder.full_name ||
                          !activeOrder.phone ||
                          !activeOrder.wilaya ||
                          !activeOrder.commune
                        }
                        onClick={() =>
                          void runAction(activeOrder.id, "ship", "stock")
                        }
                        className="rounded-2xl bg-emerald-500 px-3 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        شحن من Stock
                      </button>
                      <button
                        type="button"
                        disabled={
                          !activeOrder.full_name ||
                          !activeOrder.phone ||
                          !activeOrder.wilaya ||
                          !activeOrder.commune
                        }
                        onClick={() =>
                          void runAction(
                            activeOrder.id,
                            "ship",
                            "without_stock"
                          )
                        }
                        className="rounded-2xl bg-blue-50 px-3 py-3 text-xs font-black text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        شحن بدون Stock
                      </button>
                    </div>
                  </>
                )}
              {(activeOrder.ecotrack_tracking ||
                ["processing", "uncertain"].includes(
                  activeOrder.shipment_status
                )) && (
                <ShippingActions
                  order={activeOrder}
                  onChange={async () => {
                    await loadOrders();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
