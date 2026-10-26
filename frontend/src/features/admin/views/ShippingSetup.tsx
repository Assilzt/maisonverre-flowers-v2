import type { DashboardContext } from "../useDashboard";
export function ShippingSetup({ context: c }: { context: DashboardContext }) {
  return (
    <div className="form-grid">
      <label>
        حساب التوصيل
        <select
          value={c.selectedProviderId}
          onChange={e => {
            c.setSelectedProviderId(e.target.value);
            void c.refreshStock(e.target.value);
          }}
        >
          <option value="">اختر الحساب</option>
          {c.providers.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        طريقة الشحن
        <select
          value={c.shipFromStock ? "stock" : "without_stock"}
          onChange={e => c.setShipFromStock(e.target.value === "stock")}
        >
          <option value="stock">من المخزون · Stock</option>
          <option value="without_stock">بدون مخزون</option>
        </select>
      </label>
      {c.shipFromStock && (
        <label className="field-wide">
          منتج المخزون
          <select
            value={c.selectedStockProductId}
            onChange={e => c.setSelectedStockProductId(e.target.value)}
          >
            <option value="">Stock مباشر دون منتج محلي</option>
            {c.stockProducts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} · متاح {p.quantity} · {p.sku || "بدون SKU"}
              </option>
            ))}
          </select>
          <span className="field-help">
            الكمية تؤخذ من الطلب. الحجز المحلي يطبق عند اختيار منتج.
          </span>
        </label>
      )}
    </div>
  );
}
