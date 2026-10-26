import { useMemo, useRef, useState } from "react";
import { initialOrderSection, type OrderSection } from "./sections";
import type {
  OrderStatus,
  Order,
  ProviderProfile,
  StockProduct,
  OrderEvent,
  ShipmentUpdate,
} from "@shared/orders";

export function useDashboardState() {
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [ordersPage, setOrdersPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [globalCounts, setGlobalCounts] = useState<Record<string, number>>({});
  const [shippingStage, setShippingStage] = useState("");
  const [availableStages, setAvailableStages] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [section, setSection] = useState<OrderSection>(() =>
    initialOrderSection(window.location.pathname, window.location.search)
  );
  const [query, setQuery] = useState("");
  const [datePreset, setDatePreset] = useState<
    | "all"
    | "today"
    | "yesterday"
    | "7d"
    | "30d"
    | "this_month"
    | "last_month"
    | "custom"
  >("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shippingNotice, setShippingNotice] = useState<{
    type: "loading" | "success" | "error" | "info";
    title: string;
    message: string;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pixelIdDraft, setPixelIdDraft] = useState("");
  const [savingPixelId, setSavingPixelId] = useState(false);
  const [pixelNotice, setPixelNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [integrationKind, setIntegrationKind] = useState<"ecotrack" | "osen">(
    "ecotrack"
  );
  const [merchantIdDraft, setMerchantIdDraft] = useState("");
  const [storeIdDraft, setStoreIdDraft] = useState("");
  const [provider, setProvider] = useState("navexdelivery");
  const [token, setToken] = useState("");
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [activeProviderId, setActiveProviderId] = useState("");
  const [providerNameDraft, setProviderNameDraft] = useState("");
  const [editingProviderId, setEditingProviderId] = useState("");
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedStockProductId, setSelectedStockProductId] = useState("");
  const [shipFromStock, setShipFromStock] = useState(true);
  const [orderShippingModes, setOrderShippingModes] = useState<
    Record<number, "stock" | "without_stock">
  >({});
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<number | null>(null);
  const [orderEvents, setOrderEvents] = useState<OrderEvent[]>([]);
  const [shipmentUpdates, setShipmentUpdates] = useState<ShipmentUpdate[]>([]);
  const [shipmentBusy, setShipmentBusy] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const goToSection = (nextSection: OrderSection) => {
    setSection(nextSection);
    setStatus("all");
    setSelectedIds([]);
    setDrawerOpen(false);
  };
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    wilaya: "",
    commune: "",
    price: "",
    deliveryFee: "",
  });
  const [editCommunes, setEditCommunes] = useState<
    Array<{
      name: string;
      hasStopDesk: boolean;
    }>
  >([]);
  const startEditing = (order: Order) => {
    setEditing(order);
    setEditForm({
      fullName: order.full_name || "",
      phone: order.phone,
      wilaya: order.wilaya || "",
      commune: order.commune || "",
      price: String(order.price),
      deliveryFee: String(order.delivery_fee || 0),
    });
    setEditCommunes([]);
    void fetch(
      `/api/orders?resource=communes&wilaya=${encodeURIComponent(order.wilaya || "")}`
    )
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("communes"))
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
  };
  const dateRange = useMemo(() => {
    if (datePreset === "all") return null;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999
    );
    if (datePreset === "yesterday") {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    }
    if (datePreset === "7d") start.setDate(start.getDate() - 6);
    if (datePreset === "30d") start.setDate(start.getDate() - 29);
    if (datePreset === "this_month") {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
    }
    if (datePreset === "last_month") {
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0);
    }
    if (datePreset === "custom") {
      const customStart = dateFrom ? new Date(`${dateFrom}T00:00:00`) : start;
      const customEnd = dateTo ? new Date(`${dateTo}T23:59:59.999`) : end;
      return { start: customStart, end: customEnd };
    }
    return { start, end };
  }, [dateFrom, datePreset, dateTo]);
  return {
    ordersPage,
    setOrdersPage,
    totalRows,
    setTotalRows,
    globalCounts,
    setGlobalCounts,
    shippingStage,
    setShippingStage,
    availableStages,
    setAvailableStages,
    password,
    setPassword,
    passwordInput,
    setPasswordInput,
    orders,
    setOrders,
    status,
    setStatus,
    section,
    setSection,
    query,
    setQuery,
    datePreset,
    setDatePreset,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    loading,
    setLoading,
    error,
    setError,
    shippingNotice,
    setShippingNotice,
    settingsOpen,
    setSettingsOpen,
    pixelIdDraft,
    setPixelIdDraft,
    savingPixelId,
    setSavingPixelId,
    pixelNotice,
    setPixelNotice,
    integrationKind,
    setIntegrationKind,
    merchantIdDraft,
    setMerchantIdDraft,
    storeIdDraft,
    setStoreIdDraft,
    provider,
    setProvider,
    token,
    setToken,
    tokenConfigured,
    setTokenConfigured,
    providers,
    setProviders,
    activeProviderId,
    setActiveProviderId,
    providerNameDraft,
    setProviderNameDraft,
    editingProviderId,
    setEditingProviderId,
    stockProducts,
    setStockProducts,
    selectedProviderId,
    setSelectedProviderId,
    selectedStockProductId,
    setSelectedStockProductId,
    shipFromStock,
    setShipFromStock,
    orderShippingModes,
    setOrderShippingModes,
    savingSettings,
    setSavingSettings,
    syncing,
    setSyncing,
    editing,
    setEditing,
    drawerOpen,
    setDrawerOpen,
    activeOrderId,
    setActiveOrderId,
    orderEvents,
    setOrderEvents,
    shipmentUpdates,
    setShipmentUpdates,
    shipmentBusy,
    setShipmentBusy,
    contactBusy,
    setContactBusy,
    commentDraft,
    setCommentDraft,
    commentBusy,
    setCommentBusy,
    touchStartX,
    selectedIds,
    setSelectedIds,
    bulkBusy,
    setBulkBusy,
    goToSection,
    editForm,
    setEditForm,
    editCommunes,
    setEditCommunes,
    startEditing,
    dateRange,
  };
}
export type DashboardState = ReturnType<typeof useDashboardState>;
