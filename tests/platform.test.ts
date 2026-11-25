import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { testDatabase } from "./database";
import { sql } from "../backend/repositories/connection";
import { createOrder } from "../backend/handlers/create";
import { issueSession, verifySession } from "../backend/auth/session";
import { syncShipments } from "../backend/services/shipment-sync";
import { loadEcoSettings } from "../backend/repositories/index";
import type { Request, Response } from "../backend/http/contracts";
import { validatePage } from "../backend/services/pages";
import { DEFAULT_PRODUCT } from "../shared/catalog";
import { shippingStatus, remoteActionAllowed } from "../shared/shipping-status";
import { flushNotifications } from "../backend/jobs/notifications";
import pages from "../api/pages";
import session from "../api/session";
import { updateShip } from "../backend/handlers/update-ship";
import { readOrders } from "../backend/handlers/read";
import { cancelLocalShipment } from "../backend/repositories/stock";
import { updateSettings } from "../backend/handlers/update-settings";
import { invalidateFeeCache } from "../backend/services/delivery-fees";
let db: Awaited<ReturnType<typeof testDatabase>>;
const originalFetch = globalThis.fetch;
function capture() {
  let code = 200,
    body: Record<string, unknown> = {};
  const response: Response = {
    status(n) {
      code = n;
      return this;
    },
    json(value) {
      body = value as typeof body;
    },
    setHeader() {},
  };
  return {
    response,
    get code() {
      return code;
    },
    get body() {
      return body;
    },
  };
}
const request = (body: unknown = {}, admin = false): Request => ({
  method: "POST",
  headers: admin ? { cookie: "mv_session=" + issueSession() } : {},
  body,
});
const orderInput = (extra: Record<string, unknown> = {}) => ({
  leadId: "AT-" + crypto.randomUUID(),
  leadToken: crypto.randomUUID(),
  status: "complete",
  phone: "0551234567",
  quantity: 3,
  price: 1,
  deliveryFee: 0,
  fullName: "Test customer",
  wilaya: "05 - Batna",
  commune: "Batna",
  ...extra,
});
beforeAll(async () => {
  vi.stubEnv("DASHBOARD_PASSWORD", "fixture-only-password");
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
  db = await testDatabase();
});
beforeEach(async () => {
  await db.exec(
    "DELETE FROM atlasio_settings WHERE key IN ('shipping_providers','active_provider_id')"
  );
  await db.exec(
    "TRUNCATE atlasio_orders,mv_notification_outbox,mv_rate_limits,mv_jobs,mv_landing_pages,mv_page_revisions RESTART IDENTITY CASCADE"
  );
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
afterAll(async () => {
  await db.close();
  vi.unstubAllEnvs();
});

describe("Durable orders and protected state", () => {
  it("distinguishes a missing dashboard configuration from a wrong password", async () => {
    const previous = process.env.DASHBOARD_PASSWORD;
    delete process.env.DASHBOARD_PASSWORD;
    const missing = capture();
    await session(request({ password: "anything" }), missing.response);
    expect(missing.code).toBe(503);
    expect(String(missing.body.error)).toContain("DASHBOARD_PASSWORD");
    process.env.DASHBOARD_PASSWORD = previous;
    const invalid = capture();
    await session(request({ password: "wrong" }), invalid.response);
    expect(invalid.code).toBe(401);
  });

  it("prices the flower bundle on the server and atomically queues Telegram", async () => {
    const body = orderInput(),
      c = capture();
    await createOrder(request(body), c.response, body);
    expect(c.code).toBe(200);
    const rows = await sql!`SELECT * FROM atlasio_orders`;
    expect(rows[0].price).toBe(3900);
    expect(rows[0].quantity).toBe(3);
    expect(await sql!`SELECT * FROM mv_notification_outbox`).toHaveLength(1);
  });
  it("stores stop-desk orders with the stop-desk fee", async () => {
    invalidateFeeCache();
    await db.exec(
      `UPDATE atlasio_settings SET value='{"5":{"home":700,"stopDesk":400}}' WHERE key='delivery_fees'`
    );
    globalThis.fetch = (async () => {
      throw new Error("carrier offline");
    }) as typeof fetch;
    const body = orderInput({ quantity: 1, deliveryType: "stop_desk" }),
      c = capture();
    await createOrder(request(body), c.response, body);
    expect(c.code).toBe(200);
    const rows =
      await sql!`SELECT price,delivery_fee,delivery_type FROM atlasio_orders`;
    expect(rows[0]).toMatchObject({
      price: 1900,
      delivery_fee: 400,
      delivery_type: "stop_desk",
    });
    await db.exec(
      "UPDATE atlasio_settings SET value='{}' WHERE key='delivery_fees'"
    );
    invalidateFeeCache();
  });
  it("keeps an abandoned draft even when delivery fees cannot load", async () => {
    invalidateFeeCache();
    globalThis.fetch = (async () => {
      throw new Error("carrier offline");
    }) as typeof fetch;
    const body = orderInput({ quantity: 1, status: "abandoned" }),
      c = capture();
    await createOrder(request(body), c.response, body);
    expect(c.code).toBe(200);
    const rows = await sql!`SELECT status,delivery_fee FROM atlasio_orders`;
    expect(rows[0]).toMatchObject({ status: "abandoned", delivery_fee: 0 });
  });
  it("drops empty FAQ and review rows and keeps a valid default bundle", () => {
    const page = validatePage({
      ...DEFAULT_PRODUCT,
      faq: [
        { question: "Q", answer: "A" },
        { question: "", answer: "" },
      ],
      reviews: [{ name: " ", place: "", text: "" }],
      defaultBundleQuantity: 9,
    });
    expect(page.faq).toEqual([{ question: "Q", answer: "A" }]);
    expect(page.reviews).toEqual([]);
    expect(page.defaultBundleQuantity).toBeUndefined();
  });
  it("cannot downgrade a complete order with a delayed draft or create duplicates", async () => {
    const body = orderInput();
    await createOrder(request(body), capture().response, body);
    await createOrder(
      request({ ...body, status: "abandoned" }),
      capture().response,
      { ...body, status: "abandoned" }
    );
    await createOrder(request(body), capture().response, body);
    const rows = await sql!`SELECT * FROM atlasio_orders`;
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("complete");
    await sql!`UPDATE atlasio_orders SET status='confirmed'`;
    await createOrder(
      request({ ...body, phone: "0661234567" }),
      capture().response,
      { ...body, phone: "0661234567" }
    );
    expect(
      (await sql!`SELECT phone,status FROM atlasio_orders`)[0]
    ).toMatchObject({ phone: "0551234567", status: "confirmed" });
  });
  it("rejects a different capability token for an existing lead", async () => {
    const body = orderInput();
    await createOrder(request(body), capture().response, body);
    const c = capture();
    await createOrder(request(body), c.response, {
      ...body,
      leadToken: crypto.randomUUID(),
    });
    expect(c.code).toBe(409);
  });
  it("keeps an order when Telegram fails and schedules retry", async () => {
    const body = orderInput();
    await createOrder(request(body), capture().response, body);
    expect((await flushNotifications()).failed).toBe(1);
    expect(await sql!`SELECT * FROM atlasio_orders`).toHaveLength(1);
    expect(
      (await sql!`SELECT status,attempts FROM mv_notification_outbox`)[0]
    ).toMatchObject({ status: "pending", attempts: 1 });
  });
  it("invalid shipping mode never leaves an order processing", async () => {
    const body = orderInput();
    await createOrder(request(body), capture().response, body);
    await sql!`UPDATE atlasio_orders SET status='confirmed'`;
    const c = capture();
    await updateShip(
      request({}, true),
      c.response,
      { id: 1 },
      await loadEcoSettings()
    );
    expect(c.code).toBe(400);
    expect(
      (await sql!`SELECT shipment_status FROM atlasio_orders`)[0]
        .shipment_status
    ).not.toBe("processing");
  });
});
describe("Carrier state and synchronization", () => {
  it("releases reserved stock once when cancellation is repeated", async () => {
    const body = orderInput();
    await createOrder(request(body), capture().response, body);
    const product = (
      await sql!`INSERT INTO atlasio_stock_products(name,sku,quantity,provider_id) VALUES('Stock fixture','CANCEL-SKU',7,'default') RETURNING id`
    )[0];
    await sql!`UPDATE atlasio_orders SET status='shipped',ship_from_stock=TRUE,stock_product_id=${product.id} WHERE lead_id=${body.leadId}`;
    const order = (
      await sql!`SELECT id FROM atlasio_orders WHERE lead_id=${body.leadId}`
    )[0];
    await cancelLocalShipment(order.id);
    await cancelLocalShipment(order.id);
    expect(
      (
        await sql!`SELECT quantity FROM atlasio_stock_products WHERE id=${product.id}`
      )[0].quantity
    ).toBe(10);
  });
  it("syncs locally known trackings without discovering the remote order list", async () => {
    const body = orderInput();
    await createOrder(request(body), capture().response, body);
    await sql!`UPDATE atlasio_orders SET status='shipped',shipping_provider_id='default',ecotrack_tracking='TRACK-A',ecotrack_status='created'`;
    globalThis.fetch = vi.fn(async url => {
      expect(String(url)).toContain("/get/trackings/info");
      return Response.json({
        data: { "TRACK-A": { status: "vers_wilaya", activity: [] } },
      });
    }) as typeof fetch;
    await sql!`UPDATE atlasio_settings SET value='fixture-token' WHERE key='ecotrack_token'`;
    const result = await syncShipments(await loadEcoSettings());
    expect(result.synced).toBe(1);
    const row = (
      await sql!`SELECT status,ecotrack_status,shipment_status FROM atlasio_orders`
    )[0];
    expect(row).toMatchObject({
      status: "shipped",
      ecotrack_status: "vers_wilaya",
      shipment_status: "in_transit",
    });
  });
  it("distinguishes delivery, return transit and seller payment", () => {
    expect(shippingStatus("En livraison").group).toBe("out_for_delivery");
    expect(shippingStatus("encaisse_non_paye").group).not.toBe("paid");
    expect(shippingStatus("retour_en_traitement").group).toBe("returning");
    expect(shippingStatus("Vers station X").label).toBe("Vers station X");
    expect(remoteActionAllowed("edit", "en_livraison", false)).toBe(false);
    expect(remoteActionAllowed("validate", "created", false)).toBe(true);
  });
});
describe("Page editing and sessions", () => {
  it("stores a verified Osen profile without exposing its secret or changing the active EcoTrack account", async () => {
    const existing = await loadEcoSettings();
    const profile = {
      id: "osen-fixture",
      name: "Osen Express",
      kind: "osen",
      provider: "osen-express",
      token: "fixture-osen-secret",
      merchantId: "merchant-fixture",
      storeId: "store-fixture",
    };
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        valid: true,
        scope: "MERCHANT",
        user_id: profile.merchantId,
        store: { id: profile.storeId },
      })
    ) as typeof fetch;
    const c = capture();
    await updateSettings(
      request({}, true),
      c.response,
      {
        providers: [...existing.providers, profile],
        activeProviderId: existing.providerId,
      },
      existing
    );
    expect(c.code).toBe(200);
    expect(c.body.activeProviderId).toBe(existing.providerId);
    expect(JSON.stringify(c.body)).not.toContain(profile.token);
    const settings = await loadEcoSettings(profile.id);
    expect(settings.kind).toBe("osen");
    expect(settings.token).toBe(profile.token);
    expect(settings.merchantId).toBe(profile.merchantId);
  });
  it("rejects Osen credentials for a different store before writing the profile", async () => {
    const existing = await loadEcoSettings();
    globalThis.fetch = vi.fn(async () =>
      Response.json({
        valid: true,
        scope: "MERCHANT",
        user_id: "merchant-fixture",
        store: { id: "different-store" },
      })
    ) as typeof fetch;
    const c = capture();
    await updateSettings(
      request({}, true),
      c.response,
      {
        providers: [
          ...existing.providers,
          {
            id: "osen-bad",
            name: "Osen",
            kind: "osen",
            provider: "osen-express",
            token: "wrong-store-secret",
            merchantId: "merchant-fixture",
            storeId: "store-fixture",
          },
        ],
        activeProviderId: existing.providerId,
      },
      existing
    );
    expect(c.code).toBe(400);
    expect(
      (await loadEcoSettings()).providers.some(p => p.id === "osen-bad")
    ).toBe(false);
  });
  it("cannot replace the carrier type of an account that has order history", async () => {
    const existing = await loadEcoSettings();
    const body = orderInput();
    await createOrder(request(body), capture().response, body);
    await sql!`UPDATE atlasio_orders SET shipping_provider_id=${existing.providerId}`;
    globalThis.fetch = vi.fn() as typeof fetch;
    const c = capture();
    await updateSettings(
      request({}, true),
      c.response,
      {
        providers: [
          {
            ...existing.providers[0],
            kind: "osen",
            provider: "osen-express",
            token: "new-fixture-key",
            merchantId: "merchant-fixture",
            storeId: "store-fixture",
          },
        ],
      },
      existing
    );
    expect(c.code).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("creates independent products, rejects duplicate slugs, and publishes their own checkout price", async () => {
    const product = {
      ...structuredClone(DEFAULT_PRODUCT),
      slug: "garden-tools",
      name: "Garden tools",
      price: 2500,
      bundles: [{ quantity: 1, price: 2500, label: "One" }],
      freeShippingQuantity: 1,
      tracking: { contentId: "tools-1", campaignName: "Tools" },
    };
    const denied = capture();
    await pages(request({ action: "create", page: product }), denied.response);
    expect(denied.code).toBe(401);
    const created = capture();
    await pages(
      request({ action: "create", page: product }, true),
      created.response
    );
    expect(created.code).toBe(200);
    const duplicate = capture();
    await pages(
      request(
        { action: "create", page: { ...product, name: "Overwrite" } },
        true
      ),
      duplicate.response
    );
    expect(duplicate.code).toBe(409);
    const listing = capture();
    await pages(
      {
        method: "GET",
        headers: request({}, true).headers,
        query: { mode: "admin" },
      },
      listing.response
    );
    expect(
      (listing.body.pages as Array<{ slug: string }>).map(p => p.slug)
    ).toEqual(expect.arrayContaining(["garden-tools", DEFAULT_PRODUCT.slug]));
    const hidden = capture();
    await pages(
      { method: "GET", headers: {}, query: { slug: product.slug } },
      hidden.response
    );
    expect(hidden.code).toBe(404);
    const published = capture();
    await pages(
      request(
        { action: "publish", slug: product.slug, expectedDraft: product },
        true
      ),
      published.response
    );
    expect(published.code).toBe(200);
    const body = orderInput({ productSlug: product.slug, quantity: 1 });
    const c = capture();
    await createOrder(request(body), c.response, body);
    expect(c.code).toBe(200);
    const order = (
      await sql!`SELECT price,product_slug,order_snapshot FROM atlasio_orders`
    )[0];
    expect(order.price).toBe(2500);
    expect(order.product_slug).toBe(product.slug);
    expect(order.order_snapshot.name).toBe("Garden tools");
    await pages(
      request(
        {
          action: "save",
          slug: product.slug,
          page: {
            ...product,
            bundles: [{ quantity: 1, price: 3000, label: "One" }],
          },
        },
        true
      ),
      capture().response
    );
    const stale = capture();
    await pages(
      request(
        { action: "publish", slug: product.slug, expectedDraft: product },
        true
      ),
      stale.response
    );
    expect(stale.code).toBe(409);
    expect((await sql!`SELECT price FROM atlasio_orders`)[0].price).toBe(2500);
    const flower = capture();
    await pages({ method: "GET", headers: {}, query: {} }, flower.response);
    expect((flower.body.page as typeof DEFAULT_PRODUCT).tracking).toEqual(
      DEFAULT_PRODUCT.tracking
    );
  });
  it("does not substitute the flower product for a missing admin product", async () => {
    const c = capture();
    await pages(
      {
        method: "GET",
        headers: request({}, true).headers,
        query: { mode: "admin", slug: "missing" },
      },
      c.response
    );
    expect(c.code).toBe(404);
  });
  it("protects the flower tracking identity and validates image URLs", () => {
    expect(
      validatePage({
        ...DEFAULT_PRODUCT,
        tracking: { contentId: "wrong", campaignName: "wrong" },
      }).tracking
    ).toEqual(DEFAULT_PRODUCT.tracking);
    expect(() =>
      validatePage({
        ...DEFAULT_PRODUCT,
        images: [{ src: "javascript:alert(1)", alt: "", label: "" }],
      })
    ).toThrow();
  });
  it("drafts do not replace published content and revisions restore drafts", async () => {
    const page = { ...DEFAULT_PRODUCT, headline: "Draft one" },
      c = capture();
    await pages(request({ action: "save", page }, true), c.response);
    expect(c.code).toBe(200);
    const publicRead = capture();
    await pages({ method: "GET", query: {}, headers: {} }, publicRead.response);
    expect((publicRead.body.page as typeof page).headline).toBe(
      DEFAULT_PRODUCT.headline
    );
    await pages(
      request({ action: "publish", slug: page.slug }, true),
      capture().response
    );
    await pages(
      request(
        { action: "save", page: { ...page, headline: "Draft two" } },
        true
      ),
      capture().response
    );
    const read = capture();
    await pages({ method: "GET", query: {}, headers: {} }, read.response);
    expect((read.body.page as typeof page).headline).toBe("Draft one");
    await pages(
      request({ action: "restore", slug: page.slug, revision: 1 }, true),
      capture().response
    );
    expect(
      (await sql!`SELECT draft FROM mv_landing_pages`)[0].draft.headline
    ).toBe("Draft one");
  });
  it("uses signed expiring sessions and rejects tampering", () => {
    const token = issueSession(1000);
    expect(verifySession("mv_session=" + token, 2000)).toBe(true);
    expect(verifySession("mv_session=" + token + "bad", 2000)).toBe(false);
    expect(verifySession("mv_session=" + token, 9 * 3600 * 1000)).toBe(false);
  });
});

describe("Order queues", () => {
  it("applies queue and carrier stage filters in SQL", async () => {
    const a = orderInput(),
      b = orderInput();
    await createOrder(request(a), capture().response, a);
    await createOrder(request(b), capture().response, b);
    await sql!`UPDATE atlasio_orders SET status='shipped',ecotrack_tracking='QUEUE-1',ecotrack_status='vers_wilaya' WHERE lead_id=${a.leadId}`;
    const c = capture();
    await readOrders(
      {
        method: "GET",
        headers: request({}, true).headers,
        query: { queue: "tracking", stage: "vers_wilaya", page: "1" },
      },
      c.response
    );
    expect(c.code).toBe(200);
    expect(c.body.total).toBe(1);
    expect((c.body.orders as Array<{ lead_id: string }>)[0].lead_id).toBe(
      a.leadId
    );
  });
});
