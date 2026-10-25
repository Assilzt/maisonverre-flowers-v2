import { useState, useEffect, useRef, type FormEvent } from "react";
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
  deliveryType?: "home" | "stop_desk";
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

export function useCheckout(product: ProductLandingConfig) {
  const [fullName, setFullName] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [phone, setPhone] = useState("");
  const [communes, setCommunes] = useState<
    Array<{ name: string; hasStopDesk: boolean }>
  >([]);
  const [deliveryFees, setDeliveryFees] = useState<
    Record<string, { home: number; stopDesk: number }>
  >({});
  const [deliveryFeesStatus, setDeliveryFeesStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const deliveryType = "home" as const;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedBundleQuantity, setSelectedBundleQuantity] = useState(1);
  const isFlowerLanding = true;
  const phoneInputRef = useRef<HTMLInputElement | null>(null);
  const hasAutoFocusedPhoneRef = useRef(false);
  const userInteractedRef = useRef(false);
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
  const deliveryFee = isFreeShipping ? 0 : selectedFee.home;

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
    void fetch("/api/orders?resource=fees")
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("fees"))
      )
      .then(
        (data: {
          fees?: Array<{
            wilaya_id?: string | number;
            tarif?: number;
            tarif_stopdesk?: number;
          }>;
        }) => {
          const mapped: Record<string, { home: number; stopDesk: number }> = {};
          for (const fee of data.fees || []) {
            const code =
              String(fee.wilaya_id || "").replace(/^0+/, "") ||
              String(fee.wilaya_id || "");
            if (code)
              mapped[code] = {
                home: Number(fee.tarif || 0),
                stopDesk: Number(fee.tarif_stopdesk || fee.tarif || 0),
              };
          }
          setDeliveryFees(mapped);
          setDeliveryFeesStatus("ready");
        }
      )
      .catch(() => setDeliveryFeesStatus("error"));
  }, []);

  useEffect(() => {
    if (!wilaya) {
      setCommunes([]);
      setCommune("");
      return;
    }
    setCommune("");
    const controller = new AbortController();
    void fetch(
      `/api/orders?resource=communes&wilaya=${encodeURIComponent(wilaya)}`,
      { signal: controller.signal }
    )
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error("communes"))
      )
      .then(
        (data: { communes?: Array<{ name: string; hasStopDesk: boolean }> }) =>
          setCommunes(data.communes || [])
      )
      .catch(() => {
        if (!controller.signal.aborted) setCommunes([]);
      });
    return () => controller.abort();
  }, [wilaya]);

  useEffect(() => {
    const handleUserInteraction = () => {
      userInteractedRef.current = true;
    };

    window.addEventListener("pointerdown", handleUserInteraction, {
      passive: true,
    });
    window.addEventListener("keydown", handleUserInteraction, {
      passive: true,
    });
    window.addEventListener("touchstart", handleUserInteraction, {
      passive: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener("touchstart", handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    if (hasAutoFocusedPhoneRef.current || userInteractedRef.current) return;

    const tryFocusPhone = () => {
      if (hasAutoFocusedPhoneRef.current || userInteractedRef.current) return;
      const input = phoneInputRef.current;
      if (!input) return;

      const form = document.getElementById("lead-form");
      const formRect = form?.getBoundingClientRect();
      const isNearViewport =
        Boolean(formRect) &&
        formRect!.top < window.innerHeight + 180 &&
        formRect!.bottom > 0;

      if (!isNearViewport) return;
      if (
        document.activeElement &&
        document.activeElement !== document.body &&
        document.activeElement !== input
      )
        return;

      input.focus({ preventScroll: true });
      hasAutoFocusedPhoneRef.current = true;
    };

    const timeoutId = window.setTimeout(
      tryFocusPhone,
      5000 + Math.random() * 9000
    );
    const handleScroll = () => {
      if (!hasAutoFocusedPhoneRef.current) tryFocusPhone();
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

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
      deliveryType,
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
    deliveryType,
    selectedBundle,
    submitted,
    isSubmitting,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationMessage = validatePhone(phone);
    if (validationMessage || !wilaya || !commune.trim()) {
      alert(validationMessage || "يرجى إكمال الولاية والبلدية");
      return;
    }

    if (
      !isFreeShipping &&
      (deliveryFeesStatus !== "ready" || !hasDeliveryFee)
    ) {
      alert(
        deliveryFeesStatus === "loading"
          ? "يرجى الانتظار حتى يتم تحميل رسوم التوصيل ثم أعد المحاولة."
          : "تعذّر تحديد رسوم التوصيل لهذه الولاية. أعد تحميل الصفحة وحاول مرة أخرى."
      );
      return;
    }

    trackInitiateCheckout();
    const trimmedPhone = phone.trim();
    const leadId = getActiveDraftLeadId();
    fireFacebookEventOnce(
      product,
      "Purchase",
      `purchase:${leadId}`,
      getProductPurchaseEventData(product, offerPrice)
    );
    setIsSubmitting(true);

    if (draftSyncTimerRef.current !== null) {
      window.clearTimeout(draftSyncTimerRef.current);
      draftSyncTimerRef.current = null;
    }
    pendingDraftSyncRef.current = null;
    if (draftSyncPromiseRef.current) {
      await draftSyncPromiseRef.current;
    }

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
      deliveryType,
      giftBooklet: false,
      quantity: selectedBundle?.quantity ?? 1,
    });

    if (orderSaved) {
      setSubmitted(true);
      setFullName("");
      setWilaya("");
      setCommune("");
      setPhone("");
      facebookLeadSentRef.current = false;
      resetProductSessionLeadId(product);
      activeDraftLeadIdRef.current = null;
    } else {
      alert("تعذر تسجيل الطلب، يرجى المحاولة مرة أخرى.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  };

  const startNewOrder = () => {
    resetProductSessionLeadId(product);
    activeDraftLeadIdRef.current = null;
    setSubmitted(false);
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
    deliveryFeesStatus,
    isSubmitting,
    submitted,
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
