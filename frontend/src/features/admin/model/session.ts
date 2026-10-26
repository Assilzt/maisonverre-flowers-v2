import { useEffect, useRef } from "react";
import type { ProviderProfile } from "@shared/orders";
import type { DashboardState } from "./state";

export function useDashboardSession(
  context: Pick<
    DashboardState,
    | "ordersPage"
    | "setOrdersPage"
    | "setTotalRows"
    | "setGlobalCounts"
    | "shippingStage"
    | "setAvailableStages"
    | "query"
    | "status"
    | "section"
    | "dateRange"
    | "password"
    | "setLoading"
    | "setError"
    | "setPassword"
    | "setOrders"
    | "setPixelIdDraft"
    | "setProvider"
    | "setShipFromStock"
    | "setOrderShippingModes"
    | "setTokenConfigured"
    | "setProviders"
    | "setActiveProviderId"
    | "setSelectedProviderId"
    | "setIntegrationKind"
    | "setMerchantIdDraft"
    | "setStoreIdDraft"
    | "setProviderNameDraft"
    | "setEditingProviderId"
    | "setStockProducts"
    | "setSelectedStockProductId"
  >
) {
  const {
    ordersPage,
    setOrdersPage,
    setTotalRows,
    setGlobalCounts,
    shippingStage,
    setAvailableStages,
    query,
    status,
    section,
    dateRange,
    password,
    setLoading,
    setError,
    setPassword,
    setOrders,
    setPixelIdDraft,
    setProvider,
    setShipFromStock,
    setOrderShippingModes,
    setTokenConfigured,
    setProviders,
    setActiveProviderId,
    setSelectedProviderId,
    setIntegrationKind,
    setMerchantIdDraft,
    setStoreIdDraft,
    setProviderNameDraft,
    setEditingProviderId,
    setStockProducts,
    setSelectedStockProductId,
  } = context;
  const requestVersion = useRef(0);
  const settingsLoaded = useRef(false);
  const authHeaders = (
    _nextPassword = password
  ): Record<string, string> => ({});
  const loadOrders = async (nextPassword = password) => {
    if (!nextPassword) return;
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      if (nextPassword !== "session") {
        const login = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: nextPassword }),
        });
        if (!login.ok) throw new Error("كلمة المرور غير صحيحة");
      }
      const params = new URLSearchParams({
        page: String(ordersPage),
        q: query,
        status: status === "all" ? "" : status,
        queue: section,
        stage: shippingStage,
      });
      if (dateRange) {
        const day = (d: Date) =>
          [
            d.getFullYear(),
            String(d.getMonth() + 1).padStart(2, "0"),
            String(d.getDate()).padStart(2, "0"),
          ].join("-");
        params.set("from", day(dateRange.start));
        params.set("to", day(dateRange.end));
      }
      const response = await fetch("/api/orders?" + params, {
        headers: authHeaders(nextPassword),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) setPassword("");
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "كلمة المرور غير صحيحة"
            : data.error || "تعذر تحميل الطلبات"
        );
      if (version !== requestVersion.current) return;
      setOrders(data.orders || []);
      setTotalRows(data.total || 0);
      setGlobalCounts(
        Object.fromEntries(
          (data.summary || []).map((r: { status: string; count: number }) => [
            r.status,
            Number(r.count),
          ])
        )
      );
      setAvailableStages(data.stages || []);
      setPassword("session");
      if (!settingsLoaded.current) {
        await loadSettings(nextPassword);
        settingsLoaded.current = true;
      }
    } catch (requestError) {
      if (version !== requestVersion.current) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "تعذر تحميل الطلبات"
      );
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };
  const loadSettings = async (nextPassword = password) => {
    if (!nextPassword) return;
    const response = await fetch("/api/orders?resource=settings", {
      headers: authHeaders(nextPassword),
    });
    if (!response.ok) return;
    const data = await response.json();
    setPixelIdDraft(data.pixelId || "");
    setProvider(data.provider || "navexdelivery");
    setShipFromStock(data.shippingMode !== "without_stock");
    setOrderShippingModes({});
    setTokenConfigured(Boolean(data.tokenConfigured));
    setProviders(data.providers || []);
    setActiveProviderId(data.activeProviderId || data.providers?.[0]?.id || "");
    setSelectedProviderId(
      data.activeProviderId || data.providers?.[0]?.id || ""
    );
    const activeProvider =
      (data.providers || []).find(
        (item: ProviderProfile) => item.id === (data.activeProviderId || "")
      ) || (data.providers || [])[0];
    setProviderNameDraft(activeProvider?.name || "");
    setIntegrationKind(activeProvider?.kind || "ecotrack");
    setMerchantIdDraft(activeProvider?.merchantId || "");
    setStoreIdDraft(activeProvider?.storeId || "");
    setEditingProviderId(activeProvider?.id || "");
    const stockProviderId =
      data.activeProviderId || data.providers?.[0]?.id || "";
    const stockResponse = await fetch(
      `/api/orders?resource=stock&mode=local&providerId=${encodeURIComponent(stockProviderId)}`,
      { headers: authHeaders(nextPassword) }
    );
    const stockData = await stockResponse.json().catch(() => ({}));
    if (!stockResponse.ok) {
      setStockProducts([]);
      setSelectedStockProductId("");
      setError(stockData.error || "تعذر جلب منتجات المخزون من الشركة النشطة");
      return;
    }
    const nextProducts = stockData.products || [];
    setStockProducts(nextProducts);
    setSelectedStockProductId(
      nextProducts[0] ? String(nextProducts[0].id) : ""
    );
  };
  useEffect(() => {
    void fetch("/api/session")
      .then(r => r.json())
      .then(data => {
        if (data.authenticated) setPassword("session");
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!password) return;
    const timer = setTimeout(() => void loadOrders(), 250);
    return () => clearTimeout(timer);
  }, [password, query, status, section, dateRange, ordersPage, shippingStage]);
  useEffect(
    () => setOrdersPage(1),
    [query, status, section, dateRange, shippingStage]
  );
  useEffect(() => {
    if (!password) return;
    const timer = setInterval(() => {
      if (!document.hidden) void loadOrders();
    }, 30_000);
    return () => clearInterval(timer);
  }, [password, query, status, section, dateRange, ordersPage, shippingStage]);
  return { authHeaders, loadOrders, loadSettings };
}
export type DashboardSession = ReturnType<typeof useDashboardSession>;
