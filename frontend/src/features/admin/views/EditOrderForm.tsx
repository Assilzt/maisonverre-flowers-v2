import type { DashboardContext } from "../useDashboard";
import { WILAYAS } from "../presentation";
export function EditOrderForm({ context: c }: { context: DashboardContext }) {
  const change = (key: keyof typeof c.editForm, value: string) =>
    c.setEditForm(p => ({ ...p, [key]: value }));
  return (
    <form onSubmit={c.saveEdit}>
      <div className="form-grid">
        <label>
          الاسم
          <input
            required
            value={c.editForm.fullName}
            onChange={e => change("fullName", e.target.value)}
          />
        </label>
        <label>
          الهاتف
          <input
            required
            dir="ltr"
            value={c.editForm.phone}
            onChange={e => change("phone", e.target.value)}
          />
        </label>
        <label>
          سعر المنتج
          <input
            required
            min="0"
            type="number"
            value={c.editForm.price}
            onChange={e => change("price", e.target.value)}
          />
        </label>
        <label>
          رسوم التوصيل
          <input
            required
            min="0"
            type="number"
            value={c.editForm.deliveryFee}
            onChange={e => change("deliveryFee", e.target.value)}
          />
        </label>
        <label>
          الولاية
          <select
            required
            value={c.editForm.wilaya}
            onChange={e => {
              change("wilaya", e.target.value);
              change("commune", "");
              c.setEditCommunes([]);
              void fetch(
                "/api/orders?resource=communes&wilaya=" +
                  encodeURIComponent(e.target.value)
              )
                .then(r =>
                  r.ok
                    ? r.json()
                    : Promise.reject(new Error("تعذر تحميل البلديات"))
                )
                .then(d => c.setEditCommunes(d.communes || []))
                .catch(() => c.setError("تعذر تحميل البلديات، حاول مجددًا."));
            }}
          >
            <option value="">اختر الولاية</option>
            {WILAYAS.map(w => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <label>
          البلدية
          <select
            required
            disabled={!c.editForm.wilaya}
            value={c.editForm.commune}
            onChange={e => change("commune", e.target.value)}
          >
            <option value="">اختر البلدية</option>
            {c.editForm.commune &&
              !c.editCommunes.some(v => v.name === c.editForm.commune) && (
                <option>{c.editForm.commune}</option>
              )}
            {c.editCommunes.map(v => (
              <option key={v.name}>{v.name}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="toolbar" style={{ marginTop: 22 }}>
        <button type="submit" className="btn primary" disabled={c.loading}>
          حفظ التعديل
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => c.setEditing(null)}
        >
          إلغاء التعديل
        </button>
      </div>
    </form>
  );
}
