import {
  Archive,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Info,
  Package,
  Phone,
  RefreshCw,
  Settings,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import type { DashboardContext } from "../useDashboard";
export function DashboardMobileDrawer({
  context,
}: {
  context: DashboardContext;
}) {
  const {
    drawerOpen,
    setDrawerOpen,
    totalOrderCount,
    confirmationQueueCount,
    shippingQueueCount,
    trackingQueueCount,
    followUpCount,
    section,
    goToSection,
    counts,
    syncStatuses,
    syncing,
    shipAll,
    loading,
    confirmedCount,
    setSettingsOpen,
  } = context;
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-50 w-[min(92vw,390px)] overflow-y-auto bg-white p-5 shadow-2xl transition-transform duration-200 ${drawerOpen ? "translate-x-0" : "translate-x-full"}`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-600">
            ATLASIO
          </p>
          <h2 className="mt-1 text-xl font-black">الأدوات</h2>
        </div>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mb-5 space-y-2 border-b border-slate-100 pb-5">
        <a
          href="/admin/products"
          className="flex w-full items-center rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-800"
        >
          المنتجات وصفحات الهبوط
        </a>
        <a
          href="/admin/operations"
          className="flex w-full items-center rounded-2xl bg-slate-50 p-4 text-sm font-black"
        >
          المهام والأخطاء
        </a>
        <p className="px-1 text-xs font-black text-slate-400">سير العمل</p>
        {[
          ["orders", "الواردة", totalOrderCount, ClipboardList],
          ["confirmation", "التأكيد", confirmationQueueCount, Phone],
          ["shipping", "الشحن", shippingQueueCount, Truck],
          ["tracking", "التتبع", trackingQueueCount, RefreshCw],
          ["incomplete", "تحتاج متابعة", followUpCount, Package],
        ].map(item => {
          const key = item[0] as typeof section;
          const label = item[1] as string;
          const count = item[2] as number;
          const Icon = item[3] as typeof ClipboardList;
          return (
            <button
              key={key}
              type="button"
              onClick={() => goToSection(key)}
              className={`flex w-full items-center justify-between rounded-2xl p-4 text-right text-sm font-black ${section === key ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-700"}`}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" /> {label}
              </span>
              <span>{count}</span>
            </button>
          );
        })}
        <p className="mt-4 px-1 text-xs font-black text-slate-400">
          الأرشيف والتقارير
        </p>
        <button
          type="button"
          onClick={() => goToSection("completed")}
          className={`flex w-full items-center justify-between rounded-2xl p-3 text-right text-sm font-black ${section === "completed" ? "bg-violet-50 text-violet-800" : "bg-slate-50 text-slate-700"}`}
        >
          <span className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5" /> تم التسليم
          </span>
          <span>{counts.delivered || 0}</span>
        </button>
        <button
          type="button"
          onClick={() => goToSection("returns")}
          className={`flex w-full items-center justify-between rounded-2xl p-3 text-right text-sm font-black ${section === "returns" ? "bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-700"}`}
        >
          <span className="flex items-center gap-3">
            <Archive className="h-5 w-5" /> المرتجعات
          </span>
          <span>{counts.returned || 0}</span>
        </button>
        <button
          type="button"
          onClick={() => goToSection("analytics")}
          className={`flex w-full items-center justify-between rounded-2xl p-3 text-right text-sm font-black ${section === "analytics" ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`}
        >
          <span className="flex items-center gap-3">
            <Info className="h-5 w-5" /> التقارير
          </span>
        </button>
        <button
          type="button"
          onClick={() => goToSection("trash")}
          className={`flex w-full items-center justify-between rounded-2xl p-3 text-right text-sm font-black ${section === "trash" ? "bg-rose-50 text-rose-800" : "bg-slate-50 text-slate-700"}`}
        >
          <span className="flex items-center gap-3">
            <Trash2 className="h-5 w-5" /> المحذوفات
          </span>
          <span>{counts.trashed || 0}</span>
        </button>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            void syncStatuses();
            setDrawerOpen(false);
          }}
          className="flex w-full items-center justify-between rounded-2xl bg-blue-50 p-4 text-right text-sm font-black text-blue-700"
        >
          <span className="flex items-center gap-3">
            <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />{" "}
            مزامنة حالات EcoTrack
          </span>
          <span className="text-xs text-blue-400">الآن</span>
        </button>
        <button
          type="button"
          onClick={() => void shipAll()}
          disabled={loading}
          className="flex w-full items-center justify-between rounded-2xl bg-emerald-500 p-4 text-right text-sm font-black text-white disabled:opacity-60"
        >
          <span className="flex items-center gap-3">
            <Truck className="h-5 w-5" /> شحن الطلبات المؤكدة (حتى 10)
          </span>
          <span>{confirmedCount}</span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          setSettingsOpen(true);
          setDrawerOpen(false);
        }}
        className="mt-6 flex w-full items-center justify-between rounded-2xl bg-slate-950 p-4 text-right text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:bg-emerald-700"
      >
        <span className="flex items-center gap-3">
          <Settings className="h-5 w-5" /> إعدادات المتجر
        </span>
        <ChevronDown className="h-4 w-4 rotate-90" />
      </button>
    </aside>
  );
}
