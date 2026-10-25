import { useEffect, useState } from "react";
import type { ProviderProfile, StockProduct } from "@shared/orders";
import { WILAYAS } from "@shared/locations";
import { api, updateOrder } from "@/services/api";
export function InventoryTools({
  providerId,
  onChanged,
}: {
  providerId: string;
  onChanged: () => Promise<void>;
}) {
  const [products, setProducts] = useState<StockProduct[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [code, setCode] = useState("16"),
    [home, setHome] = useState(0),
    [desk, setDesk] = useState(0);
  const [product, setProduct] = useState({ name: "", sku: "", quantity: 1 });
  const load = async (remote = false) => {
    const data = await api<{ products: StockProduct[] }>(
      "/api/orders?resource=stock&providerId=" +
        encodeURIComponent(providerId) +
        (remote ? "" : "&mode=local")
    );
    setProducts(data.products);
  };
  useEffect(() => {
    setProducts([]);
  }, [providerId]);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    try {
      await task();
      setMessage("تم الحفظ");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const saveFee = () =>
    void run(async () => {
      const settings = await api<{
        providers: ProviderProfile[];
        activeProviderId: string;
      }>("/api/orders?resource=settings");
      const providers = settings.providers.map(p =>
        p.id === providerId
          ? {
              ...p,
              deliveryFees: {
                ...p.deliveryFees,
                [code]: { home, stopDesk: desk },
              },
            }
          : p
      );
      await updateOrder({
        resource: "settings",
        providers,
        activeProviderId: settings.activeProviderId,
      });
      await onChanged();
    });
  return (
    <details className="inventory-tools mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer text-sm font-bold text-slate-800">
        رسوم التوصيل وإدارة المخزون المحلي
      </summary>
      <p className="mt-3 text-xs text-slate-500">
        تعديل الكمية هنا محلي فقط؛ تحديث مخزون الشركة يتم عبر جلب الكتالوج.
      </p>
      {message && (
        <p
          role="status"
          className="my-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {message}
        </p>
      )}
      <div className="toolbar">
        <button
          className="btn"
          disabled={busy || !providerId}
          onClick={() => void run(() => load())}
        >
          عرض المخزون
        </button>
        <button
          className="btn"
          disabled={busy || !providerId}
          onClick={() => void run(() => load(true))}
        >
          تحديث من الشركة
        </button>
      </div>
      <div className="toolbar">
        <label>
          الولاية
          <select value={code} onChange={e => setCode(e.target.value)}>
            {WILAYAS.map(w => (
              <option key={w} value={Number(w.slice(0, 2))}>
                {w}
              </option>
            ))}
          </select>
        </label>
        <label>
          المنزل
          <input
            type="number"
            min="0"
            value={home}
            onChange={e => setHome(Number(e.target.value))}
          />
        </label>
        <label>
          Stop Desk
          <input
            type="number"
            min="0"
            value={desk}
            onChange={e => setDesk(Number(e.target.value))}
          />
        </label>
        <button
          className="btn"
          disabled={busy || !providerId}
          onClick={saveFee}
        >
          حفظ الرسم
        </button>
      </div>
      <table className="stats-table">
        <thead>
          <tr>
            <th>المنتج</th>
            <th>المتاح</th>
            <th>المرجع</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.quantity}</td>
              <td>{p.sku}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="toolbar">
        {(["name", "sku", "quantity"] as const).map(key => (
          <label key={key}>
            {key}
            <input
              aria-label={"مخزون " + key}
              type={key === "quantity" ? "number" : "text"}
              value={product[key]}
              onChange={e =>
                setProduct(p => ({
                  ...p,
                  [key]:
                    key === "quantity"
                      ? Number(e.target.value)
                      : e.target.value,
                }))
              }
            />
          </label>
        ))}
        <button
          className="btn"
          disabled={busy || !product.name || !providerId}
          onClick={() =>
            void run(async () => {
              await updateOrder({
                resource: "stock",
                action: "save",
                providerId,
                ...product,
              });
              await load();
              await onChanged();
            })
          }
        >
          إضافة منتج محلي
        </button>
      </div>
    </details>
  );
}
