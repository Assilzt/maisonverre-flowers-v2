import { useState } from "react";
import {
  Check,
  Copy,
  MessageCircle,
  MessageSquare,
  Phone,
  RotateCcw,
  Truck,
  X,
} from "lucide-react";
import type { Order } from "@shared/orders";
import {
  allowedActions,
  orderStage,
  type FlowAction,
} from "@shared/order-flow";
import { internationalPhone } from "@shared/phone";
import type { DashboardContext } from "../useDashboard";
import { customerSmsMessage } from "../presentation";
import { orderStatusView, timeAgo } from "./OrderRow";

const STEPS = ["جديد", "مؤكد", "مشحون", "مسلّم"];

const CONTACT: Array<[FlowAction, string, string, boolean]> = [
  ["no_answer", "لم يرد", "amber", false],
  ["busy", "مشغول", "amber", false],
  ["call_later", "اتصل لاحقًا", "blue", false],
  ["wrong_number", "رقم خاطئ", "red", true],
  ["refused", "رفض الطلب", "red", true],
];

/** Header, progress and the next allowed step of an order. */
export function OrderSheetTop({
  order,
  context: c,
  onShip,
}: {
  order: Order;
  context: DashboardContext;
  onShip: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const status = orderStatusView(order);
  const stage = orderStage(order);
  const actions = allowedActions(order);
  const name = order.full_name?.trim() || "عميل بدون اسم";
  const intl = internationalPhone(order.phone);
  const busy = c.contactBusy || c.loading;
  const destructive = (label: string) =>
    window.confirm(`${label}: سيُلغى الطلب. متابعة؟`);

  return (
    <>
      <section className={"sheet-hero tone-" + status.tone}>
        <span className="sheet-avatar" aria-hidden="true">
          {name.slice(0, 1)}
        </span>
        <h2>{name}</h2>
        <span className={"ops-badge " + status.tone}>{status.label}</span>
        <p className="sheet-sub num">
          {(order.price + (order.delivery_fee || 0)).toLocaleString("en-US")} دج
          · {timeAgo(order.created_at)} · {order.lead_id}
        </p>
        <div className="sheet-quick">
          <a href={"tel:" + order.phone}>
            <span>
              <Phone size={18} />
            </span>
            اتصال
          </a>
          {intl && (
            <a href={"https://wa.me/" + intl} target="_blank" rel="noreferrer">
              <span>
                <MessageCircle size={18} />
              </span>
              واتساب
            </a>
          )}
          <a
            href={`sms:${order.phone}?body=${encodeURIComponent(customerSmsMessage)}`}
          >
            <span>
              <MessageSquare size={18} />
            </span>
            SMS
          </a>
          <button
            type="button"
            onClick={() =>
              void navigator.clipboard
                ?.writeText(order.phone)
                .then(() => setCopied(true))
            }
          >
            <span>
              <Copy size={18} />
            </span>
            {copied ? "تم النسخ" : "نسخ الرقم"}
          </button>
        </div>
      </section>

      <ol
        className={"sheet-steps" + (stage.ended ? " ended" : "")}
        aria-label="مراحل الطلب"
      >
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={
              index < stage.step
                ? "done"
                : index === stage.step
                  ? "current"
                  : ""
            }
          >
            <span>{index < stage.step ? <Check size={13} /> : index + 1}</span>
            {index === stage.step && stage.ended
              ? stage.ended === "cancelled"
                ? "ملغى"
                : "مرتجع"
              : label}
          </li>
        ))}
      </ol>

      <section className="sheet-next">
        <h3>الخطوة التالية</h3>
        {actions.includes("refused") && (
          <>
            <p className="sheet-hint num">
              محاولات الاتصال: {order.contact_attempts || 0}
              {!actions.includes("confirm") &&
                " · أكمل رقم الهاتف من «تعديل البيانات» قبل التأكيد"}
            </p>
            <button
              type="button"
              className="ops-btn primary sheet-main"
              disabled={busy || !actions.includes("confirm")}
              onClick={() => void c.recordContact(order, "confirmed")}
            >
              <Check size={18} />
              تأكيد الطلب
            </button>
            <div className="sheet-choices">
              {CONTACT.map(([action, label, tone, danger]) => (
                <button
                  type="button"
                  key={action}
                  className={"sheet-choice " + tone}
                  disabled={busy}
                  onClick={() => {
                    if (danger && !destructive(label)) return;
                    void c.recordContact(order, action);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )}
        {actions.includes("ship") && (
          <>
            <button
              type="button"
              className="ops-btn primary sheet-main"
              disabled={busy}
              onClick={onShip}
            >
              <Truck size={18} />
              تجهيز الشحن
            </button>
            <div className="sheet-choices">
              <button
                type="button"
                className="sheet-choice gray"
                disabled={busy}
                onClick={() => void c.changeStatus(order, "complete")}
              >
                <RotateCcw size={15} /> إعادة للمراجعة
              </button>
              <button
                type="button"
                className="sheet-choice red"
                disabled={busy}
                onClick={() => {
                  if (destructive("إلغاء الطلب"))
                    void c.changeStatus(order, "cancelled");
                }}
              >
                <X size={15} /> إلغاء الطلب
              </button>
            </div>
          </>
        )}
        {actions.includes("reopen") && (
          <button
            type="button"
            className="ops-btn tinted sheet-main"
            disabled={busy}
            onClick={() => void c.changeStatus(order, "complete")}
          >
            <RotateCcw size={18} />
            إعادة فتح الطلب
          </button>
        )}
        {!actions.length && (
          <p className="sheet-hint">
            {order.status === "delivered"
              ? "اكتمل الطلب وتم التسليم."
              : order.status === "returned"
                ? "رجعت الشحنة. يمكنك نقل الطلب إلى المحذوفات من «المزيد»."
                : order.status === "trashed"
                  ? "الطلب في المحذوفات. استرجعه من «المزيد»."
                  : order.ecotrack_tracking
                    ? "الشحنة عند شركة التوصيل؛ تابعها من تبويب «الشحنة»."
                    : "لا توجد خطوة متاحة حاليًا."}
          </p>
        )}
      </section>
    </>
  );
}
