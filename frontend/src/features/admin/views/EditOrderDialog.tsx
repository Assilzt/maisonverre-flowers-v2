import { X } from "lucide-react";
import { WILAYAS } from "../presentation";
import type { DashboardContext } from "../useDashboard";
export function EditOrderDialog({ context }: { context: DashboardContext }) {
  const {
    editing,
    setEditing,
    saveEdit,
    editForm,
    setEditForm,
    setEditCommunes,
    editCommunes,
    loading,
  } = context;
  return (
    <>
      {editing && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md space-y-3 rounded-[24px] bg-white p-5 shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-blue-600">
                  تعديل مختصر
                </p>
                <h2 className="mt-1 text-lg font-black">بيانات الطلب</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-xs font-black text-slate-500">
              الاسم
              <input
                value={editForm.fullName}
                onChange={event =>
                  setEditForm({ ...editForm, fullName: event.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-black text-slate-500">
                سعر المنتج
                <input
                  required
                  type="number"
                  min="0"
                  value={editForm.price}
                  onChange={event =>
                    setEditForm({ ...editForm, price: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
                  dir="ltr"
                />
              </label>
              <label className="block text-xs font-black text-slate-500">
                التوصيل
                <input
                  required
                  type="number"
                  min="0"
                  value={editForm.deliveryFee}
                  onChange={event =>
                    setEditForm({
                      ...editForm,
                      deliveryFee: event.target.value,
                    })
                  }
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
                  dir="ltr"
                />
              </label>
            </div>
            <label className="block text-xs font-black text-slate-500">
              الهاتف
              <input
                required
                value={editForm.phone}
                onChange={event =>
                  setEditForm({ ...editForm, phone: event.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold"
                dir="ltr"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-black text-slate-500">
                الولاية
                <select
                  required
                  value={editForm.wilaya}
                  onChange={event => {
                    setEditForm({
                      ...editForm,
                      wilaya: event.target.value,
                      commune: "",
                    });
                    setEditCommunes([]);
                    void fetch(
                      `/api/orders?resource=communes&wilaya=${encodeURIComponent(event.target.value)}`
                    )
                      .then(response =>
                        response.ok
                          ? response.json()
                          : Promise.reject(new Error("communes"))
                      )
                      .then(
                        (data: {
                          communes?: Array<{
                            name: string;
                            hasStopDesk: boolean;
                          }>;
                        }) => setEditCommunes(data.communes || [])
                      )
                      .catch(() => setEditCommunes([]));
                  }}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-bold"
                >
                  <option value="">اختر الولاية</option>
                  {WILAYAS.map(item => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-black text-slate-500">
                البلدية
                <select
                  required
                  value={editForm.commune}
                  onChange={event =>
                    setEditForm({ ...editForm, commune: event.target.value })
                  }
                  disabled={!editForm.wilaya || editCommunes.length === 0}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-xs font-bold"
                >
                  <option value="">
                    {editCommunes.length
                      ? "اختر البلدية"
                      : "اختر الولاية أولاً"}
                  </option>
                  {editCommunes.map(item => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-xl bg-slate-950 px-3 py-3 text-sm font-black text-white disabled:opacity-60"
              >
                حفظ التعديل
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 rounded-xl bg-slate-100 px-3 py-3 text-sm font-bold text-slate-600"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
