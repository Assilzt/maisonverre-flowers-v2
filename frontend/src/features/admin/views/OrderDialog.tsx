import { useState } from "react";
import {
  Phone,
  MessageCircle,
  Copy,
  MoreHorizontal,
  Pencil,
  Truck,
  RefreshCw,
} from "lucide-react";
import type { DashboardContext } from "../useDashboard";
import { Dialog } from "../ui/Dialog";
import { StatusBadge } from "../ui/StatusBadge";
import { ShippingActions } from "../ShippingActions";
import { ShippingSetup } from "./ShippingSetup";
import { EditOrderForm } from "./EditOrderForm";
import { formatDate, customerSmsMessage } from "../presentation";
import { shippingStatus } from "@shared/shipping-status";
import { canConfirmOrder } from "../ui/order-ui";
export function OrderDialog({ context: c }: { context: DashboardContext }) {
  const order = c.activeOrder;
  const [tab, setTab] = useState("details");
  const [copied, setCopied] = useState(false);
  if (!order) return null;
  const canContact =
    !order.ecotrack_tracking &&
    ["abandoned", "complete", "not_responding", "confirmed"].includes(
      order.status
    );
  const canShip =
    order.status === "confirmed" &&
    !order.ecotrack_tracking &&
    !["processing", "uncertain"].includes(order.shipment_status);
  const ready = Boolean(
    order.full_name && order.phone && order.wilaya && order.commune
  );
  const act = (action: "trash" | "restore") => {
    if (action === "trash" && !window.confirm("نقل الطلب إلى المحذوفات؟"))
      return;
    void c.runAction(order.id, action);
  };
  return (
    <Dialog
      drawer
      title={"طلب #" + order.id}
      onClose={() => {
        if (
          (c.editing || c.commentDraft.trim()) &&
          !window.confirm(
            "إغلاق التفاصيل وترك التعديلات أو الملاحظة غير المحفوظة؟"
          )
        )
          return;
        c.closeOrder();
      }}
    >
      <div className="dialog-body">
        <div className="panel-heading">
          <div>
            <h2>{order.full_name || "عميل بدون اسم"}</h2>
            <p className="mono">{order.lead_id}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="section-tabs" aria-label="تفاصيل الطلب">
          {[
            ["details", "العميل والطلب"],
            ["shipping", "الشحنة"],
            ["activity", "السجل والملاحظات"],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={tab === id ? "active" : ""}
              aria-pressed={tab === id}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {c.error && (
          <p role="alert" className="notice error">
            {c.error}
          </p>
        )}
        {tab === "details" &&
          (c.editing ? (
            <EditOrderForm context={c} />
          ) : (
            <>
              <dl className="detail-grid">
                <div>
                  <dt>الهاتف</dt>
                  <dd>
                    <a className="mono" href={"tel:" + order.phone}>
                      {order.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt>تاريخ الطلب</dt>
                  <dd>{formatDate(order.created_at)}</dd>
                </div>
                <div className="field-wide">
                  <dt>عنوان التوصيل</dt>
                  <dd>
                    {[order.wilaya, order.commune].filter(Boolean).join("، ") ||
                      "العنوان غير مكتمل"}
                  </dd>
                </div>
                <div className="field-wide">
                  <dt>المنتج</dt>
                  <dd>{order.order_snapshot?.name || order.campaign || "—"}</dd>
                </div>
                <div>
                  <dt>الكمية</dt>
                  <dd>{order.quantity || 1}</dd>
                </div>
                <div>
                  <dt>سعر المنتجات</dt>
                  <dd>{order.price.toLocaleString()} دج</dd>
                </div>
                <div>
                  <dt>رسوم التوصيل</dt>
                  <dd>{order.delivery_fee.toLocaleString()} دج</dd>
                </div>
                <div>
                  <dt>الإجمالي</dt>
                  <dd>
                    <strong>
                      {(order.price + order.delivery_fee).toLocaleString()} دج
                    </strong>
                  </dd>
                </div>
              </dl>
              <div className="toolbar detail-section">
                <a className="btn" href={"tel:" + order.phone}>
                  <Phone size={15} />
                  اتصال
                </a>
                <a
                  className="btn"
                  href={`sms:${order.phone}?body=${encodeURIComponent(customerSmsMessage)}`}
                >
                  <MessageCircle size={15} />
                  SMS
                </a>
                {!order.ecotrack_tracking && order.status !== "trashed" && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => c.startEditing(order)}
                  >
                    <Pencil size={14} />
                    تعديل البيانات
                  </button>
                )}
              </div>
              {canContact && (
                <section className="detail-section">
                  <h3>نتيجة التواصل</h3>
                  <p className="muted" style={{ marginBottom: 12 }}>
                    محاولات الاتصال: {order.contact_attempts || 0}
                  </p>
                  <div className="toolbar">
                    {[
                      ["no_answer", "لم يرد"],
                      ["busy", "مشغول"],
                      ["call_later", "الاتصال لاحقًا"],
                      ["wrong_number", "رقم خاطئ"],
                      ["refused", "رفض الطلب"],
                    ].map(([value, label]) => (
                      <button
                        type="button"
                        className="btn small"
                        disabled={c.contactBusy}
                        key={value}
                        onClick={() => {
                          if (
                            ["wrong_number", "refused"].includes(value) &&
                            !window.confirm(
                              "سيُلغى الطلب بعد تسجيل هذه النتيجة. متابعة؟"
                            )
                          )
                            return;
                          void c.recordContact(order, value);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </>
          ))}
        {tab === "shipping" && (
          <>
            {order.ecotrack_tracking ? (
              <>
                <div className="panel-heading">
                  <StatusBadge carrier status={order.ecotrack_status} />
                  <button
                    type="button"
                    className="btn small"
                    disabled={c.shipmentBusy}
                    onClick={() => void c.loadShipmentDetails(order)}
                  >
                    <RefreshCw
                      size={14}
                      className={c.shipmentBusy ? "spinner" : ""}
                    />
                    تحديث الحالة
                  </button>
                </div>
                <dl className="detail-grid">
                  <div className="field-wide">
                    <dt>رقم التتبع</dt>
                    <dd className="toolbar">
                      <span className="mono">{order.ecotrack_tracking}</span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="نسخ رقم التتبع"
                        onClick={() => {
                          void navigator.clipboard
                            .writeText(order.ecotrack_tracking!)
                            .then(() => setCopied(true));
                        }}
                      >
                        <Copy size={14} />
                      </button>
                      {copied && (
                        <span className="muted" role="status">
                          تم النسخ
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>شركة التوصيل</dt>
                    <dd>{order.shipping_provider_name || "EcoTrack"}</dd>
                  </div>
                  <div>
                    <dt>آخر مزامنة</dt>
                    <dd>
                      {order.ecotrack_last_synced_at
                        ? formatDate(order.ecotrack_last_synced_at)
                        : "لم تتم بعد"}
                    </dd>
                  </div>
                  <div>
                    <dt>المحطة</dt>
                    <dd>{order.ecotrack_station || "—"}</dd>
                  </div>
                  <div>
                    <dt>عامل التوصيل</dt>
                    <dd>
                      {order.ecotrack_driver || "—"}
                      {order.ecotrack_driver_phone && (
                        <a
                          className="subtle mono"
                          href={"tel:" + order.ecotrack_driver_phone}
                        >
                          {order.ecotrack_driver_phone}
                        </a>
                      )}
                    </dd>
                  </div>
                </dl>
                {order.ecotrack_sync_error && (
                  <p className="notice error" style={{ marginTop: 18 }}>
                    {order.ecotrack_sync_error}
                  </p>
                )}
              </>
            ) : canShip ? (
              <>
                <p className="notice">
                  الطلب مؤكد. راجع حساب التوصيل وطريقة الشحن قبل الإرسال.
                </p>
                <ShippingSetup context={c} />
                {!ready && (
                  <p className="notice warning" style={{ marginTop: 18 }}>
                    أكمل اسم العميل والولاية والبلدية من بيانات الطلب قبل الشحن.
                  </p>
                )}
              </>
            ) : (
              <p className="notice">
                {["processing", "uncertain"].includes(order.shipment_status)
                  ? "نتيجة الإرسال تحتاج مطابقة قبل أي محاولة جديدة."
                  : "يظهر تجهيز الشحن بعد تأكيد الطلب."}
              </p>
            )}
            {(order.ecotrack_tracking ||
              ["processing", "uncertain"].includes(order.shipment_status)) && (
              <div className="detail-section">
                <ShippingActions
                  key={
                    order.id +
                    String(order.remote_validated) +
                    order.ecotrack_status
                  }
                  order={order}
                  onChange={() => c.loadOrders()}
                />
              </div>
            )}
            {c.shipmentUpdates.length > 0 && (
              <section className="detail-section">
                <h3>تاريخ الشحنة</h3>
                {c.shipmentUpdates.map(update => (
                  <div className="timeline-item" key={update.id}>
                    <p>
                      {update.status
                        ? shippingStatus(update.status).label
                        : update.reason || "تحديث"}
                    </p>
                    {update.details && (
                      <p className="muted">{update.details}</p>
                    )}
                    <small>
                      {[
                        update.activity_date,
                        update.activity_time,
                        update.station,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
        {tab === "activity" && (
          <>
            <label>
              ملاحظة داخلية
              <textarea
                value={c.commentDraft}
                maxLength={1000}
                placeholder="معلومة تساعدك في متابعة هذا الطلب…"
                onChange={e => c.setCommentDraft(e.target.value)}
              />
            </label>
            <div className="toolbar" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="btn primary"
                disabled={c.commentBusy || !c.commentDraft.trim()}
                onClick={() => void c.addOrderComment(order)}
              >
                حفظ الملاحظة
              </button>
              <span className="muted">{c.commentDraft.length}/1000</span>
            </div>
            <section className="detail-section">
              <h3>سجل النشاط</h3>
              {c.orderEvents.length ? (
                c.orderEvents.map(event => (
                  <div className="timeline-item" key={event.id}>
                    <p>{event.message}</p>
                    <small>{formatDate(event.created_at)}</small>
                  </div>
                ))
              ) : (
                <p className="muted">لا توجد أحداث مسجلة بعد.</p>
              )}
            </section>
          </>
        )}
      </div>
      <footer className="dialog-footer">
        <div>
          {canContact && order.status !== "confirmed" ? (
            <button
              type="button"
              className="btn primary"
              disabled={c.contactBusy || !canConfirmOrder(order)}
              onClick={() => void c.recordContact(order, "confirmed")}
            >
              تأكيد الطلب
            </button>
          ) : canShip ? (
            <button
              type="button"
              className="btn primary"
              disabled={
                tab === "shipping" &&
                (c.loading || !ready || !c.selectedProviderId)
              }
              onClick={() => {
                if (tab !== "shipping") {
                  setTab("shipping");
                  return;
                }
                if (window.confirm("إرسال الطلب إلى حساب التوصيل المحدد؟"))
                  void c.runAction(
                    order.id,
                    "ship",
                    c.shipFromStock ? "stock" : "without_stock"
                  );
              }}
            >
              <Truck size={14} />
              {tab === "shipping" ? "إرسال للشركة" : "تجهيز الشحن"}
            </button>
          ) : (
            <button type="button" className="btn" onClick={c.closeOrder}>
              إغلاق التفاصيل
            </button>
          )}
        </div>
        <details className="more-actions">
          <summary className="btn">
            <MoreHorizontal size={17} />
            المزيد
          </summary>
          <div className="more-actions-menu">
            {order.status === "trashed" ? (
              <button
                type="button"
                disabled={c.loading}
                onClick={() => act("restore")}
              >
                استرجاع الطلب
              </button>
            ) : (
              <button
                type="button"
                className="danger"
                disabled={c.loading}
                onClick={() => act("trash")}
              >
                نقل إلى المحذوفات
              </button>
            )}
          </div>
        </details>
      </footer>
    </Dialog>
  );
}
