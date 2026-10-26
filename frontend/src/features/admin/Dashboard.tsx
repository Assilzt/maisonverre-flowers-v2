import { useState } from "react";
import { RefreshCw, ArrowUpLeft, AlertCircle, X } from "lucide-react";
import { AdminShell, type AdminArea } from "./ui/AdminShell";
import { useDashboard } from "./useDashboard";
import { DashboardLogin } from "./views/DashboardLogin";
import { OrdersWorkspace } from "./views/OrdersWorkspace";
import { OrderDialog } from "./views/OrderDialog";
import { Overview } from "./views/Overview";
import { SettingsWorkspace } from "./views/SettingsWorkspace";
import { InventoryTools } from "./InventoryTools";
export default function Dashboard() {
  const c = useDashboard();
  const [stock, setStock] = useState(false);
  const path = location.pathname;
  const active: AdminArea =
    path === "/admin/overview"
      ? "overview"
      : path === "/admin/reports"
        ? "reports"
        : path === "/admin/settings" || path === "/admin/operations"
          ? "settings"
          : path === "/admin/shipping"
            ? "shipping"
            : "orders";
  const titles = {
    overview: ["نظرة عامة", "صورة واضحة عن الطلبات والعمل الذي يحتاج متابعتك."],
    orders: ["الطلبات", "كل طلب، وخطوته التالية، في مكان واحد."],
    shipping: [
      "الشحن والمخزون",
      "متابعة الشحنات والكميات المرتبطة بحسابات التوصيل.",
    ],
    reports: ["التقارير", "مؤشرات تشغيلية من جميع الطلبات المسجلة."],
    settings: ["الإعدادات", "حسابات التوصيل، التتبع، وحالة التكاملات."],
    products: ["المنتجات", ""],
  };
  if (!c.password) return <DashboardLogin context={c} />;
  return (
    <AdminShell
      active={active}
      title={titles[active][0]}
      description={titles[active][1]}
      actions={
        <>
          {active === "shipping" ? (
            <button
              type="button"
              className="btn"
              disabled={c.syncing}
              onClick={() => void c.syncStatuses()}
            >
              <RefreshCw size={15} className={c.syncing ? "spinner" : ""} />
              مزامنة الشحنات
            </button>
          ) : active === "overview" ? (
            <a className="btn primary" href="/admin">
              إدارة الطلبات
              <ArrowUpLeft size={15} />
            </a>
          ) : active === "orders" ? (
            <button
              type="button"
              className="btn"
              disabled={c.loading}
              onClick={() => void c.loadOrders()}
            >
              <RefreshCw size={15} className={c.loading ? "spinner" : ""} />
              تحديث
            </button>
          ) : null}
        </>
      }
    >
      {c.error && (
        <div role="alert" className="notice error">
          <AlertCircle size={16} />
          <div>{c.error}</div>
          <button
            type="button"
            className="icon-button"
            aria-label="إغلاق الخطأ"
            onClick={() => c.setError("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {c.shippingNotice && c.shippingNotice.type !== "loading" && (
        <div
          role="status"
          className={
            "notice" + (c.shippingNotice.type === "error" ? " error" : "")
          }
        >
          <div>
            <strong>{c.shippingNotice.title}</strong>
            <p>{c.shippingNotice.message}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="إغلاق الإشعار"
            onClick={() => c.setShippingNotice(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {active === "overview" || active === "reports" ? (
        <Overview context={c} reports={active === "reports"} />
      ) : active === "settings" ? (
        <SettingsWorkspace context={c} />
      ) : (
        <>
          {active === "shipping" && (
            <div className="toolbar" style={{ marginBottom: 22 }}>
              <button
                type="button"
                className={"btn" + (!stock ? " primary" : "")}
                aria-pressed={!stock}
                onClick={() => setStock(false)}
              >
                الشحنات
              </button>
              <button
                type="button"
                className={"btn" + (stock ? " primary" : "")}
                aria-pressed={stock}
                onClick={() => setStock(true)}
              >
                المخزون
              </button>
            </div>
          )}
          {stock && active === "shipping" ? (
            <>
              <section className="panel">
                <label>
                  حساب التوصيل
                  <select
                    value={c.selectedProviderId}
                    onChange={e => c.setSelectedProviderId(e.target.value)}
                  >
                    {c.providers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </section>
              <InventoryTools
                providerId={c.selectedProviderId}
                onChanged={() => c.loadSettings()}
              />
            </>
          ) : (
            <OrdersWorkspace context={c} shipping={active === "shipping"} />
          )}
        </>
      )}
      <OrderDialog key={c.activeOrderId || "closed"} context={c} />
    </AdminShell>
  );
}
