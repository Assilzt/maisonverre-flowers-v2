import { useEffect, useState } from "react";
import { api } from "@/services/api";
export function OperationsPanel() {
  const [data, setData] = useState<{
      notifications: Array<{
        order_id: number;
        status: string;
        attempts: number;
        last_error: string;
      }>;
      shipments: Array<{
        id: number;
        lead_id: string;
        shipment_status: string;
        ecotrack_sync_error: string;
      }>;
    }>({ notifications: [], shipments: [] }),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const load = async () => setData(await api("/api/jobs"));
  useEffect(() => {
    void load().catch(e => setMessage(e.message));
  }, []);
  const run = async (action: string) => {
    setBusy(true);
    try {
      await api("/api/jobs", { action });
      await load();
      setMessage("انتهت دورة المهام؛ راجع نتائج الطلبات أدناه");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel">
      <h2>المهام والمشاكل</h2>
      <p>
        المزامنة المجدولة تعمل على الخادم. هذه الشاشة تعرض النتائج وتتيح إعادة
        المحاولة.
      </p>
      <div className="toolbar">
        <button className="btn" disabled={busy} onClick={() => void run("run")}>
          تشغيل دورة الآن
        </button>
        <button
          className="btn"
          disabled={busy}
          onClick={() => void run("retry-notifications")}
        >
          إعادة إشعارات Telegram الفاشلة
        </button>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <h3>إشعارات غير مكتملة</h3>
      {data.notifications.length === 0 ? (
        <p>لا توجد إشعارات معلّقة.</p>
      ) : (
        data.notifications.map(n => (
          <p key={n.order_id}>
            #{n.order_id} · {n.status} · {n.attempts} محاولة · {n.last_error}
          </p>
        ))
      )}
      <h3>شحنات تحتاج متابعة</h3>
      {data.shipments
        .filter(
          s =>
            s.ecotrack_sync_error ||
            ["uncertain", "processing"].includes(s.shipment_status)
        )
        .map(s => (
          <p key={s.id}>
            #{s.id} · {s.lead_id} · {s.shipment_status} ·{" "}
            {s.ecotrack_sync_error}
          </p>
        ))}
    </section>
  );
}
