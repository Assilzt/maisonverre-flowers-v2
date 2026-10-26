import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getBaseUrl,
  getHeaders,
  createEcoTrackStockParcel,
  fetchEcoTrackProducts,
  fetchEcoTrackTrackingsInfo,
} from "../backend/integrations/ecotrack/client.ts";
import { carrierAction } from "../backend/integrations/ecotrack/actions.ts";
import { validateOsenConnection } from "../backend/integrations/osen/connection.ts";
const settings = {
  kind: "osen",
  provider: "osen-express",
  token: "fixture-osen-token",
  merchantId: "merchant-fixture",
  storeId: "store-fixture",
};
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
function responses(...payloads) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: new URL(String(url)), init });
    if (!payloads.length) throw new Error("Unexpected request");
    const data = payloads.shift();
    return data instanceof Response ? data : Response.json(data);
  };
  return calls;
}
test("Osen uses its fixed documented origin and isolated account headers", () => {
  assert.equal(
    getBaseUrl(settings),
    "https://backendmain.osenexpress.com/api/v1"
  );
  assert.equal(getHeaders(settings)["X-Api-Id"], "merchant-fixture");
  assert.equal(getHeaders(settings).Authorization, "Bearer fixture-osen-token");
  assert.equal(
    getBaseUrl({ ...settings, provider: "not-a-host" }),
    "https://backendmain.osenexpress.com/api/v1"
  );
  assert.equal(
    getBaseUrl({ provider: "navexdelivery", token: "eco-fixture" }),
    "https://navexdelivery.ecotrack.dz/api/v1"
  );
  assert.equal(
    getHeaders({ provider: "navexdelivery", token: "eco-fixture" })["X-Api-Id"],
    undefined
  );
  assert.throws(() => getBaseUrl({ ...settings, storeId: "" }), /Store ID/);
  assert.throws(
    () => getBaseUrl({ ...settings, kind: "unknown" }),
    /غير معروف/
  );
});
test("credential validation checks the authenticated merchant and store, not only HTTP success", async () => {
  const calls = responses(
    {
      valid: true,
      scope: "MERCHANT",
      user_id: "merchant-fixture",
      store: { id: "store-fixture" },
    },
    {
      valid: true,
      scope: "MERCHANT",
      user_id: "merchant-fixture",
      store: { id: "different-store" },
    }
  );
  assert.equal(await validateOsenConnection(settings), true);
  assert.equal(await validateOsenConnection(settings), false);
  assert.equal(calls[0].url.pathname, "/v2/ecomanager/auth/validate");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    api_id: "merchant-fixture",
    api_token: "fixture-osen-token",
  });
  assert.equal(calls[0].init.redirect, "error");
});
test("Osen stock push preserves SKU, quantity, COD and normalized phone", async () => {
  const calls = responses(
    [{ wilaya_id: 5, wilaya_name: "Batna" }],
    {
      501: { nom: "Batna", wilaya_id: 5, code_postal: "501", has_stop_desk: 1 },
    },
    { success: true, tracking: "OSEN-FIXTURE-1" }
  );
  const tracking = await createEcoTrackStockParcel(
    {
      leadId: "OSEN-TEST-1",
      price: 3900,
      deliveryFee: 0,
      phone: "+213551234567",
      fullName: "Fixture",
      wilaya: "05 - Batna",
      commune: "Batna",
      productName: "FLOWER-SKU",
      quantity: 3,
    },
    settings
  );
  assert.equal(tracking, "OSEN-FIXTURE-1");
  const call = calls[2];
  assert.equal(call.url.origin, "https://backendmain.osenexpress.com");
  assert.equal(call.url.pathname, "/api/v1/create/order");
  for (const [key, value] of Object.entries({
    stock: "1",
    quantite: "3",
    montant: "3900",
    telephone: "0551234567",
    produit: "FLOWER-SKU",
    reference: "OSEN-TEST-1",
  }))
    assert.equal(call.url.searchParams.get(key), value, key);
  assert.equal(call.init.headers["X-Api-Id"], "merchant-fixture");
  assert.equal(call.init.redirect, "error");
});
test("Osen documented product pagination respects available stock, including zero", async () => {
  responses(
    {
      products: [
        {
          reference: "SKU-A",
          title: "A",
          is_active: 1,
          stock_disponible: 0,
          stock_reserve: 4,
          stock_phisique: 4,
        },
      ],
      pagination: { current_page: 1, last_page: 2 },
    },
    {
      products: [
        { reference: "SKU-B", title: "B", is_active: 1, stock_disponible: 5 },
      ],
      pagination: { current_page: 2, last_page: 2 },
    }
  );
  const products = await fetchEcoTrackProducts(settings);
  assert.equal(products.length, 2);
  assert.equal(products[0].quantity, 0);
  assert.equal(products[1].quantity, 5);
});
test("Osen direct tracking maps never substitute an unrelated parcel", async () => {
  const calls = responses({
    "OSEN-1": {
      status: "En livraison",
      activity: [
        {
          date: "2026-10-26",
          time: "10:00:00",
          status: "dispatched_to_driver",
          scanLocation: "HUB",
        },
      ],
    },
  });
  const result = await fetchEcoTrackTrackingsInfo(["OSEN-1"], settings);
  assert.equal(result["OSEN-1"].status, "En livraison");
  assert.equal(result["OSEN-OTHER"], undefined);
  assert.equal(calls[0].url.pathname, "/api/v1/get/trackings/info");
});
test("Osen business rejections and throttling do not become success or blind retries", async () => {
  let calls = responses({ success: false, error: 10002 });
  await assert.rejects(fetchEcoTrackProducts(settings), /Osen Express/);
  assert.equal(calls.length, 1);
  calls = responses(
    new Response("{}", { status: 429, headers: { "Retry-After": "60" } })
  );
  await assert.rejects(fetchEcoTrackProducts(settings), /Osen Express.*429/);
  assert.equal(calls.length, 1);
});
test("Osen return receipt uses the documented query parameter without changing EcoTrack JSON bodies", async () => {
  let calls = responses({ returned: "success" });
  await carrierAction("receive-return", "OSEN-1", settings);
  assert.equal(calls[0].url.searchParams.get("trackings"), '["OSEN-1"]');
  assert.equal(calls[0].init.body, undefined);
  calls = responses({ returned: "success" });
  await carrierAction("receive-return", "ECO-1", {
    provider: "fixture",
    token: "eco-token",
  });
  assert.deepEqual(JSON.parse(calls[0].init.body), { trackings: ["ECO-1"] });
  assert.equal(calls[0].url.search, "");
});
