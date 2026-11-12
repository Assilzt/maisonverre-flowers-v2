import { InventoryTools } from "../InventoryTools";
import { Loader2, RefreshCw, Settings, X } from "lucide-react";
import type { DashboardContext } from "../useDashboard";
export function SettingsDialog({ context }: { context: DashboardContext }) {
  const {
    loadSettings,
    settingsOpen,
    setSettingsOpen,
    error,
    setError,
    pixelIdDraft,
    setPixelIdDraft,
    savePixelId,
    savingPixelId,
    pixelNotice,
    startNewProvider,
    providers,
    selectProviderForEdit,
    editingProviderId,
    providerNameDraft,
    refreshStock,
    selectedProviderId,
    activeProviderId,
    stockProducts,
    setProviderNameDraft,
    provider,
    setProvider,
    token,
    setToken,
    saveProviderProfile,
    savingSettings,
    saveShippingMode,
    shipFromStock,
    selectedStockProductId,
    setSelectedStockProductId,
  } = context;
  return (
    <>
      {settingsOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          onClick={() => setSettingsOpen(false)}
        >
          <section
            className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-t-[30px] bg-[#f7faf8] p-5 shadow-2xl sm:rounded-[30px] sm:p-7"
            onClick={event => event.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[.2em] text-emerald-600">
                  ATLASIO / SETTINGS
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  إعدادات المتجر
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  إدارة معرّف Meta Pixel وشركات التوصيل ومخزون الشحن.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {error && (
              <div className="mb-4 flex items-center justify-between rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 ring-1 ring-rose-100">
                <span>{error}</span>
                <button type="button" onClick={() => setError("")}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="mb-5 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    معرّف Meta Pixel
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    يُستخدم لربط زيارات المتجر وأحداث الطلبات بحساب Meta.
                    التغيير يُطبّق عند إعادة تحميل صفحة المتجر.
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                  Meta
                </span>
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <label className="flex-1 text-xs font-black text-slate-500">
                  Pixel ID
                  <input
                    value={pixelIdDraft}
                    onChange={event => setPixelIdDraft(event.target.value)}
                    inputMode="numeric"
                    maxLength={20}
                    placeholder="مثال: 837444182648161"
                    dir="ltr"
                    aria-label="معرّف Meta Pixel"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold tracking-wide outline-none focus:border-blue-400 focus:bg-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void savePixelId()}
                  disabled={savingPixelId}
                  className="self-end rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {savingPixelId ? "جارٍ الحفظ..." : "حفظ معرّف Pixel"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                يجب أن يكون المعرّف أرقاماً فقط. اتركه فارغاً إذا أردت إيقاف
                التتبع.
              </p>
              {pixelNotice && (
                <p
                  className={`mt-3 rounded-xl px-3 py-2 text-sm font-bold ${pixelNotice.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
                  role="status"
                >
                  {pixelNotice.message}
                </p>
              )}
            </div>
            <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-black text-slate-900">
                    الشركات المرتبطة
                  </h3>
                  <button
                    type="button"
                    onClick={startNewProvider}
                    className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-white"
                  >
                    + شركة جديدة
                  </button>
                </div>
                {providers.length === 0 ? (
                  <div className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-200">
                    لا توجد شركة توصيل بعد.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {providers.map(item => (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => selectProviderForEdit(item)}
                        className={`min-h-[108px] rounded-2xl p-4 text-right transition ${editingProviderId === item.id ? "bg-slate-950 text-white shadow-lg" : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 hover:-translate-y-0.5 hover:ring-emerald-300"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-black">
                            {item.name}
                          </span>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-black ${editingProviderId === item.id ? "bg-white/15 text-emerald-200" : item.tokenConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
                          >
                            {item.tokenConfigured ? "متصل" : "يحتاج توكن"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                {editingProviderId ? (
                  <>
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-emerald-600">
                          تفاصيل الشركة
                        </p>
                        <h3 className="mt-1 text-lg font-black">
                          {providerNameDraft || "شركة التوصيل"}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void refreshStock(
                            selectedProviderId || activeProviderId
                          )
                        }
                        className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> تحديث المخزون
                      </button>
                    </div>
                    <div className="mb-5 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-emerald-50 p-4">
                        <p className="text-xs font-bold text-emerald-700">
                          المنتجات المتاحة
                        </p>
                        <p className="mt-2 text-2xl font-black text-emerald-900">
                          {stockProducts.length}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-blue-50 p-4">
                        <p className="text-xs font-bold text-blue-700">
                          إجمالي الكمية
                        </p>
                        <p className="mt-2 text-2xl font-black text-blue-900">
                          {stockProducts.reduce(
                            (sum, item) => sum + item.quantity,
                            0
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-xs font-black text-slate-500">
                        اسم الشركة
                        <input
                          value={providerNameDraft}
                          onChange={event =>
                            setProviderNameDraft(event.target.value)
                          }
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-emerald-400 focus:bg-white"
                        />
                      </label>
                      <label className="block text-xs font-black text-slate-500">
                        Provider
                        <input
                          value={provider}
                          onChange={event => setProvider(event.target.value)}
                          dir="ltr"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold outline-none focus:border-emerald-400 focus:bg-white"
                        />
                      </label>
                      <label className="block text-xs font-black text-slate-500">
                        التوكن
                        <input
                          type="password"
                          value={token}
                          onChange={event => setToken(event.target.value)}
                          placeholder="اتركه فارغاً للإبقاء على التوكن الحالي"
                          dir="ltr"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-left text-sm font-bold outline-none focus:border-emerald-400 focus:bg-white"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => void saveProviderProfile()}
                        disabled={savingSettings}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3.5 text-sm font-black text-white disabled:opacity-60"
                      >
                        {savingSettings && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}{" "}
                        حفظ بيانات الشركة
                      </button>
                    </div>
                    <div className="mt-5 rounded-2xl bg-amber-50 p-4">
                      <p className="text-xs font-black text-amber-800">
                        طريقة الشحن
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void saveShippingMode(true)}
                          className={`rounded-xl px-3 py-2.5 text-xs font-black ${shipFromStock ? "bg-emerald-500 text-white" : "bg-white text-slate-500"}`}
                        >
                          من stock
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveShippingMode(false)}
                          className={`rounded-xl px-3 py-2.5 text-xs font-black ${!shipFromStock ? "bg-blue-500 text-white" : "bg-white text-slate-500"}`}
                        >
                          بدون stock
                        </button>
                      </div>
                      <select
                        value={selectedStockProductId}
                        onChange={event =>
                          setSelectedStockProductId(event.target.value)
                        }
                        disabled={!shipFromStock || stockProducts.length === 0}
                        className="mt-3 w-full rounded-xl bg-white px-3 py-3 text-xs font-bold disabled:opacity-60"
                      >
                        <option value="">
                          {stockProducts.length
                            ? "منتج اختياري — stock مباشر"
                            : "الشركة لا توفر كتالوج منتجات؛ stock مباشر"}
                        </option>
                        {stockProducts.map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name} · المتاح {item.quantity}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl bg-slate-50 p-8 text-center">
                    <Settings className="h-10 w-10 text-slate-300" />
                    <h3 className="mt-4 font-black text-slate-700">
                      اختر شركة توصيل
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                      اضغط على إحدى البطاقات لعرض التوكن، تفاصيل الاتصال،
                      ومعلومات المخزون.
                    </p>
                  </div>
                )}
              </div>
            </div>
            <InventoryTools
              providerId={editingProviderId || activeProviderId}
              onChanged={async () => {
                await loadSettings();
              }}
            />
          </section>
        </div>
      )}
    </>
  );
}
