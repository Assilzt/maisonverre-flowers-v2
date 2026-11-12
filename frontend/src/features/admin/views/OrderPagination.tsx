import type { DashboardContext } from "../useDashboard";
import { shippingStatus } from "@shared/shipping-status";
export function OrderPagination({ context: c }: { context: DashboardContext }) {
  return (
    <div className="my-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-200">
      <label>
        مرحلة الشحن{" "}
        <select
          aria-label="مرحلة الشحن"
          value={c.shippingStage}
          onChange={e => c.setShippingStage(e.target.value)}
          className="rounded-xl bg-slate-50 px-3 py-2"
        >
          <option value="">جميع المراحل</option>
          {c.availableStages.map(s => (
            <option key={s} value={s}>
              {shippingStatus(s).label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-3">
        <button
          disabled={c.ordersPage <= 1 || c.loading}
          onClick={() => c.setOrdersPage(p => p - 1)}
          className="rounded-xl bg-slate-50 px-3 py-2 disabled:opacity-40"
        >
          السابق
        </button>
        <span>
          صفحة {c.ordersPage} · {c.totalRows} طلب
        </span>
        <button
          disabled={c.ordersPage * 50 >= c.totalRows || c.loading}
          onClick={() => c.setOrdersPage(p => p + 1)}
          className="rounded-xl bg-slate-50 px-3 py-2 disabled:opacity-40"
        >
          التالي
        </button>
      </div>
    </div>
  );
}
