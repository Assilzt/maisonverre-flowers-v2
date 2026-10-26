import { useEffect, useState } from "react";
import { Plus, RefreshCw, PackageSearch } from "lucide-react";
import type { ProviderProfile, StockProduct } from "@shared/orders";
import { WILAYAS } from "@shared/locations";
import { api, updateOrder } from "@/services/api";
import { Dialog } from "./ui/Dialog";
export function InventoryTools({
  providerId,
  onChanged,
  mode = "stock",
}: {
  providerId: string;
  onChanged: () => Promise<void>;
  mode?: "stock" | "fees";
}) {
  const [products, setProducts] = useState<StockProduct[]>([]),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false),
    [code, setCode] = useState("16"),
    [home, setHome] = useState(""),
    [desk, setDesk] = useState("");
  const [product, setProduct] = useState({ name: "", sku: "", quantity: 1 });
  useEffect(() => {
    let active = true;
    setHome("");
    setDesk("");
    if (mode !== "fees" || !providerId) return;
    void api<{ providers: ProviderProfile[] }>("/api/orders?resource=settings")
      .then(data => {
        if (!active) return;
        const fee = data.providers.find(p => p.id === providerId)
          ?.deliveryFees?.[code];
        setHome(fee ? String(fee.home) : "");
        setDesk(fee ? String(fee.stopDesk) : "");
      })
      .catch(e => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [providerId, code, mode]);
  const load = async (remote = false) => {
    const data = await api<{ products: StockProduct[] }>(
      "/api/orders?resource=stock&providerId=" +
        encodeURIComponent(providerId) +
        (remote ? "" : "&mode=local")
    );
    setProducts(data.products);
  };
  useEffect(() => {
    let current = true;
    setProducts([]);
    setError("");
    if (!providerId || mode === "fees") return;
    void api<{ products: StockProduct[] }>(
      "/api/orders?resource=stock&mode=local&providerId=" +
        encodeURIComponent(providerId)
    )
      .then(data => {
        if (current) setProducts(data.products);
      })
      .catch(e => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [providerId, mode]);
  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      setMessage("تم الحفظ بنجاح");
    } catch (e) {
      setError((e as Error).message);
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
                [code]: { home: Number(home), stopDesk: Number(desk) },
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
    <>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>{mode === "fees" ? "رسوم التوصيل" : "مخزون حساب التوصيل"}</h2>
            <p>
              {mode === "fees"
                ? "تحديد رسوم المنزل وStop Desk لكل ولاية"
                : "الكميات هنا محلية. اجلب كتالوج الشركة لتحديث البيانات."}
            </p>
          </div>
          {mode === "stock" && (
            <div className="toolbar">
              <button
                type="button"
                className="btn"
                disabled={busy || !providerId}
                onClick={() => void run(() => load(true))}
              >
                <RefreshCw size={14} />
                جلب من الشركة
              </button>
              <button
                type="button"
                className="btn primary"
                disabled={!providerId}
                onClick={() => setOpen(true)}
              >
                <Plus size={14} />
                إضافة للمخزون
              </button>
            </div>
          )}
        </div>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="notice error">
            {error}
          </p>
        )}
        {!providerId ? (
          <p className="muted">اختر حساب توصيل أولًا.</p>
        ) : mode === "fees" ? (
          <div className="form-grid">
            <label>
              الولاية
              <select value={code} onChange={e => setCode(e.target.value)}>
                {WILAYAS.map(w => (
                  <option key={w} value={String(Number(w.slice(0, 2)))}>
                    {w}
                  </option>
                ))}
              </select>
            </label>
            <div />
            <label>
              التوصيل للمنزل — دج
              <input
                type="number"
                min="0"
                value={home}
                placeholder="أدخل الرسم المحلي"
                onChange={e => setHome(e.target.value)}
              />
            </label>
            <label>
              Stop Desk — دج
              <input
                type="number"
                min="0"
                value={desk}
                placeholder="أدخل الرسم المحلي"
                onChange={e => setDesk(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="btn primary"
              disabled={
                busy ||
                home === "" ||
                desk === "" ||
                Number(home) < 0 ||
                Number(desk) < 0
              }
              onClick={saveFee}
            >
              حفظ رسوم الولاية
            </button>
          </div>
        ) : products.length ? (
          <table className="stats-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>SKU</th>
                <th>الكمية المتاحة</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>
                    <span className="mono">{p.sku || "—"}</span>
                  </td>
                  <td>{p.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <PackageSearch size={30} />
            <h2>لا توجد منتجات في المخزون المحلي</h2>
            <p>أضف منتجًا محليًا أو اجلب المنتجات من حساب الشركة.</p>
          </div>
        )}
      </section>
      {open && (
        <Dialog
          title="إضافة منتج للمخزون المحلي"
          onClose={() => setOpen(false)}
        >
          <form
            className="dialog-body"
            onSubmit={e => {
              e.preventDefault();
              void run(async () => {
                await updateOrder({
                  resource: "stock",
                  action: "save",
                  providerId,
                  ...product,
                });
                await load();
                await onChanged();
                setOpen(false);
                setProduct({ name: "", sku: "", quantity: 1 });
              });
            }}
          >
            <p className="muted" style={{ marginBottom: 20 }}>
              هذا السجل لتتبع الكمية محليًا. لا ينشئ منتجًا جديدًا لدى شركة
              التوصيل.
            </p>
            <div className="form-grid">
              <label className="field-wide">
                اسم المنتج
                <input
                  required
                  value={product.name}
                  onChange={e =>
                    setProduct(p => ({ ...p, name: e.target.value }))
                  }
                />
              </label>
              <label>
                SKU / المرجع
                <input
                  value={product.sku}
                  onChange={e =>
                    setProduct(p => ({ ...p, sku: e.target.value }))
                  }
                />
              </label>
              <label>
                الكمية
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={product.quantity}
                  onChange={e =>
                    setProduct(p => ({
                      ...p,
                      quantity: Number(e.target.value),
                    }))
                  }
                />
              </label>
            </div>
            {error && (
              <p className="notice error" style={{ marginTop: 16 }}>
                {error}
              </p>
            )}
            <div className="toolbar" style={{ marginTop: 20 }}>
              <button type="submit" disabled={busy} className="btn primary">
                حفظ المنتج
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => setOpen(false)}
              >
                إلغاء
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
