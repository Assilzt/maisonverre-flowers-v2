import { useEffect, useState } from "react";
import { api, updateOrder } from "@/services/api";

type Status = { capiConfigured?: boolean; testEventCode?: string };
type Queue = {
  counts?: Record<string, number>;
  lastError?: { event_name: string; last_error: string } | null;
};

const input =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold tracking-wide outline-none focus:border-blue-400 focus:bg-white";
const primary =
  "self-end rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60";
const secondary =
  "self-end rounded-xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 disabled:opacity-60";

/** Conversions API token and Test Events code. The token is write-only. */
export function MetaCapiSettings() {
  const [status, setStatus] = useState<Status>({});
  const [queue, setQueue] = useState<Queue>({});
  const [token, setToken] = useState("");
  const [testCode, setTestCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(
    null
  );

  const load = async () => {
    try {
      const data = await api<Status>("/api/orders?resource=settings");
      setStatus(data);
      setTestCode(data.testEventCode || "");
      const jobs = await api<{ capi?: Queue }>("/api/jobs");
      setQueue(jobs.capi || {});
    } catch {
      // The rest of the settings page still works.
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const save = async (body: Record<string, unknown>, done: string) => {
    setSaving(true);
    setNotice(null);
    try {
      const data = await updateOrder<Status>({ resource: "settings", ...body });
      setStatus(data);
      setTestCode(data.testEventCode || "");
      setToken("");
      setNotice({ error: false, text: done });
    } catch (error) {
      setNotice({
        error: true,
        text: error instanceof Error ? error.message : "تعذر الحفظ",
      });
    } finally {
      setSaving(false);
    }
  };

  const retry = async () => {
    try {
      await api("/api/jobs", { action: "retry-capi" });
      await load();
      setNotice({ error: false, text: "أُعيدت جدولة الأحداث الفاشلة." });
    } catch (error) {
      setNotice({
        error: true,
        text: error instanceof Error ? error.message : "تعذرت إعادة المحاولة",
      });
    }
  };

  const counts = queue.counts || {};
  const failed = counts.failed || 0;
  return (
    <div className="mb-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-950">
            Meta Conversions API
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            يرسل Lead وPurchase والطلبات المؤكدة والمسلّمة من الخادم إلى Meta،
            فلا تضيع الأحداث بسبب مانعات الإعلانات.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1.5 text-xs font-black ${status.capiConfigured ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
        >
          {status.capiConfigured ? "مفعّل" : "غير مفعّل"}
        </span>
      </div>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={e => {
          e.preventDefault();
          if (token.trim())
            void save({ capiToken: token.trim() }, "تم حفظ الرمز.");
        }}
      >
        <label className="flex-1 text-xs font-black text-slate-500">
          Access token
          <input
            type="password"
            dir="ltr"
            autoComplete="off"
            value={token}
            onChange={e => setToken(e.target.value)}
            aria-label="Conversions API access token"
            placeholder={
              status.capiConfigured
                ? "محفوظ — أدخل رمزًا جديدًا لاستبداله"
                : "Events Manager ← Settings ← Conversions API"
            }
            className={input}
          />
        </label>
        <button
          type="submit"
          className={primary}
          disabled={saving || !token.trim()}
        >
          حفظ الرمز
        </button>
        {status.capiConfigured && (
          <button
            type="button"
            className={secondary}
            disabled={saving}
            onClick={() => {
              if (window.confirm("إيقاف Conversions API وحذف الرمز؟"))
                void save({ capiToken: "" }, "تم إيقاف Conversions API.");
            }}
          >
            حذف
          </button>
        )}
      </form>
      <p className="mt-2 text-xs text-slate-400">
        لا يُعرض الرمز بعد الحفظ ولا يصل إلى المتصفح.
      </p>

      <form
        className="mt-4 flex flex-col gap-3 sm:flex-row"
        onSubmit={e => {
          e.preventDefault();
          void save(
            { testEventCode: testCode.trim() },
            testCode.trim()
              ? "الأحداث تُرسل الآن إلى Test Events."
              : "تمت إزالة رمز الاختبار."
          );
        }}
      >
        <label className="flex-1 text-xs font-black text-slate-500">
          Test Events code
          <input
            dir="ltr"
            value={testCode}
            onChange={e => setTestCode(e.target.value)}
            aria-label="Test Events code"
            placeholder="TEST12345"
            className={input}
          />
        </label>
        <button type="submit" className={secondary} disabled={saving}>
          حفظ رمز الاختبار
        </button>
      </form>
      <p className="mt-2 text-xs text-slate-400">
        للاختبار فقط: احذفه بعد ظهور الأحداث في Test Events.
      </p>

      {(counts.sent || counts.pending || failed) > 0 && (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
          أُرسل: {counts.sent || 0} · في الانتظار: {counts.pending || 0} · فشل:{" "}
          {failed}
          {queue.lastError && (
            <span className="mt-1 block text-xs font-medium text-rose-600">
              آخر خطأ ({queue.lastError.event_name}):{" "}
              {queue.lastError.last_error}
            </span>
          )}
        </p>
      )}
      {failed > 0 && (
        <button
          type="button"
          className={`${secondary} mt-3`}
          onClick={() => void retry()}
        >
          إعادة إرسال الأحداث الفاشلة
        </button>
      )}
      {notice && (
        <p
          role="status"
          className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${notice.error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {notice.text}
        </p>
      )}
    </div>
  );
}
