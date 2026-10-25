export const statusKey = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[\s'’\-]+/g, "_");

const stages: Record<string, { label: string; group: string }> = {
  created: { label: "تم الرفع — بانتظار الاعتماد", group: "ready" },
  prete_a_expedier: {
    label: "Prêt à expédier — جاهزة للإرسال",
    group: "ready",
  },
  pret_a_preparer: { label: "Prêt à préparer — جاهزة للتحضير", group: "ready" },
  en_ramassage: { label: "En ramassage — قيد الجمع", group: "in_transit" },
  en_preparation_stock: {
    label: "Stock en préparation — تجهيز من المخزون",
    group: "in_transit",
  },
  vers_hub: { label: "Vers hub — نحو مركز الفرز", group: "in_transit" },
  en_hub: { label: "En hub — في مركز الفرز", group: "in_transit" },
  vers_wilaya: { label: "Vers wilaya — نحو الولاية", group: "in_transit" },
  en_preparation: {
    label: "En préparation — قيد التحضير",
    group: "in_transit",
  },
  en_livraison: {
    label: "En livraison — قيد التوصيل",
    group: "out_for_delivery",
  },
  suspendu: { label: "Suspendu — معلّقة", group: "failed_delivery" },
  livre_non_encaisse: {
    label: "Livré non encaissé — سُلّمت، لم تُحصّل",
    group: "delivered",
  },
  encaisse_non_paye: {
    label: "Encaissé non payé — حُصّلت، لم تُدفع المستحقات",
    group: "delivered",
  },
  paiements_prets: {
    label: "Paiement prêt — المستحقات جاهزة",
    group: "delivered",
  },
  paye_et_archive: {
    label: "Payé et archivé — دُفعت المستحقات",
    group: "paid",
  },
  retour_chez_livreur: {
    label: "Retour chez livreur — مرتجع لدى السائق",
    group: "returning",
  },
  retour_transit_entrepot: {
    label: "Retour en transit — المرتجع بالطريق",
    group: "returning",
  },
  retour_en_traitement: {
    label: "Retour en traitement — معالجة المرتجع",
    group: "returning",
  },
  retours_prets: { label: "Retours prêts — مرتجعات جاهزة", group: "returning" },
  retour_recu: { label: "Retour reçu — استُلم المرتجع", group: "returned" },
  retours_a_dispatcher_vers_stock: {
    label: "Retour vers stock — تجهيز نقل المرتجع للمخزون",
    group: "returning",
  },
  retours_en_transit_stock: {
    label: "Retour en transit stock — المرتجع نحو المخزون",
    group: "returning",
  },
  retours_en_stock: {
    label: "Retour en stock — المرتجع بالمخزون",
    group: "returned",
  },
  retour_archive: {
    label: "Retour archivé — المرتجع مؤرشف",
    group: "returned",
  },
  annule: { label: "Annulé — ملغاة", group: "cancelled" },
  picked: { label: "Picked — جُمعت الشحنة", group: "in_transit" },
  accepted_by_carrier: {
    label: "Accepted by carrier — استلمت الشركة الشحنة",
    group: "in_transit",
  },
  dispatched_to_driver: {
    label: "Dispatched to driver — سُلّمت للسائق",
    group: "out_for_delivery",
  },
  attempt_delivery: {
    label: "Attempt delivery — محاولة توصيل",
    group: "out_for_delivery",
  },
  order_information_received_by_carrier: {
    label: "سُجلت بيانات الشحنة لدى الشركة",
    group: "ready",
  },
};
const aliases: Record<string, string> = {
  pret_a_expedier: "prete_a_expedier",
  stock_en_preparation: "en_preparation_stock",
  livre_encaisse_non_paye: "encaisse_non_paye",
  livred: "livre_non_encaisse",
  encaissed: "encaisse_non_paye",
  paiement_pret: "paiements_prets",
  paiement_archive: "paye_et_archive",
  payed: "paye_et_archive",
  suspendus: "suspendu",
  retours_chez_livreur: "retour_chez_livreur",
  retours_en_traitement: "retour_en_traitement",
  retours_recu: "retour_recu",
  return_received: "retour_recu",
  retours_archive: "retour_archive",
  retour_en_stock: "retours_en_stock",
  return_asked: "retour_en_traitement",
  return_in_transit: "retour_transit_entrepot",
  cancelled: "annule",
};
export function shippingStatus(value: unknown) {
  const raw = String(value || "");
  const key = statusKey(raw);
  const canonical = Object.hasOwn(aliases, key) ? aliases[key] : key;
  const known = Object.hasOwn(stages, canonical)
    ? stages[canonical]
    : undefined;
  return {
    key: canonical,
    raw,
    label: known?.label || raw || "لم تُرسل",
    group: known?.group || key || "unknown",
    known: Boolean(known),
  };
}
export const normalizeEcoTrackStatus = (value: unknown) => {
  const state = shippingStatus(value);
  if (state.known) return state.group;
  if (/^(retour|retours|return)_/.test(state.key)) return "returning";
  return state.key || "unknown";
};
export function remoteActionAllowed(
  action: string,
  rawStatus: unknown,
  validated: boolean
) {
  const state = shippingStatus(rawStatus);
  if (["refresh", "label", "note"].includes(action)) return true;
  if (["validate", "pickup", "edit", "delete"].includes(action))
    return !validated && ["ready", "created"].includes(state.group);
  if (action === "return") return state.group === "out_for_delivery";
  if (action === "receive-return") return state.group === "returning";
  return false;
}
