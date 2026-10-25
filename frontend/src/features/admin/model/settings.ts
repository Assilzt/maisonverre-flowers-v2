import type { ProviderProfile } from "@shared/orders";
import type { DashboardState } from "./state";
import type { DashboardSession } from "./session";

export function createSettingsActions(
  context: Pick<
    DashboardState & DashboardSession,
    | "providerNameDraft"
    | "provider"
    | "token"
    | "editingProviderId"
    | "setError"
    | "setSavingSettings"
    | "providers"
    | "authHeaders"
    | "activeProviderId"
    | "shipFromStock"
    | "setProviders"
    | "setActiveProviderId"
    | "setSelectedProviderId"
    | "setEditingProviderId"
    | "setToken"
    | "setTokenConfigured"
    | "setShipFromStock"
    | "setOrderShippingModes"
    | "setStockProducts"
    | "setSelectedStockProductId"
    | "setProviderNameDraft"
    | "setProvider"
    | "pixelIdDraft"
    | "setPixelNotice"
    | "setSavingPixelId"
    | "setPixelIdDraft"
  >
) {
  const {
    providerNameDraft,
    provider,
    token,
    editingProviderId,
    setError,
    setSavingSettings,
    providers,
    authHeaders,
    activeProviderId,
    shipFromStock,
    setProviders,
    setActiveProviderId,
    setSelectedProviderId,
    setEditingProviderId,
    setToken,
    setTokenConfigured,
    setShipFromStock,
    setOrderShippingModes,
    setStockProducts,
    setSelectedStockProductId,
    setProviderNameDraft,
    setProvider,
    pixelIdDraft,
    setPixelNotice,
    setSavingPixelId,
    setPixelIdDraft,
  } = context;
  const saveProviderProfile = async () => {
    const name = providerNameDraft.trim();
    const providerCode = provider.trim().toLowerCase();
    const providerToken = token.trim();
    if (!name || !providerCode || (!providerToken && !editingProviderId)) {
      setError("أدخل اسم الشركة وProvider والتوكن");
      return;
    }
    setSavingSettings(true);
    setError("");
    try {
      const id = editingProviderId || `provider-${Date.now()}`;
      const nextProviders = [
        ...providers.filter(item => item.id !== id),
        { id, name, provider: providerCode, token: providerToken },
      ];
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "settings",
          providers: nextProviders,
          activeProviderId: activeProviderId || id,
          shippingMode: shipFromStock ? "stock" : "without_stock",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ شركة التوصيل");
      setProviders(data.providers || []);
      setActiveProviderId(data.activeProviderId || id);
      setSelectedProviderId(data.activeProviderId || id);
      setEditingProviderId(id);
      setToken("");
      setTokenConfigured(true);
      await refreshStock(data.activeProviderId || id);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر حفظ شركة التوصيل"
      );
    } finally {
      setSavingSettings(false);
    }
  };
  const saveShippingMode = async (useStock: boolean) => {
    setShipFromStock(useStock);
    setOrderShippingModes({});
    setSavingSettings(true);
    setError("");
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "settings",
          shippingMode: useStock ? "stock" : "without_stock",
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ وضع الشحن");
      setShipFromStock(data.shippingMode !== "without_stock");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر حفظ وضع الشحن"
      );
    } finally {
      setSavingSettings(false);
    }
  };
  const refreshStock = async (providerId: string) => {
    if (!providerId) {
      setStockProducts([]);
      setSelectedStockProductId("");
      setError("اختر شركة توصيل نشطة أولاً");
      return;
    }
    try {
      const response = await fetch(
        `/api/orders?resource=stock&providerId=${encodeURIComponent(providerId)}`,
        { headers: authHeaders() }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "تعذر جلب منتجات المخزون من الشركة");
      const nextProducts = data.products || [];
      setStockProducts(nextProducts);
      setSelectedStockProductId(
        nextProducts[0] ? String(nextProducts[0].id) : ""
      );
      if (nextProducts.length === 0)
        setError(
          "لم تُرجع الشركة كتالوج منتجات؛ يمكن استخدام الشحن من stock مباشرة، أو أضف منتجاً محلياً إذا أردت تتبع الكمية."
        );
      else setError("");
    } catch (requestError) {
      setStockProducts([]);
      setSelectedStockProductId("");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر جلب كتالوج منتجات الشركة؛ يمكنك متابعة الشحن من stock مباشرة"
      );
    }
  };
  const startNewProvider = () => {
    setEditingProviderId("");
    setProviderNameDraft("");
    setProvider("");
    setToken("");
    setTokenConfigured(false);
    setStockProducts([]);
    setSelectedStockProductId("");
    setShipFromStock(false);
  };
  const selectProviderForEdit = (item: ProviderProfile) => {
    setEditingProviderId(item.id);
    setProviderNameDraft(item.name);
    setProvider(item.provider);
    setToken("");
    setActiveProviderId(item.id);
    setSelectedProviderId(item.id);
    setTokenConfigured(Boolean(item.tokenConfigured));
    void refreshStock(item.id);
  };
  const savePixelId = async () => {
    const pixelId = pixelIdDraft.trim();
    if (pixelId && !/^\d{8,20}$/.test(pixelId)) {
      setPixelNotice({
        type: "error",
        message:
          "أدخل معرّف Pixel مكوّناً من 8 إلى 20 رقماً، أو اتركه فارغاً للتعطيل.",
      });
      return;
    }
    setSavingPixelId(true);
    setPixelNotice(null);
    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "settings", pixelId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "تعذر حفظ معرّف Pixel");
      setPixelIdDraft(data.pixelId || "");
      setPixelNotice({
        type: "success",
        message: pixelId
          ? "تم الحفظ. سيُستخدم المعرّف الجديد عند إعادة تحميل صفحة المتجر."
          : "تم تعطيل Meta Pixel للزيارات الجديدة.",
      });
    } catch (requestError) {
      setPixelNotice({
        type: "error",
        message:
          requestError instanceof Error
            ? requestError.message
            : "تعذر حفظ معرّف Pixel",
      });
    } finally {
      setSavingPixelId(false);
    }
  };
  return {
    saveProviderProfile,
    saveShippingMode,
    refreshStock,
    startNewProvider,
    selectProviderForEdit,
    savePixelId,
  };
}
export type SettingsActions = ReturnType<typeof createSettingsActions>;
