import "@/styles/ops.css";
import {
  ChevronLeft,
  ChevronRight,
  FileDown,
  Menu,
  PackageSearch,
  Play,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import type { DashboardContext } from "../useDashboard";
import type { OrderSection } from "../model/sections";
import { shippingStatus } from "@shared/shipping-status";
import { canConfirmOrder } from "../ui/order-ui";
import { OrderRow } from "./OrderRow";

const PAGE_SIZE = 50;

const TITLES: Partial<Record<OrderSection, [string, string]>> = {
  orders: ["الطلبات", "كل الطلبات غير المحذوفة"],
  confirmation: ["التأكيد", "اتصل بالعميل ثم أكّد الطلب أو ارفضه"],
  shipping: ["الشحن", "طلبات مؤكدة تنتظر الرفع لشركة التوصيل"],
  tracking: ["التتبع", "شحنات مرفوعة وآخر حالة من شركة التوصيل"],
  incomplete: ["تحتاج متابعة", "طلبات لم يرد أصحابها أو لم تكتمل"],
  completed: ["تم التسليم", "أرشيف الطلبات المسلّمة"],
  returns: ["المرتجعات", "شحنات مرتجعة تحتاج قرارًا"],
  trash: ["المحذوفات", "طلبات محذوفة مؤقتًا ويمكن استرجاعها"],
  analytics: ["التحليلات", "مؤشرات مبنية على الطلبات المحمّلة"],
};

const PERIODS = [
  ["all", "كل الفترات"],
  ["today", "اليوم"],
  ["yesterday", "أمس"],
  ["7d", "آخر 7 أيام"],
  ["30d", "آخر 30 يومًا"],
  ["this_month", "هذا الشهر"],
  ["last_month", "الشهر السابق"],
  ["custom", "فترة مخصصة"],
] as const;

export function OrdersScreen({ context: c }: { context: DashboardContext }) {
  const total = Object.entries(c.counts)
    .filter(([status]) => status !== "trashed")
    .reduce((sum, [, count]) => sum + count, 0);
  const tabs: Array<[OrderSection, string, number, boolean]> = [
    ["orders", "الكل", total, false],
    ["confirmation", "تحتاج تأكيد", c.confirmationQueueCount, true],
    ["shipping", "جاهزة للشحن", c.shippingQueueCount, true],
    ["tracking", "قيد التوصيل", c.trackingQueueCount, false],
    ["incomplete", "تحتاج متابعة", c.followUpCount, false],
  ];
  if (!tabs.some(([section]) => section === c.section))
    tabs.push([
      c.section,
      TITLES[c.section]?.[0] || c.sectionTitle,
      c.visibleOrders.length,
      false,
    ]);
  const [title, description] = TITLES[c.section] || [
    c.sectionTitle,
    c.sectionDescription,
  ];
  const filtered =
    Boolean(c.query.trim()) ||
    c.datePreset !== "all" ||
    Boolean(c.shippingStage);
  const clearFilters = () => {
    c.setQuery("");
    c.setDatePreset("all");
    c.setDateFrom("");
    c.setDateTo("");
    c.setShippingStage("");
  };
  const rows = c.visibleOrders;
  const pages = Math.max(1, Math.ceil(c.totalRows / PAGE_SIZE));
  const first = c.totalRows ? (c.ordersPage - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(c.ordersPage * PAGE_SIZE, c.totalRows);
  const selectedOrders = c.orders.filter(o => c.selectedIds.includes(o.id));
  const shipReady = c.orders.filter(
    o => o.status === "confirmed" && !o.ecotrack_tracking
  ).length;
  const needsWork = c.confirmationQueueCount + c.followUpCount > 0;

  return (
    <div className="ops">
      <header className="ops-header">
        <div className="ops-header-title">
          <button
            type="button"
            className="ops-btn icon ops-menu-button"
            onClick={() => c.setDrawerOpen(true)}
            aria-label="فتح القائمة"
          >
            <Menu size={18} />
          </button>
          <div>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
        <div className="ops-header-actions">
          <button
            type="button"
            className="ops-btn quiet"
            onClick={() => void c.loadOrders()}
            aria-label="تحديث الطلبات"
          >
            <RefreshCw size={16} className={c.loading ? "ops-spin" : ""} />
            <span className="ops-hide-phone">تحديث</span>
          </button>
          {needsWork && (
            <button
              type="button"
              className="ops-btn primary"
              onClick={c.startWork}
              title="يفتح أول طلب يحتاج إجراءً"
            >
              <Play size={16} />
              ابدأ العمل
            </button>
          )}
        </div>
      </header>

      {c.section === "analytics" && (
        <div className="ops-stats">
          <div className="ops-stat">
            <p>إجمالي الطلبات</p>
            <strong className="num">{total}</strong>
          </div>
          <div className="ops-stat">
            <p>نسبة التأكيد</p>
            <strong className="num">{c.confirmationRate}%</strong>
          </div>
          <div className="ops-stat">
            <p>مرفوعة</p>
            <strong className="num">{c.shippedCount}</strong>
          </div>
          <div className="ops-stat">
            <p>تم التسليم</p>
            <strong className="num">{c.deliveredCount}</strong>
          </div>
        </div>
      )}

      <div className="ops-tabs" role="tablist" aria-label="مراحل الطلبات">
        {tabs.map(([section, label, count, attention]) => (
          <button
            key={section}
            type="button"
            role="tab"
            className="ops-tab"
            aria-selected={c.section === section}
            onClick={() => {
              c.goToSection(section);
              c.setShippingStage("");
            }}
          >
            {label}
            <span
              className={"ops-count" + (attention && count ? " attention" : "")}
            >
              {count}
            </span>
          </button>
        ))}
      </div>

      {c.selectedIds.length > 0 ? (
        <div className="ops-bulk" role="region" aria-label="إجراءات المحدد">
          <strong>{c.selectedIds.length} محدد</strong>
          {c.section === "trash" ? (
            <button
              type="button"
              className="ops-btn small primary"
              disabled={c.bulkBusy}
              onClick={() => void c.bulkUpdate(null, "restore")}
            >
              استرجاع
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ops-btn small primary"
                disabled={
                  c.bulkBusy ||
                  !selectedOrders.length ||
                  !selectedOrders.every(canConfirmOrder)
                }
                title="متاح عندما تكون كل الطلبات المحددة قابلة للتأكيد"
                onClick={() => void c.bulkUpdate("confirmed")}
              >
                تأكيد
              </button>
              <button
                type="button"
                className="ops-btn small"
                disabled={c.bulkBusy}
                onClick={() => {
                  if (window.confirm("إلغاء الطلبات المحددة؟"))
                    void c.bulkUpdate("cancelled");
                }}
              >
                إلغاء الطلبات
              </button>
              <button
                type="button"
                className="ops-btn small"
                disabled={c.bulkBusy}
                onClick={c.exportSelectedOrdersPdf}
              >
                <FileDown size={15} />
                PDF
              </button>
              <button
                type="button"
                className="ops-btn small"
                disabled={c.bulkBusy}
                onClick={() => {
                  if (window.confirm("نقل الطلبات المحددة إلى المحذوفات؟"))
                    void c.bulkUpdate(null, "trash");
                }}
              >
                <Trash2 size={15} />
                حذف
              </button>
            </>
          )}
          <button
            type="button"
            className="ops-btn small icon quiet"
            aria-label="إلغاء التحديد"
            onClick={() => c.setSelectedIds([])}
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="ops-toolbar">
          <label className="ops-search">
            <Search size={16} />
            <input
              className="ops-input"
              type="search"
              value={c.query}
              onChange={e => c.setQuery(e.target.value)}
              placeholder="ابحث بالاسم، الهاتف، الولاية أو رقم التتبع"
              aria-label="البحث في الطلبات"
            />
          </label>
          <select
            className="ops-select"
            value={c.datePreset}
            onChange={e =>
              c.setDatePreset(e.target.value as typeof c.datePreset)
            }
            aria-label="الفترة"
          >
            {PERIODS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {c.datePreset === "custom" && (
            <>
              <input
                className="ops-input"
                type="date"
                value={c.dateFrom}
                onChange={e => c.setDateFrom(e.target.value)}
                aria-label="من تاريخ"
              />
              <input
                className="ops-input"
                type="date"
                value={c.dateTo}
                onChange={e => c.setDateTo(e.target.value)}
                aria-label="إلى تاريخ"
              />
            </>
          )}
          {c.availableStages.length > 0 &&
            ["orders", "tracking", "completed", "returns"].includes(
              c.section
            ) && (
              <select
                className="ops-select"
                value={c.shippingStage}
                onChange={e => c.setShippingStage(e.target.value)}
                aria-label="مرحلة الشحن"
              >
                <option value="">كل مراحل الشحن</option>
                {c.availableStages.map(stage => (
                  <option key={stage} value={stage}>
                    {shippingStatus(stage).label}
                  </option>
                ))}
              </select>
            )}
          {filtered && (
            <button
              type="button"
              className="ops-btn quiet"
              onClick={clearFilters}
            >
              مسح
            </button>
          )}
          {c.section === "shipping" && shipReady > 0 && (
            <button
              type="button"
              className="ops-btn primary"
              disabled={c.loading}
              onClick={() => {
                if (window.confirm(`رفع ${shipReady} طلب مؤكد لشركة التوصيل؟`))
                  void c.shipAll();
              }}
            >
              <Truck size={16} />
              رفع الكل ({shipReady})
            </button>
          )}
          <span className="ops-result-count num">
            {c.totalRows.toLocaleString("en-US")} طلب
          </span>
        </div>
      )}

      {c.section === "trash" && (
        <p className="ops-note">افتح الطلب لاسترجاعه، أو حدّد عدة طلبات.</p>
      )}

      {c.error && (
        <div className="ops-banner" role="alert">
          <span>{c.error}</span>
          <button
            type="button"
            className="ops-btn small icon quiet"
            aria-label="إغلاق التنبيه"
            onClick={() => c.setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section
        className="ops-list"
        aria-label="قائمة الطلبات"
        aria-busy={c.loading}
      >
        {c.loading && rows.length > 0 && <div className="ops-progress" />}
        <div className="ops-list-head">
          <input
            type="checkbox"
            className="ops-check"
            checked={c.allVisibleSelected && rows.length > 0}
            onChange={c.toggleSelectAll}
            aria-label="تحديد كل طلبات الصفحة"
            disabled={!rows.length}
          />
          <span>العميل</span>
          <span>الوجهة</span>
          <span className="ops-col-product">المنتج</span>
          <span>المبلغ</span>
          <span>الحالة</span>
          <span />
        </div>
        {c.loading && rows.length === 0 ? (
          Array.from({ length: 6 }, (_, i) => (
            <div className="ops-row" key={i} aria-hidden="true">
              <span />
              <span className="ops-skeleton" style={{ width: "70%" }} />
              <span className="ops-skeleton" style={{ width: "60%" }} />
              <span
                className="ops-skeleton ops-col-product"
                style={{ width: "50%" }}
              />
              <span className="ops-skeleton" style={{ width: "80%" }} />
              <span className="ops-skeleton" style={{ width: "60%" }} />
              <span />
            </div>
          ))
        ) : rows.length ? (
          rows.map(order => (
            <OrderRow key={order.id} order={order} context={c} />
          ))
        ) : (
          <div className="ops-empty">
            <PackageSearch size={36} strokeWidth={1.5} />
            <h2>{filtered ? "لا توجد نتائج" : "لا توجد طلبات هنا"}</h2>
            <p>
              {filtered
                ? "جرّب كلمة بحث أخرى أو فترة أوسع."
                : "ستظهر الطلبات هنا عندما تصل إلى هذه المرحلة."}
            </p>
            {filtered && (
              <button type="button" className="ops-btn" onClick={clearFilters}>
                مسح البحث والفلاتر
              </button>
            )}
          </div>
        )}
      </section>

      {c.totalRows > PAGE_SIZE && (
        <footer className="ops-pager">
          <span className="num">
            {first}–{last} من {c.totalRows.toLocaleString("en-US")}
          </span>
          <div>
            <button
              type="button"
              className="ops-btn small"
              disabled={c.loading || c.ordersPage <= 1}
              onClick={() => c.setOrdersPage(page => page - 1)}
            >
              <ChevronRight size={15} />
              السابق
            </button>
            <button
              type="button"
              className="ops-btn small"
              disabled={c.loading || c.ordersPage >= pages}
              onClick={() => c.setOrdersPage(page => page + 1)}
            >
              التالي
              <ChevronLeft size={15} />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
