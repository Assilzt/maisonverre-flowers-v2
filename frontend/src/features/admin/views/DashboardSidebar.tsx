import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Info,
  LogOut,
  Package,
  Phone,
  RefreshCw,
  Settings,
  Trash2,
  Truck,
} from "lucide-react";
import type { DashboardContext } from "../useDashboard";
export function DashboardSidebar({ context }: { context: DashboardContext }) {
  const {
    counts,
    confirmationQueueCount,
    followUpCount,
    shippingQueueCount,
    trackingQueueCount,
    totalOrderCount,
    syncStatuses,
    setPassword,
    section,
    setSettingsOpen,
    tokenConfigured,
    setDrawerOpen,
    goToSection,
  } = context;
  return (
    <aside className="hidden w-[238px] shrink-0 flex-col bg-[#0d1a17] p-5 text-white lg:flex">
      <div className="mb-10 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400 font-black text-[#0d1a17]">
          A
        </div>
        <div>
          <p className="text-lg font-black tracking-tight">Atlasio</p>
          <p className="text-[10px] text-emerald-200/60">OPERATIONS</p>
        </div>
      </div>
      <nav className="space-y-2 text-sm font-semibold">
        <a
          href="/admin/operations"
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          المهام والأخطاء
        </a>
        <a
          href="/admin/products"
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          المنتجات وصفحات الهبوط
        </a>
        <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[.18em] text-slate-500">
          سير العمل
        </p>
        <button
          type="button"
          onClick={() => goToSection("orders")}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition ${section === "orders" ? "bg-white/10 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
        >
          <ClipboardList className="h-4 w-4" /> الواردة{" "}
          <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
            {totalOrderCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => goToSection("confirmation")}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition ${section === "confirmation" ? "bg-white/10 text-amber-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
        >
          <Phone className="h-4 w-4" /> التأكيد{" "}
          <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
            {confirmationQueueCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => goToSection("shipping")}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition ${section === "shipping" ? "bg-white/10 text-blue-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
        >
          <Truck className="h-4 w-4" /> الشحن{" "}
          <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
            {shippingQueueCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => goToSection("tracking")}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition ${section === "tracking" ? "bg-white/10 text-violet-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
        >
          <RefreshCw className="h-4 w-4" /> التتبع{" "}
          <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
            {trackingQueueCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => goToSection("incomplete")}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition ${section === "incomplete" ? "bg-white/10 text-orange-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
        >
          <Package className="h-4 w-4" /> تحتاج متابعة{" "}
          <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
            {followUpCount}
          </span>
        </button>
        <div className="my-3 border-t border-white/10 pt-3">
          <p className="px-3 pb-1 text-[10px] font-black uppercase tracking-[.18em] text-slate-500">
            الأرشيف والتقارير
          </p>
          <button
            type="button"
            onClick={() => goToSection("completed")}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${section === "completed" ? "bg-white/10 text-violet-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <CheckCircle2 className="h-4 w-4" /> تم التسليم{" "}
            <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
              {counts.delivered || 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => goToSection("returns")}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${section === "returns" ? "bg-white/10 text-rose-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Archive className="h-4 w-4" /> المرتجعات{" "}
            <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
              {counts.returned || 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => goToSection("analytics")}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${section === "analytics" ? "bg-white/10 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Info className="h-4 w-4" /> التقارير
          </button>
          <button
            type="button"
            onClick={() => goToSection("trash")}
            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 transition ${section === "trash" ? "bg-white/10 text-rose-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Trash2 className="h-4 w-4" /> المحذوفات{" "}
            <span className="mr-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px]">
              {counts.trashed || 0}
            </span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => void syncStatuses()}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" /> مزامنة EcoTrack
        </button>
        <button
          type="button"
          onClick={() => {
            setSettingsOpen(true);
            setDrawerOpen(false);
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <Settings className="h-4 w-4" /> الإعدادات
        </button>
        <button
          type="button"
          onClick={() => {
            void fetch("/api/session", { method: "DELETE" });
            setPassword("");
          }}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> خروج
        </button>
      </nav>
      <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-3 text-xs">
        <p className="font-bold text-emerald-300">EcoTrack</p>
        <p className="mt-1 text-slate-400">
          {tokenConfigured ? "متصل وجاهز للشحن" : "يحتاج إعداد التوكن"}
        </p>
      </div>
    </aside>
  );
}
