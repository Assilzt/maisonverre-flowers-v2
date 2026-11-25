import "@/styles/admin.css";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  Menu,
  X,
} from "lucide-react";
import { DashboardLogin } from "./views/DashboardLogin";
import { DashboardSidebar } from "./views/DashboardSidebar";
import { DashboardMobileDrawer } from "./views/DashboardMobileDrawer";
import { SettingsDialog } from "./views/SettingsDialog";
import { OrderDialog } from "./views/OrderDialog";
import { EditOrderDialog } from "./views/EditOrderDialog";
import { OrdersScreen } from "./views/OrdersScreen";
import { OperationsPanel } from "./OperationsPanel";
import { useDashboard } from "./useDashboard";
export default function Dashboard() {
  const context = useDashboard();
  const {
    shippingNotice,
    setShippingNotice,
    drawerOpen,
    setDrawerOpen,
    touchStartX,
  } = context;
  if (!context.password) return <DashboardLogin context={context} />;
  const operations = window.location.pathname === "/admin/operations";
  return (
    <main
      className="admin-dashboard min-h-screen bg-[#f6f7f9] text-slate-950"
      dir="rtl"
      onTouchStart={event => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={event => {
        const start = touchStartX.current;
        const end = event.changedTouches[0]?.clientX;
        if (start !== null && end !== undefined && start - end > 70)
          setDrawerOpen(true);
        if (start !== null && end !== undefined && end - start > 70)
          setDrawerOpen(false);
        touchStartX.current = null;
      }}
    >
      {shippingNotice && (
        <div
          className={`fixed inset-x-3 top-3 z-[90] mx-auto max-w-md rounded-2xl border p-4 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-6 sm:top-6 ${shippingNotice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : shippingNotice.type === "error" ? "border-rose-200 bg-rose-50 text-rose-950" : shippingNotice.type === "loading" ? "border-blue-200 bg-blue-50 text-blue-950" : "border-slate-200 bg-white text-slate-950"}`}
          role="status"
        >
          <div className="flex items-start gap-3">
            {shippingNotice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            ) : shippingNotice.type === "error" ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            ) : shippingNotice.type === "loading" ? (
              <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-blue-600" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">{shippingNotice.title}</p>
              <p className="mt-1 text-xs font-bold leading-5 opacity-80">
                {shippingNotice.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShippingNotice(null)}
              className="rounded-lg p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100"
              aria-label="إغلاق الإشعار"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto flex min-h-screen max-w-[1500px]">
        <DashboardSidebar context={context} />
        <section className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
          {operations ? (
            <div className="ops">
              <header className="ops-header">
                <div className="ops-header-title">
                  <button
                    type="button"
                    className="ops-btn icon ops-menu-button"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="فتح القائمة"
                  >
                    <Menu size={18} />
                  </button>
                  <div>
                    <h1>المهام والأخطاء</h1>
                    <p>رسائل Telegram وشحنات تحتاج متابعة</p>
                  </div>
                </div>
                <a className="ops-btn quiet" href="/admin">
                  الطلبات
                </a>
              </header>
              <div className="admin-surface">
                <OperationsPanel />
              </div>
            </div>
          ) : (
            <OrdersScreen context={context} />
          )}
        </section>
      </div>
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[2px]"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <DashboardMobileDrawer context={context} />
      <SettingsDialog context={context} />
      <div className="admin-surface">
        <OrderDialog context={context} />
      </div>
      <EditOrderDialog context={context} />
    </main>
  );
}
