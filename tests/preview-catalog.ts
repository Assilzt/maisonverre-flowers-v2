import { WILAYAS } from "../shared/locations";

/** Fake but realistic data for the local preview only. Never real people. */

/** A few real commune names per wilaya; others use the wilaya's main town. */
const COMMUNES: Record<number, string[]> = {
  5: ["Batna", "Barika", "Arris", "Merouana", "Ain Touta"],
  6: ["Béjaïa", "Akbou", "Amizour", "El Kseur"],
  9: ["Blida", "Boufarik", "Larbaa", "Ouled Yaich", "Bouinan"],
  13: ["Tlemcen", "Maghnia", "Remchi", "Ghazaouet"],
  15: ["Tizi Ouzou", "Azazga", "Draâ Ben Khedda", "Larbaâ Nath Irathen"],
  16: [
    "Alger Centre",
    "Bab El Oued",
    "Kouba",
    "Hussein Dey",
    "Bir Mourad Raïs",
    "Dar El Beïda",
    "Bab Ezzouar",
    "Chéraga",
  ],
  19: ["Sétif", "El Eulma", "Ain Oulmene", "Bougaa", "Ain Arnat"],
  23: ["Annaba", "El Bouni", "El Hadjar", "Berrahal"],
  25: ["Constantine", "El Khroub", "Ain Smara", "Hamma Bouziane"],
  31: ["Oran", "Bir El Djir", "Es Senia", "Arzew", "Ain Turk"],
  35: ["Boumerdès", "Boudouaou", "Dellys", "Bordj Menaïel"],
  42: ["Tipaza", "Koléa", "Cherchell", "Hadjout"],
};

const fallbackTown = (wilaya: string) => wilaya.replace(/^\d+\s*-\s*/, "");

export function previewCommunes(wilayaId: number) {
  const wilaya = WILAYAS.find(w => Number(w.slice(0, 2)) === wilayaId);
  const names = COMMUNES[wilayaId] || (wilaya ? [fallbackTown(wilaya)] : []);
  return names.map((nom, index) => ({
    nom,
    wilaya_id: wilayaId,
    is_active: 1,
    // The main town always has a carrier office; smaller ones sometimes.
    has_stop_desk: index === 0 || index % 2 === 1 ? 1 : 0,
    code_postal:
      String(wilayaId).padStart(2, "0") + String(index + 1).padStart(3, "0"),
  }));
}

/** Delivery fees: cheaper in the north, more in the south (codes 1,8,11,30…). */
const SOUTH = [
  1, 3, 8, 11, 30, 32, 33, 37, 39, 45, 47, 49, 50, 52, 53, 54, 55, 56, 57, 58,
];
export function previewFees() {
  return Array.from({ length: 58 }, (_, i) => {
    const id = i + 1;
    const home =
      id === 16
        ? 400
        : SOUTH.includes(id)
          ? 1000 + (id % 3) * 100
          : 600 + (id % 4) * 50;
    return {
      wilaya_id: id,
      tarif: home,
      tarif_stopdesk: Math.max(300, home - 300),
    };
  });
}

const FIRST = [
  "محمد",
  "أحمد",
  "يوسف",
  "عبد القادر",
  "رشيد",
  "كريم",
  "سمير",
  "مراد",
  "نبيل",
  "عمر",
  "فاطمة",
  "خديجة",
  "أمينة",
  "نادية",
  "سعاد",
  "حياة",
  "مريم",
  "ليلى",
  "زهرة",
  "سميرة",
];
const LAST = [
  "بن علي",
  "بوزيد",
  "حمدي",
  "بلقاسم",
  "شريف",
  "منصوري",
  "عيساوي",
  "بن يوسف",
  "زروقي",
  "قاسمي",
  "بوعلام",
  "مزياني",
  "لعمامري",
  "بن عمر",
  "حداد",
  "سعيدي",
  "بلعيد",
  "خليفي",
];

/** Bigger wilayas get more orders, as in real Algerian e-commerce. */
const WEIGHTED = [
  16, 16, 16, 16, 31, 31, 31, 19, 19, 25, 25, 9, 9, 5, 5, 15, 6, 13, 23, 35, 42,
];

let seed = 20261125;
const random = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];

type Plan = { status: string; carrier?: string; count: number };
const PLAN: Plan[] = [
  { status: "complete", count: 28 },
  { status: "abandoned", count: 14 },
  { status: "not_responding", count: 10 },
  { status: "confirmed", count: 18 },
  { status: "shipped", carrier: "vers_wilaya", count: 12 },
  { status: "shipped", carrier: "en_livraison", count: 9 },
  { status: "shipped", carrier: "suspendu", count: 4 },
  { status: "delivered", carrier: "livre_non_encaisse", count: 14 },
  { status: "delivered", carrier: "paye_et_archive", count: 20 },
  { status: "returned", carrier: "retour_chez_livreur", count: 7 },
  { status: "cancelled", count: 12 },
  { status: "trashed", count: 3 },
];

const BUNDLES = [
  { quantity: 1, price: 1900, label: "كيس واحد" },
  { quantity: 2, price: 2900, label: "كيسان" },
  { quantity: 2, price: 2900, label: "كيسان" },
  { quantity: 3, price: 3900, label: "3 أكياس" },
];

export function previewOrders(now = Date.now()) {
  const fees = previewFees();
  const phones: string[] = [];
  const orders = [];
  let n = 0;
  for (const plan of PLAN)
    for (let k = 0; k < plan.count; k++) {
      n++;
      const wilayaId =
        random() < 0.75 ? pick(WEIGHTED) : 1 + Math.floor(random() * 58);
      const wilaya = WILAYAS.find(w => Number(w.slice(0, 2)) === wilayaId)!;
      const communes = previewCommunes(wilayaId);
      const commune = pick(communes);
      const bundle = pick(BUNDLES);
      const stopDesk = commune.has_stop_desk === 1 && random() < 0.35;
      const fee = fees[wilayaId - 1];
      const deliveryFee =
        bundle.quantity === 3 ? 0 : stopDesk ? fee.tarif_stopdesk : fee.tarif;
      // A few customers order twice: reuse an earlier phone.
      const phone =
        plan.status === "abandoned" && k % 3 === 0
          ? "0" + pick(["5", "6", "7"]) + String(Math.floor(random() * 1e4))
          : phones.length > 10 && random() < 0.05
            ? pick(phones)
            : "0" +
              pick(["5", "6", "7"]) +
              String(Math.floor(1e7 + random() * 9e7));
      if (phone.length === 10) phones.push(phone);
      const ageHours =
        plan.status === "complete" || plan.status === "abandoned"
          ? random() * 48
          : plan.status.startsWith("deliver") || plan.status === "returned"
            ? 72 + random() * 600
            : 6 + random() * 200;
      const tracking = plan.carrier ? "ECO" + String(100000 + n) : null;
      orders.push({
        lead_id: "AT-DEMO-" + String(n).padStart(4, "0"),
        status: plan.status,
        phone,
        full_name:
          plan.status === "abandoned" && k % 2 === 0
            ? null
            : `${pick(FIRST)} ${pick(LAST)}`,
        wilaya,
        commune:
          plan.status === "abandoned" && k % 2 === 0 ? null : commune.nom,
        price: bundle.price,
        quantity: bundle.quantity,
        delivery_fee: deliveryFee,
        delivery_type: stopDesk ? "stop_desk" : "home",
        created_at: new Date(now - ageHours * 3600 * 1000).toISOString(),
        contact_attempts:
          plan.status === "not_responding"
            ? 1 + Math.floor(random() * 3)
            : plan.status === "complete"
              ? 0
              : 1,
        confirmation_status: [
          "confirmed",
          "shipped",
          "delivered",
          "returned",
        ].includes(plan.status)
          ? "confirmed"
          : plan.status === "cancelled"
            ? "cancelled"
            : "pending",
        contact_result:
          plan.status === "not_responding"
            ? pick(["no_answer", "busy", "call_later"])
            : plan.status === "cancelled"
              ? pick(["refused", "wrong_number"])
              : "",
        tracking,
        carrier: plan.carrier || null,
        shipment_status: plan.carrier
          ? plan.status === "delivered"
            ? "delivered"
            : plan.status === "returned"
              ? "returned"
              : plan.carrier === "suspendu"
                ? "failed_delivery"
                : "in_transit"
          : "pending",
        payment_status: plan.carrier === "paye_et_archive" ? "paid" : "unpaid",
        snapshot: {
          slug: "flower-seed-mix",
          name: "مجموعة بذور الزهور",
          bundle,
          deliveryFee,
          deliveryType: stopDesk ? "stop_desk" : "home",
        },
        status_before_trash: plan.status === "trashed" ? "cancelled" : null,
      });
    }
  return orders;
}
