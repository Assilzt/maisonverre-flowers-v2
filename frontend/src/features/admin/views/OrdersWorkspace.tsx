import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  PackageSearch,
  ChevronRight,
  ChevronLeft,
  FileDown,
  X,
} from "lucide-react";
import type { DashboardContext } from "../useDashboard";
import { StatusBadge } from "../ui/StatusBadge";
import { statusLabels } from "../presentation";
import { shippingStatus } from "@shared/shipping-status";
import { canConfirmOrder } from "../ui/order-ui";
export function OrdersWorkspace({
  context,
  shipping = false,
}: {
  context: DashboardContext;
  shipping?: boolean;
}) {
  const c = context;
  const [filters, setFilters] = useState(false);
  const tabs = shipping
    ? [
        ["tracking", "نشطة"],
        ["completed", "تم التسليم"],
        ["returns", "المرتجعات"],
      ]
    : [
        ["orders", "كل الطلبات"],
        ["confirmation", "تحتاج تأكيد"],
        ["shipping", "جاهزة للشحن"],
        ["incomplete", "تحتاج متابعة"],
        ["trash", "المحذوفات"],
      ];
  const rows = c.visibleOrders;
  const pages = Math.max(1, Math.ceil(c.totalRows / 50));
  return (
    <>
      <div
        className="section-tabs"
        aria-label={shipping ? "حالات الشحن" : "حالات الطلبات"}
      >
        {tabs.map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={c.section === value ? "active" : ""}
            aria-pressed={c.section === value}
            onClick={() => {
              c.goToSection(value as typeof c.section);
              c.setShippingStage("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <section className="orders-panel" aria-label="قائمة الطلبات">
        <div className="orders-toolbar">
          <div className="search-field">
            <Search size={16} />
            <input
              aria-label="البحث عن طلب"
              placeholder="ابحث بالاسم، الهاتف أو Tracking…"
              value={c.query}
              onChange={e => c.setQuery(e.target.value)}
            />
          </div>
          <button
            type="button"
            className={"btn" + (filters ? " primary" : "")}
            aria-expanded={filters}
            aria-controls="order-filters"
            onClick={() => setFilters(!filters)}
          >
            <SlidersHorizontal size={15} />
            الفلاتر
            {(c.status !== "all" ||
              c.datePreset !== "all" ||
              c.shippingStage) && <span className="alert-dot" />}
          </button>
          <span className="results-count">
            {c.totalRows.toLocaleString()} طلب
          </span>
        </div>
        {filters && (
          <div id="order-filters" className="filter-panel">
            <label>
              حالة الطلب
              <select
                value={c.status}
                onChange={e => c.setStatus(e.target.value as typeof c.status)}
              >
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {key === "abandoned"
                      ? "هاتف غير مكتمل"
                      : key === "complete"
                        ? "طلب مكتمل"
                        : label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              الفترة
              <select
                value={c.datePreset}
                onChange={e =>
                  c.setDatePreset(e.target.value as typeof c.datePreset)
                }
              >
                {[
                  ["all", "كل الفترات"],
                  ["today", "اليوم"],
                  ["yesterday", "أمس"],
                  ["7d", "آخر 7 أيام"],
                  ["30d", "آخر 30 يومًا"],
                  ["this_month", "هذا الشهر"],
                  ["last_month", "الشهر السابق"],
                  ["custom", "فترة مخصصة"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            {c.datePreset === "custom" && (
              <>
                <label>
                  من
                  <input
                    type="date"
                    value={c.dateFrom}
                    onChange={e => c.setDateFrom(e.target.value)}
                  />
                </label>
                <label>
                  إلى
                  <input
                    type="date"
                    value={c.dateTo}
                    onChange={e => c.setDateTo(e.target.value)}
                  />
                </label>
              </>
            )}
            <label>
              مرحلة الشحن
              <select
                value={c.shippingStage}
                onChange={e => c.setShippingStage(e.target.value)}
              >
                <option value="">جميع المراحل</option>
                {c.availableStages.map(s => (
                  <option key={s} value={s}>
                    {shippingStatus(s).label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn quiet"
              onClick={() => {
                c.setDatePreset("all");
                c.setDateFrom("");
                c.setDateTo("");
                c.setStatus("all");
                c.setShippingStage("");
                c.setQuery("");
              }}
            >
              مسح الفلاتر
            </button>
          </div>
        )}
        {c.selectedIds.length > 0 && (
          <div className="bulk-toolbar">
            <strong>{c.selectedIds.length} طلب محدد</strong>
            <button
              type="button"
              className="btn small"
              disabled={c.bulkBusy}
              onClick={c.exportSelectedOrdersPdf}
            >
              <FileDown size={14} />
              PDF
            </button>
            {c.section === "trash" ? (
              <button
                type="button"
                className="btn small"
                disabled={c.bulkBusy}
                onClick={() => void c.bulkUpdate(null, "restore")}
              >
                استرجاع المحدد
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn small"
                  disabled={
                    c.bulkBusy ||
                    !c.selectedIds.every(id => {
                      const order = c.orders.find(o => o.id === id);
                      return order && canConfirmOrder(order);
                    })
                  }
                  onClick={() => void c.bulkUpdate("confirmed")}
                >
                  تأكيد المحدد
                </button>
                <button
                  type="button"
                  className="btn small danger"
                  disabled={c.bulkBusy}
                  onClick={() => {
                    if (window.confirm("نقل الطلبات المحددة إلى المحذوفات؟"))
                      void c.bulkUpdate(null, "trash");
                  }}
                >
                  نقل للمحذوفات
                </button>
              </>
            )}
            <button
              type="button"
              className="icon-button"
              aria-label="إلغاء التحديد"
              onClick={() => c.setSelectedIds([])}
            >
              <X size={14} />
            </button>
          </div>
        )}
        {c.loading && (
          <div
            className="loading-line"
            role="progressbar"
            aria-label="تحميل الطلبات"
          />
        )}
        {rows.length > 0 ? (
          <table className="orders-table">
            <thead>
              <tr>
                <th className="select-cell">
                  <input
                    type="checkbox"
                    aria-label="تحديد جميع طلبات الصفحة"
                    checked={c.allVisibleSelected}
                    onChange={c.toggleSelectAll}
                  />
                </th>
                <th>العميل / الطلب</th>
                <th>الهاتف</th>
                <th className="location-cell">الوجهة</th>
                <th className="order-product-cell">المنتج</th>
                <th>الحالة</th>
                <th>الإجمالي</th>
                <th>
                  <span className="sr-only">الإجراء</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(order => (
                <tr
                  key={order.id}
                  className={c.selectedIds.includes(order.id) ? "selected" : ""}
                >
                  <td className="select-cell">
                    <input
                      type="checkbox"
                      aria-label={"تحديد الطلب " + order.id}
                      checked={c.selectedIds.includes(order.id)}
                      onChange={() => c.toggleSelected(order.id)}
                    />
                  </td>
                  <td className="customer-cell">
                    <button
                      type="button"
                      className="customer-button"
                      onClick={() => c.openOrder(order)}
                    >
                      <span className="customer-avatar">
                        {(order.full_name || "ز").slice(0, 1)}
                      </span>
                      <span>
                        <strong>{order.full_name || "عميل بدون اسم"}</strong>
                        <small>
                          #{order.id} ·{" "}
                          {new Intl.DateTimeFormat("ar-DZ", {
                            day: "numeric",
                            month: "short",
                          }).format(new Date(order.created_at))}
                        </small>
                        <span className="order-mobile-subtitle">
                          {order.wilaya || "العنوان غير مكتمل"}
                          {order.commune ? "، " + order.commune : ""}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="phone-cell">
                    <a className="mono" href={"tel:" + order.phone}>
                      {order.phone}
                    </a>
                  </td>
                  <td className="location-cell">
                    {order.wilaya || "—"}
                    <span className="subtle">{order.commune || "—"}</span>
                  </td>
                  <td className="order-product-cell">
                    {order.order_snapshot?.name || order.campaign}
                    <span className="subtle">
                      الكمية: {order.quantity || 1}
                    </span>
                  </td>
                  <td className="status-cell">
                    <StatusBadge status={order.status} />
                    {order.ecotrack_tracking && (
                      <span className="subtle">
                        <StatusBadge carrier status={order.ecotrack_status} />
                      </span>
                    )}
                  </td>
                  <td className="amount-cell">
                    <span className="order-amount">
                      {(order.price + order.delivery_fee).toLocaleString()}{" "}
                      <small>دج</small>
                    </span>
                  </td>
                  <td className="action-cell">
                    <button
                      type="button"
                      className="row-action"
                      onClick={() => c.openOrder(order)}
                    >
                      {["abandoned", "complete", "not_responding"].includes(
                        order.status
                      )
                        ? "مراجعة الطلب"
                        : order.status === "confirmed"
                          ? "تجهيز الشحن"
                          : "التفاصيل"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <PackageSearch size={32} strokeWidth={1.4} />
            <h2>{c.loading ? "جارٍ تحميل الطلبات…" : "لا توجد طلبات هنا"}</h2>
            <p>
              {c.query || c.status !== "all" || c.shippingStage
                ? "جرّب تغيير البحث أو الفلاتر لعرض نتائج أخرى."
                : "ستظهر الطلبات في هذا القسم عندما تصل إلى هذه المرحلة."}
            </p>
          </div>
        )}
        <footer className="orders-pagination">
          <span>
            {c.totalRows
              ? `عرض ${(c.ordersPage - 1) * 50 + 1}–${Math.min(c.ordersPage * 50, c.totalRows)} من ${c.totalRows}`
              : "0 طلب"}{" "}
            · صفحة {c.ordersPage} من {pages}
          </span>
          <div className="toolbar">
            <button
              type="button"
              className="btn small"
              disabled={c.loading || c.ordersPage <= 1}
              onClick={() => c.setOrdersPage(c.ordersPage - 1)}
            >
              <ChevronRight size={14} />
              السابق
            </button>
            <button
              type="button"
              className="btn small"
              disabled={c.loading || c.ordersPage >= pages}
              onClick={() => c.setOrdersPage(c.ordersPage + 1)}
            >
              التالي
              <ChevronLeft size={14} />
            </button>
          </div>
        </footer>
      </section>
    </>
  );
}
