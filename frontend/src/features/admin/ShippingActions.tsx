import { useState } from "react";
import type { Order } from "@shared/orders";
import { remoteActionAllowed } from "@shared/shipping-status";
import { api } from "@/services/api";
export function ShippingActions({
  order,
  onChange,
}: {
  order: Order;
  onChange: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [note, setNote] = useState(""),
    [editing, setEditing] = useState(false);
  const [fields, setFields] = useState({
    client: order.full_name || "",
    tel: order.phone,
    adresse: [order.commune, order.wilaya].filter(Boolean).join(" - "),
    commune: order.commune || "",
    wilaya: order.wilaya?.match(/^\d+/)?.[0] || "",
    montant: order.price + order.delivery_fee,
    remarque: "",
  });
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setMessage("");
    try {
      await task();
      await onChange();
      setMessage("تم تنفيذ الإجراء");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const carrier = (action: string, extra: Record<string, unknown> = {}) =>
    void run(() =>
      api("/api/shipping", { id: order.id, action, fields: extra })
    );
  return (
    <section className="panel">
      <h2>إجراءات الشحنة</h2>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}

      {order.ecotrack_tracking && (
        <>
          <div className="actions-grid">
            {(
              [
                ["validate", "اعتماد الإرسال / دون Ramassage"],
                ["pickup", "اعتماد + طلب Ramassage"],
                ["return", "طلب إرجاع"],
                ["receive-return", "تأكيد استلام المرتجع"],
                ["delete", "إلغاء الرفع من EcoTrack"],
              ] as const
            ).map(([action, label]) => (
              <button
                key={action}
                className={"btn " + (action === "delete" ? "danger" : "")}
                disabled={
                  busy ||
                  !remoteActionAllowed(
                    action,
                    order.ecotrack_status,
                    Boolean(order.remote_validated)
                  )
                }
                title="تُراجع الأهلية لدى EcoTrack قبل التنفيذ"
                onClick={() => {
                  if (
                    ["delete", "receive-return", "validate", "pickup"].includes(
                      action
                    ) &&
                    !window.confirm(label + "؟")
                  )
                    return;
                  carrier(action);
                }}
              >
                {label}
              </button>
            ))}
            <a
              className="btn"
              href={"/api/shipping?id=" + order.id}
              target="_blank"
              rel="noreferrer"
            >
              ملصق PDF / طباعة
            </a>
            <button
              className="btn"
              onClick={() =>
                void navigator.clipboard.writeText(order.ecotrack_tracking!)
              }
            >
              نسخ Tracking
            </button>
            <button
              className="btn"
              disabled={
                busy ||
                !remoteActionAllowed(
                  "edit",
                  order.ecotrack_status,
                  Boolean(order.remote_validated)
                )
              }
              onClick={() => setEditing(!editing)}
            >
              تعديل لدى الشركة
            </button>
          </div>
          {editing && (
            <div className="form-grid">
              {(Object.keys(fields) as Array<keyof typeof fields>).map(key => (
                <label key={key}>
                  {key}
                  <input
                    value={fields[key]}
                    onChange={e =>
                      setFields(f => ({
                        ...f,
                        [key]:
                          key === "montant"
                            ? Number(e.target.value)
                            : e.target.value,
                      }))
                    }
                  />
                </label>
              ))}
              <button
                className="btn primary"
                disabled={busy}
                onClick={() => carrier("edit", fields)}
              >
                حفظ التعديل البعيد
              </button>
            </div>
          )}
          <div className="toolbar">
            <input
              aria-label="ملاحظة لشركة التوصيل"
              placeholder="ملاحظة ترسل لشركة التوصيل"
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={1000}
            />
            <button
              className="btn"
              disabled={busy || !note.trim()}
              onClick={() => carrier("note", { content: note })}
            >
              إرسال للشركة
            </button>
          </div>
        </>
      )}
      {["uncertain", "processing"].includes(order.shipment_status || "") && (
        <div className="notice">
          <p>
            نتيجة الرفع تحتاج تحققًا؛ لا تعِد إنشاء الشحنة قبل المطابقة لدى
            الشركة.
          </p>
          <button
            className="btn"
            disabled={busy}
            onClick={() =>
              void run(() => api("/api/recovery", { id: order.id }))
            }
          >
            مطابقة الشحنة بالمرجع
          </button>
        </div>
      )}
    </section>
  );
}
