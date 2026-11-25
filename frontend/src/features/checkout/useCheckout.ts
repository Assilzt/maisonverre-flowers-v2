import { useState, useEffect, useRef, type FormEvent } from "react";
import type { DeliveryFeeRow } from "@shared/storefront";
import { trackMetaPixelEventOnce } from "../tracking/meta-pixel";
import {
  type ProductLandingConfig,
  getPixelStorageKey,
  getProductCampaignLabel,
  getProductEventData,
  getProductPurchaseEventData,
  getProductSessionLeadId,
  resetProductSessionLeadId,
} from "../tracking/product";
const PHONE_PATTERN = /^(0[567]\d{8}|\+213[567]\d{8})$/;

/** Accepts Arabic-Indic digits and spaces/dashes typed on Arabic keyboards. */
export const normalizePhone = (value: string) =>
  value
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, d => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[\s\-().]/g, "");

export type DeliveryType = "home" | "stop_desk";
export type FeeTable = Record<string, { home: number; stopDesk: number }>;
export type OrderErrorField = "phone" | "wilaya" | "commune" | "fees" | "save";

export const mapFees = (rows: DeliveryFeeRow[] = []): FeeTable => {
  const mapped: FeeTable = {};
  for (const fee of rows) {
    const code =
      String(fee.wilaya_id || "").replace(/^0+/, "") ||
      String(fee.wilaya_id || "");
    if (code)
      mapped[code] = {
        home: Number(fee.tarif || 0),
        stopDesk: Number(fee.tarif_stopdesk || fee.tarif || 0),
      };
  }
  return mapped;
};

const validatePhone = (value: string): string => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "رقم الهاتف مطلوب";
  }

  if (!PHONE_PATTERN.test(trimmedValue)) {
    return "رقم الهاتف غير صالح. مثال: 0551234567 أو +213551234567";
  }

  return "";
};

const leadTokens = new Map<string, string>();
const getLeadToken = (id: string) => {
  const key = "maisonverre:lead-token:" + id;
  try {
    const value = sessionStorage.getItem(key) || crypto.randomUUID();
    sessionStorage.setItem(key, value);
    return value;
  } catch {
    if (!leadTokens.has(id)) leadTokens.set(id, crypto.randomUUID());
    return leadTokens.get(id)!;
  }
};

const saveOrder = async (payload: {
  leadId: string;
  status: "abandoned" | "complete";
  price: number;
  campaign: string;
  phone: string;
  fullName?: string;
  wilaya?: string;
  commune?: string;
  deliveryFee?: number;
  deliveryType?: DeliveryType;
  giftBooklet?: boolean;
  quantity?: number;
  draftSync?: boolean;
  productSlug?: string;
}): Promise<boolean> => {
  try {
    if (new URLSearchParams(window.location.search).get("preview") === "1")
      return false;
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        leadToken: getLeadToken(payload.leadId),
        sourceUrl: window.location.href,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
};

type OrderPayload = Parameters<typeof saveOrder>[0];

const fireFacebookEventOnce = (
  product: ProductLandingConfig,
  eventName: string,
  dedupeKey: string,
  parameters: Record<string, unknown> = {}
) => {
  if (new URLSearchParams(window.location.search).get("preview") === "1")
    return;
  trackMetaPixelEventOnce(
    getPixelStorageKey(product, dedupeKey),
    eventName,
    parameters
  );
};

export type SubmittedOrder = {
  bundleLabel: string;
  quantity: number;
  price: number;
  deliveryFee: number;
  deliveryType: DeliveryType;
  wilaya: string;
  commune: string;
};

const defaultBundleQuantity = (product: ProductLandingConfig) =>
  product.bundles?.find(b => b.quantity === product.defaultBundleQuantity)
    ?.quantity ??
  product.bundles?.[0]?.quantity ??
  1;

export function useCheckout(
  product: ProductLandingConfig,
  initialFees?: DeliveryFeeRow[]
) {
  const [fullName, setFullName] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [phone, setPhoneValue] = useState("");
  const setPhone = (value: string) => setPhoneValue(normalizePhone(value));
  const [communes, setCommunes] = useState<
    Array<{ name: string; hasStopDesk: boolean }>
  >([]);
  const [communesStatus, setCommunesStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [communesAttempt, setCommunesAttempt] = useState(0);
  const [deliveryFees, setDeliveryFees] = useState<FeeTable>(() =>
    mapFees(initialFees)
  );
  const [deliveryFeesStatus, setDeliveryFeesStatus] = useState<
    "loading" | "ready" | "error"
  >(initialFees?.length ? "ready" : "loading");
  const [feesAttempt, setFeesAttempt] = useState(0);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [lastOrder, setLastOrder] = useState<SubmittedOrder | null>(null);
  const [formError, setFormError] = useState<{
    field: OrderErrorField;
    message: string;
  } | null>(null);
  const [selectedBundleQuantity, setSelectedBundleQuantity] = useState(() =>
    defaultBundleQuantity(product)
  );
  const isFlowerLanding = true;
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const facebookLeadSentRef = useRef(false);
  const viewContentSentRef = useRef(false);
  const activeDraftLeadIdRef = useRef<string | null>(null);
  const pendingDraftSyncRef = useRef<OrderPayload | null>(null);
  const draftSyncTimerRef = useRef<number | null>(null);
  const draftSyncPromiseRef = useRef<Promise<void> | null>(null);
  const selectedBundle =
    product.bundles?.find(
      bundle => bundle.quantity === selectedBundleQuantity
    ) || product.bundles?.[0];
  const offerPrice = selectedBundle?.price ?? product.price;
  const compareAtTotal = product.compareAtPrice
    ? product.compareAtPrice *
      (isFlowerLanding ? selectedBundle?.quantity || 1 : 1)
    : undefined;
  const campaignLabel =
    isFlowerLanding && selectedBundle
      ? `${product.tracking.campaignName} - ${selectedBundle.label}`
      : getProductCampaignLabel(product, offerPrice, false);
  const productEventData = getProductEventData(product, offerPrice);
  const initiateCheckoutSentRef = useRef(false);

  const phoneError = phone ? validatePhone(phone) : "";
  const rawWilayaCode = wilaya.match(/^\s*(\d{1,2})/)?.[1] || "";
  const selectedWilayaCode = rawWilayaCode ? String(Number(rawWilayaCode)) : "";
  const selectedFee = deliveryFees[selectedWilayaCode] || {
    home: 0,
    stopDesk: 0,
  };
  const hasDeliveryFee =
    Boolean(selectedWilayaCode) &&
    Object.prototype.hasOwnProperty.call(deliveryFees, selectedWilayaCode);
  const isFreeShipping =
    selectedBundle?.quantity === product.freeShippingQuantity;
  const selectedCommune = communes.find(item => item.name === commune);
  const stopDeskAvailable = Boolean(selectedCommune?.hasStopDesk);
  const effectiveDeliveryType: DeliveryType =
    deliveryType === "stop_desk" && stopDeskAvailable ? "stop_desk" : "home";
  const deliveryFee = isFreeShipping
    ? 0
    : effectiveDeliveryType === "stop_desk"
      ? selectedFee.stopDesk
      : selectedFee.home;
  const feeValues = Object.values(deliveryFees);
  const lowestDeliveryFee = feeValues.length
    ? Math.min(...feeValues.map(fee => Math.min(fee.home, fee.stopDesk)))
    : null;

  const getActiveDraftLeadId = () => {
    if (!activeDraftLeadIdRef.current) {
      activeDraftLeadIdRef.current = getProductSessionLeadId(product);
    }
    return activeDraftLeadIdRef.current;
  };

  const runPendingDraftSync = async (): Promise<void> => {
    if (draftSyncPromiseRef.current) return draftSyncPromiseRef.current;

    const syncTask = (async () => {
      while (pendingDraftSyncRef.current) {
        const draft = pendingDraftSyncRef.current;
        pendingDraftSyncRef.current = null;
        await saveOrder(draft);
      }
    })();

    draftSyncPromiseRef.current = syncTask;
    try {
      await syncTask;
    } finally {
      if (draftSyncPromiseRef.current === syncTask) {
        draftSyncPromiseRef.current = null;
      }
      if (pendingDraftSyncRef.current && !isSubmitting) {
        void runPendingDraftSync();
      }
    }
  };

  useEffect(() => {
    // Embedded fees show at once; this refreshes them, and retries on failure.
    let cancelled = false,
      retry: number | undefined;
    void fetch("/api/orders?resource=fees")
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("fees"))
      )
      .then((data: { fees?: DeliveryFeeRow[] }) => {
        if (cancelled) return;
        const mapped = mapFees(data.fees);
        if (!Object.keys(mapped).length) throw new Error("fees");
        setDeliveryFees(mapped);
        setDeliveryFeesStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setDeliveryFeesStatus(status =>
          status === "ready" ? status : "error"
        );
        if (feesAttempt < 3)
          retry = window.setTimeout(
            () => setFeesAttempt(n => n + 1),
            2000 * (feesAttempt + 1)
          );
      });
    return () => {
      cancelled = true;
      window.clearTimeout(retry);
    };
  }, [feesAttempt]);

  const retryDeliveryFees = () => {
    setDeliveryFeesStatus(status => (status === "ready" ? status : "loading"));
    setFeesAttempt(n => n + 1);
  };

  useEffect(() => {
    if (!wilaya) {
      setCommunes([]);
      setCommune("");
      setCommunesStatus("idle");
      return;
    }
    setCommune("");
    setCommunesStatus("loading");
    const controller = new AbortController();
    void fetch(
      `/api/orders?resource=communes&wilaya=${encodeURIComponent(wilaya)}`,
      { signal: controller.signal }
    )
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("communes"))
      )
      .then(
        (data: {
          communes?: Array<{ name: string; hasStopDesk: boolean }>;
        }) => {
          setCommunes(data.communes || []);
          setCommunesStatus(data.communes?.length ? "ready" : "error");
        }
      )
      .catch(() => {
        if (controller.signal.aborted) return;
        setCommunes([]);
        setCommunesStatus("error");
      });
    return () => controller.abort();
  }, [wilaya, communesAttempt]);

  const retryCommunes = () => setCommunesAttempt(n => n + 1);

  useEffect(() => {
    if (viewContentSentRef.current) return;
    viewContentSentRef.current = true;
    fireFacebookEventOnce(
      product,
      "ViewContent",
      "view-content",
      productEventData
    );
  }, []);

  const trackInitiateCheckout = () => {
    if (initiateCheckoutSentRef.current) {
      return;
    }

    const hasMeaningfulInput = Boolean(
      phone.trim() || fullName.trim() || wilaya || commune
    );
    if (!hasMeaningfulInput) {
      return;
    }

    initiateCheckoutSentRef.current = true;
    fireFacebookEventOnce(
      product,
      "InitiateCheckout",
      `initiate-checkout:${offerPrice}:${phone.trim() || "no-phone"}`,
      {
        ...productEventData,
        lead_source: phone.trim() ? "form_started" : "form_engaged",
      }
    );
  };

  useEffect(() => {
    if (!phone && !fullName && !wilaya && !commune) {
      return;
    }
    trackInitiateCheckout();
  }, [phone, fullName, wilaya, commune]);

  useEffect(() => {
    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      facebookLeadSentRef.current = false;
      return;
    }

    if (
      PHONE_PATTERN.test(trimmedPhone) &&
      !facebookLeadSentRef.current &&
      !submitted
    ) {
      facebookLeadSentRef.current = true;
      fireFacebookEventOnce(product, "Lead", `lead:${trimmedPhone}`, {
        ...productEventData,
        lead_source: "valid_phone",
      });
    }

    if (!PHONE_PATTERN.test(trimmedPhone)) {
      facebookLeadSentRef.current = false;
    }
  }, [phone, submitted]);

  useEffect(() => {
    const trimmedPhone = phone.trim();
    const digitCount = trimmedPhone.replace(/\D/g, "").length;
    if (!trimmedPhone || submitted || isSubmitting) return;
    if (digitCount < 3 && !activeDraftLeadIdRef.current) return;

    const draft: OrderPayload = {
      leadId: getActiveDraftLeadId(),
      status: "abandoned",
      productSlug: product.slug,
      price: offerPrice,
      campaign: campaignLabel,
      phone: trimmedPhone,
      fullName: fullName.trim() || undefined,
      wilaya: wilaya || undefined,
      commune: commune.trim() || undefined,
      deliveryFee,
      deliveryType: effectiveDeliveryType,
      giftBooklet: false,
      quantity: selectedBundle?.quantity ?? 1,
      draftSync: true,
    };

    pendingDraftSyncRef.current = draft;
    if (draftSyncTimerRef.current !== null) {
      window.clearTimeout(draftSyncTimerRef.current);
    }
    draftSyncTimerRef.current = window.setTimeout(() => {
      draftSyncTimerRef.current = null;
      void runPendingDraftSync();
    }, 700);

    return () => {
      if (draftSyncTimerRef.current !== null) {
        window.clearTimeout(draftSyncTimerRef.current);
        draftSyncTimerRef.current = null;
      }
    };
  }, [
    phone,
    fullName,
    wilaya,
    commune,
    offerPrice,
    campaignLabel,
    deliveryFee,
    effectiveDeliveryType,
    selectedBundle,
    submitted,
    isSubmitting,
  ]);

  // Clear a shown error as soon as the visitor fixes that field.
  useEffect(() => {
    setFormError(current => {
      if (!current) return current;
      if (current.field === "phone" && !validatePhone(phone)) return null;
      if (current.field === "wilaya" && wilaya) return null;
      if (current.field === "commune" && commune) return null;
      if (current.field === "fees" && deliveryFeesStatus === "ready")
        return null;
      return current;
    });
  }, [phone, wilaya, commune, deliveryFeesStatus]);

  const focusField = (id: string) =>
    window.setTimeout(() => document.getElementById(id)?.focus(), 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const validationMessage = validatePhone(phone);
    if (validationMessage) {
      setFormError({ field: "phone", message: validationMessage });
      phoneInputRef.current?.focus();
      return;
    }
    if (!wilaya) {
      setFormError({ field: "wilaya", message: "اختر الولاية" });
      focusField("wilaya");
      return;
    }
    if (!commune.trim()) {
      setFormError({ field: "commune", message: "اختر البلدية" });
      focusField("commune");
      return;
    }

    if (
      !isFreeShipping &&
      (deliveryFeesStatus !== "ready" || !hasDeliveryFee)
    ) {
      if (deliveryFeesStatus !== "ready") retryDeliveryFees();
      setFormError({
        field: "fees",
        message:
          deliveryFeesStatus === "ready"
            ? "التوصيل غير متاح لهذه الولاية حالياً."
            : "جارٍ تحميل سعر التوصيل… أعد الضغط بعد لحظة.",
      });
      return;
    }

    setFormError(null);
    trackInitiateCheckout();
    const trimmedPhone = phone.trim();
    const leadId = getActiveDraftLeadId();
    setIsSubmitting(true);

    if (draftSyncTimerRef.current !== null) {
      window.clearTimeout(draftSyncTimerRef.current);
      draftSyncTimerRef.current = null;
    }
    pendingDraftSyncRef.current = null;
    if (draftSyncPromiseRef.current) {
      await draftSyncPromiseRef.current;
    }

    const quantity = selectedBundle?.quantity ?? 1;
    const orderSaved = await saveOrder({
      leadId,
      status: "complete",
      productSlug: product.slug,
      price: offerPrice,
      campaign: campaignLabel,
      phone: trimmedPhone,
      fullName,
      wilaya,
      commune: commune.trim(),
      deliveryFee,
      deliveryType: effectiveDeliveryType,
      giftBooklet: false,
      quantity,
    });

    if (!orderSaved) {
      setFormError({
        field: "save",
        message: "تعذر إرسال الطلب. تحقق من الإنترنت ثم أعد المحاولة.",
      });
      setIsSubmitting(false);
      return;
    }

    // Only a saved order counts as a conversion.
    fireFacebookEventOnce(
      product,
      "Purchase",
      `purchase:${leadId}`,
      getProductPurchaseEventData(product, offerPrice)
    );
    setLastOrder({
      bundleLabel: selectedBundle?.label || product.name,
      quantity,
      price: offerPrice,
      deliveryFee,
      deliveryType: effectiveDeliveryType,
      wilaya,
      commune: commune.trim(),
    });
    setSubmitted(true);
    setFullName("");
    setWilaya("");
    setCommune("");
    setPhoneValue("");
    setDeliveryType("home");
    facebookLeadSentRef.current = false;
    resetProductSessionLeadId(product);
    activeDraftLeadIdRef.current = null;
    setIsSubmitting(false);
  };

  const startNewOrder = () => {
    resetProductSessionLeadId(product);
    activeDraftLeadIdRef.current = null;
    setSubmitted(false);
    setLastOrder(null);
  };
  return {
    fullName,
    setFullName,
    wilaya,
    setWilaya,
    commune,
    setCommune,
    phone,
    setPhone,
    communes,
    communesStatus,
    retryCommunes,
    deliveryFeesStatus,
    retryDeliveryFees,
    lowestDeliveryFee,
    deliveryType: effectiveDeliveryType,
    setDeliveryType,
    stopDeskAvailable,
    isSubmitting,
    submitted,
    lastOrder,
    formError,
    selectedBundleQuantity: selectedBundle?.quantity ?? selectedBundleQuantity,
    setSelectedBundleQuantity,
    isFlowerLanding,
    phoneInputRef,
    selectedBundle,
    offerPrice,
    compareAtTotal,
    phoneError,
    hasDeliveryFee,
    isFreeShipping,
    deliveryFee,
    trackInitiateCheckout,
    handleSubmit,
    startNewOrder,
  };
}
