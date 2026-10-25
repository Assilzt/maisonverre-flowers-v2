import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeEcoTrackStatus,
  fetchEcoTrackProducts,
  fetchEcoTrackCommunes,
  fetchEcoTrackTracking,
  fetchEcoTrackTrackingsInfo,
  createEcoTrackStockParcel,
  latestEcoTrackActivity,
} from "../backend/integrations/ecotrack/client.ts";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const settings = { provider: "test-provider", token: "test-token" };
function responses(...bodies) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: new URL(url), init });
    assert.ok(bodies.length, "Unexpected extra network request");
    const body = bodies.shift();
    return body instanceof Response ? body : Response.json(body);
  };
  return calls;
}

test("COD collection and payout preparation are not seller payment", () => {
  for (const status of [
    "encaisse_non_paye",
    "Livre encaissé non payé",
    "paiements_prets",
    "Paiement prêt",
    "encaissed",
  ])
    assert.equal(normalizeEcoTrackStatus(status), "delivered", status);
  for (const status of [
    "paye_et_archive",
    "payé_et_archivé",
    "Paiement archivé",
    "payed",
  ])
    assert.equal(normalizeEcoTrackStatus(status), "paid", status);
});

test("French labels and activity codes map to the correct shipping stage", () => {
  for (const status of [
    "en_livraison",
    "En livraison",
    "dispatched_to_driver",
    "attempt_delivery",
  ])
    assert.equal(normalizeEcoTrackStatus(status), "out_for_delivery", status);
  assert.equal(normalizeEcoTrackStatus("accepted_by_carrier"), "in_transit");
  assert.equal(normalizeEcoTrackStatus("Prêt à expédier"), "ready");
  assert.equal(normalizeEcoTrackStatus("Livre non encaissé"), "delivered");
  assert.equal(normalizeEcoTrackStatus("unknown_state"), "unknown_state");
  assert.equal(normalizeEcoTrackStatus("constructor"), "constructor");
});

test("return request and transit do not mean physically received return", () => {
  for (const status of [
    "return_asked",
    "return_in_transit",
    "retour_chez_livreur",
    "Retours en traitement",
  ])
    assert.equal(normalizeEcoTrackStatus(status), "returning", status);
  for (const status of [
    "Return_received",
    "retour_recu",
    "Retours reçu",
    "retour_archive",
  ])
    assert.equal(normalizeEcoTrackStatus(status), "returned", status);
});

test("stock fetch follows pagination and respects available quantity and inactive products", async () => {
  const calls = responses(
    {
      products: [
        {
          reference: "A",
          title: "Flowers",
          stock_disponible: 0,
          stock_phisique: 10,
          is_active: 1,
        },
      ],
      pagination: { last_page: 2 },
    },
    {
      products: [
        { reference: "B", title: "Seeds", stock_disponible: 7, is_active: 1 },
        { reference: "C", title: "Hidden", is_active: "0" },
      ],
      pagination: { last_page: 2 },
    }
  );
  const products = await fetchEcoTrackProducts(settings);
  assert.deepEqual(
    products.map(p => [p.id, p.quantity]),
    [
      ["A", 0],
      ["B", 7],
    ]
  );
  assert.deepEqual(
    calls.map(c => c.url.searchParams.get("page")),
    ["1", "2"]
  );
  assert.ok(calls.every(c => c.init.signal instanceof AbortSignal));
});

test("communes exclude inactive entries and entries from a different wilaya", async () => {
  responses({
    0: { nom: "Batna", wilaya_id: 5, is_active: 1 },
    1: { nom: "Inactive", wilaya_id: 5, is_active: 0 },
    2: { nom: "Other wilaya", wilaya_id: 16, is_active: 1 },
  });
  assert.deepEqual(
    (await fetchEcoTrackCommunes("05 - Batna", settings)).map(c => c.name),
    ["Batna"]
  );
});

test("single tracking derives state from dated history without treating notes as status", async () => {
  responses({
    activity: [
      { date: "2026-10-24", time: "10:00:00", status: "livred" },
      { date: "2026-10-23", time: "10:00:00", status: "picked" },
      { date: "2026-10-25", time: "10:00:00", status: "notification_on_order" },
    ],
  });
  assert.equal(
    (await fetchEcoTrackTracking("TRACK-A", settings)).status,
    "livred"
  );
});

test("tracking lookup never falls back to another parcel", async () => {
  responses({ data: [{ tracking: "OTHER", status: "payed" }] });
  assert.equal((await fetchEcoTrackTracking("TRACK-A", settings)).status, null);
});

test("latest activity is chosen by provider timestamp rather than array order", () => {
  assert.equal(
    latestEcoTrackActivity([
      { created_at: "2026-10-25 12:00:00", remarque: "new" },
      { created_at: "2026-10-24 12:00:00", remarque: "old" },
    ]).remarque,
    "new"
  );
});

test("bulk tracking enforces the documented 100-tracking limit", async () => {
  const calls = responses();
  assert.deepEqual(await fetchEcoTrackTrackingsInfo([], settings), {});
  await assert.rejects(
    fetchEcoTrackTrackingsInfo(Array(101).fill("A"), settings),
    /100/
  );
  assert.equal(calls.length, 0);
});

test("429 is surfaced without blind retries", async () => {
  const calls = responses(
    new Response("{}", { status: 429, headers: { "Retry-After": "60" } })
  );
  await assert.rejects(fetchEcoTrackProducts(settings), /429.*60/);
  assert.equal(calls.length, 1);
});

test("HTTP 200 business errors do not become successful empty tracking results", async () => {
  responses({ success: false, error: 10001, message: "Rejected" });
  await assert.rejects(fetchEcoTrackTracking("TRACK-A", settings), /EcoTrack/);
});

test("stock push retains existing request contract", async () => {
  const calls = responses(
    [{ wilaya_id: 5, wilaya_name: "Batna" }],
    [{ nom: "Batna", wilaya_id: 5, is_active: 1, code_postal: "501" }],
    { success: true, tracking: "TRACK-A" }
  );
  assert.equal(
    await createEcoTrackStockParcel(
      {
        leadId: "TEST-A",
        price: 3900,
        deliveryFee: 0,
        phone: "+213551234567",
        fullName: "Test",
        wilaya: "05 - Batna",
        commune: "Batna",
        productName: "FLOWERS-SKU",
        quantity: 3,
      },
      settings
    ),
    "TRACK-A"
  );
  const request = calls[2];
  assert.equal(request.init.method, "POST");
  assert.equal(request.init.headers.Authorization, "Bearer test-token");
  for (const [key, value] of Object.entries({
    stock: "1",
    quantite: "3",
    montant: "3900",
    telephone: "0551234567",
    produit: "FLOWERS-SKU",
    type: "1",
    stop_desk: "0",
  }))
    assert.equal(request.url.searchParams.get(key), value, key);
});
