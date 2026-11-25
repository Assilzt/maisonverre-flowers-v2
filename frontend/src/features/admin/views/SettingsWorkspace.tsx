import { useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import type { DashboardContext } from "../useDashboard";
import { InventoryTools } from "../InventoryTools";
import { OperationsPanel } from "../OperationsPanel";
import { MetaCapiSettings } from "./MetaCapiSettings";
import { api, updateOrder } from "@/services/api";
export function SettingsWorkspace({
  context: c,
}: {
  context: DashboardContext;
}) {
  const [tab, setTab] = useState(
    new URLSearchParams(location.search).get("panel") === "operations" ||
      location.pathname === "/admin/operations"
      ? "operations"
      : "shipping"
  );
  const [connection, setConnection] = useState("");
  const [checking, setChecking] = useState(false);
  return (
    <>
      <div className="section-tabs" aria-label="أقسام الإعدادات">
        {[
          ["shipping", "حسابات التوصيل"],
          ["fees", "رسوم التوصيل"],
          ["pixel", "Meta Pixel"],
          ["operations", "حالة التكاملات"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "shipping" && (
        <div className="overview-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>حسابات الشركة</h2>
                <p>EcoTrack وOsen Express، بحسابات مستقلة</p>
              </div>
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  c.startNewProvider();
                  setConnection("");
                }}
              >
                <Plus size={14} />
                إضافة حساب
              </button>
            </div>
            {c.providers.map(p => (
              <div className="work-item" key={p.id}>
                <div>
                  <p>{p.name}</p>
                  <small>
                    {p.kind === "osen" ? "Osen Express" : p.provider} ·{" "}
                    {p.tokenConfigured ? "التوكن محفوظ" : "بحاجة إلى توكن"}
                  </small>
                </div>
                <div className="toolbar">
                  <button
                    type="button"
                    className="btn small"
                    onClick={() => {
                      c.selectProviderForEdit(p);
                      setConnection("");
                    }}
                  >
                    إعداد الحساب
                  </button>
                  {c.activeProviderId === p.id ? (
                    <span className="status-badge success">
                      حساب المتجر الحالي
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn small"
                      disabled={c.savingSettings}
                      onClick={() => {
                        if (
                          !window.confirm(
                            "استخدام هذا الحساب لرسوم التوصيل والبلديات الافتراضية في المتجر؟"
                          )
                        )
                          return;
                        c.setSavingSettings(true);
                        void updateOrder({
                          resource: "settings",
                          providers: c.providers,
                          activeProviderId: p.id,
                        })
                          .then(() => c.loadSettings())
                          .catch(e => c.setError(e.message))
                          .finally(() => c.setSavingSettings(false));
                      }}
                    >
                      استخدام في المتجر
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="detail-section">
              <h3>طريقة الشحن الافتراضية</h3>
              <label style={{ marginTop: 12 }}>
                الوضع
                <select
                  value={c.shipFromStock ? "stock" : "without_stock"}
                  disabled={c.savingSettings}
                  onChange={e =>
                    void c.saveShippingMode(e.target.value === "stock")
                  }
                >
                  <option value="stock">من المخزون — Stock</option>
                  <option value="without_stock">بدون مخزون</option>
                </select>
              </label>
            </div>
          </section>
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {c.editingProviderId
                    ? "تعديل حساب التوصيل"
                    : "حساب توصيل جديد"}
                </h2>
                <p>تُحفظ المفاتيح على الخادم</p>
              </div>
              <ShieldCheck size={18} color="#8ca594" />
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                void c.saveProviderProfile();
              }}
            >
              <div className="form-grid">
                <label className="field-wide">
                  نوع التكامل
                  <select
                    value={c.integrationKind}
                    onChange={e => {
                      c.setIntegrationKind(
                        e.target.value as "ecotrack" | "osen"
                      );
                      c.setToken("");
                      setConnection("");
                    }}
                  >
                    <option value="ecotrack">EcoTrack</option>
                    <option value="osen">Osen Express</option>
                  </select>
                </label>
                <label className="field-wide">
                  اسم الحساب
                  <input
                    required
                    value={c.providerNameDraft}
                    onChange={e => c.setProviderNameDraft(e.target.value)}
                  />
                </label>
                {c.integrationKind === "ecotrack" ? (
                  <label className="field-wide">
                    Provider / اسم النطاق
                    <input
                      required
                      dir="ltr"
                      placeholder="navexdelivery"
                      value={c.provider}
                      onChange={e => c.setProvider(e.target.value)}
                    />
                    <span className="field-help">
                      مثال: navexdelivery من navexdelivery.ecotrack.dz
                    </span>
                  </label>
                ) : (
                  <>
                    <label>
                      Merchant ID
                      <input
                        required
                        dir="ltr"
                        value={c.merchantIdDraft}
                        onChange={e => c.setMerchantIdDraft(e.target.value)}
                      />
                    </label>
                    <label>
                      Store ID
                      <input
                        required
                        dir="ltr"
                        value={c.storeIdDraft}
                        onChange={e => c.setStoreIdDraft(e.target.value)}
                      />
                    </label>
                    <p className="muted field-wide">
                      انسخ المعرّفين من صفحة API في حساب Osen. يتحقق الخادم من
                      تطابق المفتاح مع المتجر قبل حفظه.{" "}
                      <a
                        className="text-link"
                        href="https://backendmain.osenexpress.com/api"
                        target="_blank"
                        rel="noreferrer"
                      >
                        التوثيق الرسمي
                      </a>
                    </p>
                  </>
                )}
                <label className="field-wide">
                  API Token
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={c.token}
                    onChange={e => c.setToken(e.target.value)}
                    placeholder={
                      c.editingProviderId
                        ? "اتركه فارغًا للاحتفاظ بالتوكن الحالي"
                        : "توكن الحساب"
                    }
                  />
                </label>
              </div>
              <div className="toolbar" style={{ marginTop: 20 }}>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={c.savingSettings}
                >
                  حفظ الحساب
                </button>
                {c.editingProviderId && (
                  <button
                    type="button"
                    className="btn"
                    disabled={checking}
                    onClick={() => {
                      setChecking(true);
                      setConnection("");
                      void api<{ valid: boolean }>(
                        "/api/connection?providerId=" +
                          encodeURIComponent(c.editingProviderId)
                      )
                        .then(d =>
                          setConnection(
                            d.valid
                              ? "الاتصال بالحساب ناجح"
                              : "تعذر التحقق من الاتصال، راجع التوكن والحساب."
                          )
                        )
                        .catch(e => setConnection(e.message))
                        .finally(() => setChecking(false));
                    }}
                  >
                    اختبار الاتصال
                  </button>
                )}
              </div>
              {connection && (
                <p role="status" className="notice" style={{ marginTop: 16 }}>
                  {connection}
                </p>
              )}
            </form>
          </section>
        </div>
      )}
      {tab === "fees" && (
        <>
          <section className="panel">
            <label>
              حساب التوصيل
              <select
                value={c.selectedProviderId}
                onChange={e => c.setSelectedProviderId(e.target.value)}
              >
                {c.providers.map(p => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <InventoryTools
            mode="fees"
            providerId={c.selectedProviderId}
            onChanged={() => c.loadSettings()}
          />
        </>
      )}
      {tab === "pixel" && (
        <section className="panel" style={{ maxWidth: 700 }}>
          <div className="panel-heading">
            <div>
              <h2>Meta Pixel</h2>
              <p>المعرّف المستخدم في صفحات الهبوط</p>
            </div>
          </div>
          <p className="notice">
            هذا الإعداد يغيّر Pixel المستخدم للزيارات الجديدة. منطق الأحداث
            وهوية محتوى الزهور ثابتان في التطبيق.
          </p>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (window.confirm("حفظ تغيير معرّف Pixel؟"))
                void c.savePixelId();
            }}
          >
            <label>
              Pixel ID
              <input
                dir="ltr"
                inputMode="numeric"
                value={c.pixelIdDraft}
                onChange={e => c.setPixelIdDraft(e.target.value)}
                placeholder="أدخل معرّف Pixel"
              />
              <span className="field-help">
                ترك المعرّف فارغًا يعطّل Pixel للزيارات الجديدة.
              </span>
            </label>
            <button
              type="submit"
              className="btn primary"
              style={{ marginTop: 20 }}
              disabled={c.savingPixelId}
            >
              حفظ Pixel ID
            </button>
            {c.pixelNotice && (
              <p
                role="status"
                className={
                  "notice" + (c.pixelNotice.type === "error" ? " error" : "")
                }
                style={{ marginTop: 16 }}
              >
                {c.pixelNotice.message}
              </p>
            )}
          </form>
          <MetaCapiSettings />
        </section>
      )}
      {tab === "operations" && <OperationsPanel />}
    </>
  );
}
