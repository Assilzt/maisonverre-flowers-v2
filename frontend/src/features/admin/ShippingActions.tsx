import { useState } from "react";
import { FileText, Pencil, ChevronDown } from "lucide-react";
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
    [error, setError] = useState(""),
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
  const labels = {
    client: "اسم العميل",
    tel: "الهاتف",
    adresse: "العنوان",
    commune: "البلدية",
    wilaya: "رقم الولاية",
    montant: "المبلغ الإجمالي",
    remarque: "ملاحظة الشحنة",
  };
  const run = async (task: () => Promise<unknown>) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await task();
      await onChange();
      setMessage("تم تنفيذ الإجراء بنجاح");
      setEditing(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const allowed = (action: string) =>
    remoteActionAllowed(
      action,
      order.ecotrack_status,
      Boolean(order.remote_validated)
    );
  const carrier = (action: string, extra: Record<string, unknown> = {}) =>
    void run(() =>
      api("/api/shipping", { id: order.id, action, fields: extra })
    );
  const actions = (
    [
      ["validate", "اعتماد دون Ramassage"],
      ["pickup", "اعتماد وطلب Ramassage"],
      ["return", "طلب إرجاع"],
      ["receive-return", "تأكيد استلام المرتجع"],
      ["delete", "إلغاء الشحنة"],
    ] as const
  ).filter(([action]) => allowed(action));
  return (
    <section>
      <h3 style={{ marginBottom: 14 }}>إجراءات الشركة</h3>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {order.ecotrack_tracking && (
        <>
          <div className="toolbar">
            <a
              className="btn"
              href={"/api/shipping?id=" + order.id}
              target="_blank"
              rel="noreferrer"
            >
              <FileText size={14} />
              ملصق الشحنة PDF
            </a>
            {allowed("edit") && (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => setEditing(!editing)}
              >
                <Pencil size={14} />
                تعديل لدى الشركة
              </button>
            )}
          </div>
          {actions.length > 0 && (
            <details style={{ marginTop: 10 }}>
              <summary>
                إجراءات إضافية{" "}
                <ChevronDown size={13} style={{ display: "inline" }} />
              </summary>
              <p className="muted" style={{ marginBottom: 12 }}>
                تُراجع الحالة لدى الشركة قبل التنفيذ. لا تظهر الإجراءات غير
                المتاحة في هذه المرحلة.
              </p>
              <div className="actions-grid">
                {actions.map(([action, label]) => (
                  <button
                    type="button"
                    key={action}
                    className={
                      "btn small" + (action === "delete" ? " danger" : "")
                    }
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(label + "؟")) carrier(action);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </details>
          )}
          {editing && (
            <form
              className="detail-section"
              onSubmit={e => {
                e.preventDefault();
                carrier("edit", fields);
              }}
            >
              <div className="form-grid">
                {(Object.keys(fields) as Array<keyof typeof fields>).map(
                  key => (
                    <label key={key}>
                      {labels[key]}
                      <input
                        required={key !== "remarque"}
                        type={key === "montant" ? "number" : "text"}
                        min={key === "montant" ? 0 : undefined}
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
                  )
                )}
              </div>
              <div className="toolbar" style={{ marginTop: 18 }}>
                <button type="submit" className="btn primary" disabled={busy}>
                  حفظ لدى الشركة
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setEditing(false)}
                >
                  إلغاء
                </button>
              </div>
            </form>
          )}
          <details style={{ marginTop: 10 }}>
            <summary>إرسال ملاحظة لشركة التوصيل</summary>
            <form
              onSubmit={e => {
                e.preventDefault();
                carrier("note", { content: note });
              }}
            >
              <label>
                الملاحظة
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  maxLength={1000}
                  required
                />
              </label>
              <button
                type="submit"
                className="btn"
                style={{ marginTop: 12 }}
                disabled={busy || !note.trim()}
              >
                إرسال الملاحظة
              </button>
            </form>
          </details>
        </>
      )}
      {["uncertain", "processing"].includes(order.shipment_status || "") && (
        <div className="notice warning">
          <div>
            <p>
              النتيجة غير مؤكدة. طابق المرجع لدى الشركة قبل محاولة إنشاء أخرى.
            </p>
            <button
              type="button"
              className="btn small"
              style={{ marginTop: 12 }}
              disabled={busy}
              onClick={() =>
                void run(() => api("/api/recovery", { id: order.id }))
              }
            >
              مطابقة الشحنة
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
