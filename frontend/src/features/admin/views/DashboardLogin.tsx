import { Loader2, Package } from "lucide-react";
import type { DashboardContext } from "../useDashboard";
export function DashboardLogin({ context }: { context: DashboardContext }) {
  const { loadOrders, passwordInput, setPasswordInput, loading, error } =
    context;
  return (
    <main className="min-h-screen bg-[#f4f6f5] px-4 py-16" dir="rtl">
      <div className="mx-auto max-w-md rounded-[28px] border border-white bg-white p-8 shadow-[0_24px_80px_-35px_rgba(15,23,42,.25)]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <Package className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-950">لوحة الطلبات</h1>
          <p className="mt-2 text-sm text-slate-500">
            أدخل كلمة المرور لإدارة طلبات Atlasio.
          </p>
        </div>
        <form
          onSubmit={event => {
            event.preventDefault();
            void loadOrders(passwordInput);
          }}
          className="space-y-4"
        >
          <input
            type="password"
            value={passwordInput}
            onChange={event => setPasswordInput(event.target.value)}
            placeholder="كلمة مرور اللوحة"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-right outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !passwordInput}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 font-bold text-white transition active:scale-[.98] hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading && <Loader2 className="h-5 w-5 animate-spin" />} دخول
          </button>
        </form>
        {error && (
          <p className="mt-4 text-center text-sm font-semibold text-rose-600">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
