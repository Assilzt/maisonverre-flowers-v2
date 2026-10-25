import { OrderPagination } from "./views/OrderPagination";
import "@/styles/admin.css";
import {
  AlertCircle,
  Check,
  Play,
  CheckCircle2,
  FileDown,
  Info,
  Loader2,
  Menu,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { DashboardLogin } from "./views/DashboardLogin";
import { DashboardSidebar } from "./views/DashboardSidebar";
import { OrderCard } from "./views/OrderCard";
import { DashboardMobileDrawer } from "./views/DashboardMobileDrawer";
import { SettingsDialog } from "./views/SettingsDialog";
import { OrderDialog } from "./views/OrderDialog";
import { EditOrderDialog } from "./views/EditOrderDialog";
import { useDashboard } from "./useDashboard";
export default function Dashboard() {
  const context = useDashboard();
  const {
    orders,
    section,
    query,
    setQuery,
    datePreset,
    setDatePreset,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    loading,
    error,
    setError,
    shippingNotice,
    setShippingNotice,
    drawerOpen,
    setDrawerOpen,
    touchStartX,
    selectedIds,
    setSelectedIds,
    bulkBusy,
    goToSection,
    loadOrders,
    visibleOrders,
    confirmationQueueCount,
    followUpCount,
    sectionTitle,
    sectionDescription,
    confirmedCount,
    shippedCount,
    deliveredCount,
    confirmationRate,
    startWork,
    allVisibleSelected,
    toggleSelectAll,
    bulkUpdate,
    exportSelectedOrdersPdf,
  } = context;
  if (!context.password) return <DashboardLogin context={context} />;
  return (
    <main
      className="admin-dashboard min-h-screen bg-[#f4f6f5] text-slate-950"
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
          <header className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 lg:hidden"
                aria-label="فتح القائمة"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs font-bold uppercase tracking-[.22em] text-emerald-600">
                  ATLASIO / {sectionTitle}
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
                  {sectionTitle}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/admin/products"
                className="flex h-11 items-center rounded-2xl bg-emerald-600 px-3 text-xs font-bold text-white sm:text-sm"
              >
                المنتجات +
              </a>
              <button
                type="button"
                onClick={() => void loadOrders()}
                className="flex h-11 items-center gap-2 rounded-2xl bg-white px-3 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition active:scale-95"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">تحديث</span>
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="hidden h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-bold text-white transition active:scale-95 sm:flex lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" /> الأدوات
              </button>
            </div>
          </header>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm text-slate-500">{sectionDescription}</p>
              <p className="mt-1 text-sm font-semibold text-slate-400">
                عرض {visibleOrders.length} من {orders.length} طلب
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="hidden items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/20 transition active:scale-95 hover:bg-emerald-600 sm:flex"
            >
              <Truck className="h-4 w-4" /> شحن المؤكدين
            </button>
          </div>
          {section === "orders" && (
            <section className="mb-5 rounded-[26px] bg-slate-950 p-3 text-white shadow-xl shadow-slate-950/10 sm:p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-emerald-300">
                    DAILY WORK QUEUE
                  </p>
                  <h2 className="mt-1 text-lg font-black">
                    طابور العمل اليومي
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={startWork}
                  className="flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-400 px-3 py-2.5 text-xs font-black text-slate-950 transition active:scale-95 hover:bg-emerald-300"
                >
                  <Play className="h-4 w-4" /> ابدأ العمل
                </button>
              </div>
              <p className="mb-3 text-xs font-semibold text-slate-400">
                ابدأ من أول طابور يحتوي على طلبات تحتاج إجراءً.
              </p>
              <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                <button
                  type="button"
                  onClick={() => goToSection("confirmation")}
                  className="rounded-2xl bg-white/10 p-3 text-right transition hover:bg-white/15"
                >
                  <p className="text-[11px] font-bold text-amber-200">
                    تحتاج تأكيد
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {confirmationQueueCount}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => goToSection("shipping")}
                  className="rounded-2xl bg-white/10 p-3 text-right transition hover:bg-white/15"
                >
                  <p className="text-[11px] font-bold text-emerald-200">
                    جاهزة للرفع
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {
                      orders.filter(
                        order =>
                          order.status === "confirmed" ||
                          order.shipment_status === "failed"
                      ).length
                    }
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => goToSection("tracking")}
                  className="rounded-2xl bg-white/10 p-3 text-right transition hover:bg-white/15"
                >
                  <p className="text-[11px] font-bold text-blue-200">
                    قيد التوصيل
                  </p>
                  <p className="mt-1 text-2xl font-black">
                    {
                      orders.filter(
                        order =>
                          Boolean(order.ecotrack_tracking) &&
                          !["delivered", "returned"].includes(order.status)
                      ).length
                    }
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => goToSection("incomplete")}
                  className="rounded-2xl bg-white/10 p-3 text-right transition hover:bg-white/15"
                >
                  <p className="text-[11px] font-bold text-orange-200">
                    تحتاج متابعة
                  </p>
                  <p className="mt-1 text-2xl font-black">{followUpCount}</p>
                </button>
              </div>
            </section>
          )}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-xs font-bold text-slate-400">في هذا القسم</p>
              <p className="mt-2 text-2xl font-black">
                {section === "orders"
                  ? orders.filter(order => order.status !== "trashed").length
                  : visibleOrders.length}
              </p>
            </div>
            <div className="rounded-[22px] bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <p className="text-xs font-bold text-emerald-700">مؤكدة</p>
              <p className="mt-2 text-2xl font-black text-emerald-800">
                {confirmedCount}
              </p>
            </div>
            <div className="rounded-[22px] bg-blue-50 p-4 ring-1 ring-blue-100">
              <p className="text-xs font-bold text-blue-700">مرفوعة</p>
              <p className="mt-2 text-2xl font-black text-blue-800">
                {shippedCount}
              </p>
            </div>
            <div className="rounded-[22px] bg-violet-50 p-4 ring-1 ring-violet-100">
              <p className="text-xs font-bold text-violet-700">تم التسليم</p>
              <p className="mt-2 text-2xl font-black text-violet-800">
                {deliveredCount}
              </p>
            </div>
          </div>
          {section === "analytics" && (
            <section className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400">
                  إجمالي الطلبات
                </p>
                <p className="mt-1 text-2xl font-black">
                  {orders.filter(item => item.status !== "trashed").length}
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                <p className="text-[10px] font-bold text-emerald-700">
                  نسبة التأكيد
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-900">
                  {confirmationRate}%
                </p>
              </div>
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-3 shadow-sm">
                <p className="text-[10px] font-bold text-blue-700">مرفوعة</p>
                <p className="mt-1 text-2xl font-black text-blue-900">
                  {shippedCount}
                </p>
              </div>
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 shadow-sm">
                <p className="text-[10px] font-bold text-violet-700">
                  تم التسليم
                </p>
                <p className="mt-1 text-2xl font-black text-violet-900">
                  {deliveredCount}
                </p>
              </div>
            </section>
          )}
          <section className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
            <div>
              <p className="text-xs font-black text-slate-700">
                {section === "orders" ? "كل الطلبات الواردة" : sectionTitle}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-400">
                {section === "orders"
                  ? "استخدم أزرار البطاقة للانتقال للخطوة التالية فقط"
                  : "هذه القائمة تعرض الطلبات التي تنتمي لهذه المرحلة"}
              </p>
            </div>
            {section === "orders" && (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
                {visibleOrders.length} طلب
              </span>
            )}
            {section === "trash" && (
              <p className="px-3 py-2 text-xs font-bold text-rose-700">
                الأرشيف المؤقت — يمكنك استرجاع الطلب من تفاصيله
              </p>
            )}
            {section === "incomplete" && (
              <p className="px-3 py-2 text-xs font-bold text-amber-700">
                جرّب الاتصال مجدداً أو انقل الطلب إلى الملغاة من التفاصيل
              </p>
            )}
          </section>
          <section className="mb-5 flex items-center gap-2 rounded-[22px] bg-white p-2 shadow-sm ring-1 ring-slate-200/70">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="ابحث بالاسم، الهاتف، الولاية أو التتبع"
                className="w-full rounded-2xl bg-slate-50 py-3 pl-4 pr-10 text-sm outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
              />
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"
              aria-label="الفلاتر"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>
          </section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleSelectAll}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${allVisibleSelected ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 bg-white text-transparent hover:border-emerald-400"}`}
                aria-label="تحديد الكل"
              >
                {allVisibleSelected && <Check className="h-4 w-4" />}
              </button>
              <div>
                <p className="text-sm font-black text-slate-800">
                  {selectedIds.length
                    ? `تم تحديد ${selectedIds.length} طلب`
                    : "تحديد الطلبات"}
                </p>
                <p className="text-[11px] font-semibold text-slate-400">
                  {selectedIds.length
                    ? "اختر إجراءً يطبق على المحدد"
                    : "يمكنك تنفيذ الإجراءات على عدة طلبات معاً"}
                </p>
              </div>
            </div>
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={exportSelectedOrdersPdf}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  title="تصدير الطلبات المحددة إلى PDF"
                >
                  <FileDown className="h-4 w-4" /> تصدير PDF
                </button>
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => void bulkUpdate("confirmed")}
                  className="rounded-xl bg-emerald-500 px-3 py-2.5 text-xs font-black text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  تأكيد المحدد
                </button>
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => void bulkUpdate("cancelled")}
                  className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  إلغاء المحدد
                </button>
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => void bulkUpdate(null, "trash")}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" /> نقل للسلة
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded-xl px-2.5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  إلغاء
                </button>
              </div>
            )}
          </div>
          <section className="mb-5 rounded-[22px] bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 px-1 text-xs font-black text-slate-500">
                <SlidersHorizontal className="h-4 w-4 text-emerald-600" />{" "}
                الفترة
              </span>
              <select
                value={datePreset}
                onChange={event =>
                  setDatePreset(event.target.value as typeof datePreset)
                }
                className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="all">كل الفترات</option>
                <option value="today">اليوم</option>
                <option value="yesterday">أمس</option>
                <option value="7d">آخر 7 أيام</option>
                <option value="30d">آخر 30 يوماً</option>
                <option value="this_month">هذا الشهر</option>
                <option value="last_month">الشهر السابق</option>
                <option value="custom">تحديد مخصص</option>
              </select>
              {datePreset === "custom" && (
                <>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    من
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={event => setDateFrom(event.target.value)}
                      className="rounded-xl bg-slate-50 px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                    إلى
                    <input
                      type="date"
                      value={dateTo}
                      onChange={event => setDateTo(event.target.value)}
                      className="rounded-xl bg-slate-50 px-2 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setDatePreset("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="mr-auto rounded-xl px-3 py-2 text-xs font-black text-slate-500 transition hover:bg-slate-100"
              >
                مسح
              </button>
            </div>
            {datePreset !== "all" && (
              <p className="mt-2 px-1 text-[11px] font-bold text-emerald-700">
                يتم عرض {visibleOrders.length} طلب حسب الفترة المحددة
              </p>
            )}
          </section>
          {error && (
            <div className="mb-4 flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-100">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")}>
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <OrderPagination context={context} />
          {loading && orders.length === 0 ? (
            <div className="rounded-[24px] bg-white p-14 text-center text-slate-500 shadow-sm ring-1 ring-slate-200/70">
              جارٍ تحميل الطلبات...
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="rounded-[24px] bg-white p-14 text-center text-slate-500 shadow-sm ring-1 ring-slate-200/70">
              لا توجد طلبات في هذا القسم.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleOrders.map(order => (
                <OrderCard key={order.id} order={order} context={context} />
              ))}
            </div>
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
      <OrderDialog context={context} />
      <EditOrderDialog context={context} />
    </main>
  );
}
