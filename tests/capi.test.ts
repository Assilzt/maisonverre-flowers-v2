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
import { updateContact } from "../backend/handlers/update-contact";
import { settings } from "../backend/handlers/read-settings";
import { updateSettings } from "../backend/handlers/update-settings";
import { persistTracking } from "../backend/services/shipment-sync";
import { flushCapi } from "../backend/jobs/capi";
import {
  buildUserData,
  normalizeMetaPhone,
  sha256,
} from "../backend/integrations/meta/capi";
import { issueSession } from "../backend/auth/session";
import {
  invalidateCapiSettings,
  loadEcoSettings,
  rowById,
  type Request,
  type Response,
} from "../backend/repositories/index";

const TOKEN = "EAABtesttokenvalue1234567890";
const PIXEL = "837444182648161"; // seeded by the baseline migration
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
/** A request from the customer's phone browser. */
const customer = (body: unknown): Request => ({
  method: "POST",
  headers: {
    "x-forwarded-for": "41.100.1.2, 10.0.0.1",
    "user-agent": "Mozilla/5.0 (Linux; Android 14) Customer",
    cookie: "_fbp=fb.1.1700000000000.123456789; theme=light",
  },
  body,
});
/** A request from the shop owner's dashboard. */
const admin = (body: unknown = {}): Request => ({
  method: "PATCH",
  headers: {
    "x-forwarded-for": "105.99.9.9",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0) Admin",
    cookie: "mv_session=" + issueSession(),
  },
  body,
});
const orderInput = (extra: Record<string, unknown> = {}) => ({
  leadId: "AT-" + crypto.randomUUID(),
  leadToken: crypto.randomUUID(),
  status: "complete",
  phone: "0551234567",
  quantity: 3,
  fullName: "Amine Benali",
  wilaya: "05 - باتنة",
  commune: "Batna",
  sourceUrl: "https://shop.test/?fbclid=AbC123",
  ...extra,
});
const events = async () =>
  (await sql!`SELECT event_id,event_name,status,attempts,payload,last_error FROM mv_capi_events ORDER BY event_id`) as Array<{
    event_id: string;
    event_name: string;
    status: string;
    attempts: number;
    payload: Record<string, any> | null;
    last_error: string | null;
  }>;
const setToken = async (value: string) => {
  await db.query(
    "INSERT INTO atlasio_settings(key,value) VALUES('meta_capi_token',$1) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value",
    [value]
  );
  invalidateCapiSettings();
};

beforeAll(async () => {
  vi.stubEnv("DASHBOARD_PASSWORD", "fixture-only-password");
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
  db = await testDatabase();
});
beforeEach(async () => {
  await db.exec(
    "TRUNCATE atlasio_orders,mv_notification_outbox,mv_rate_limits,mv_capi_events RESTART IDENTITY CASCADE"
  );
  await setToken(TOKEN);
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});
afterAll(async () => {
  await db.close();
  vi.unstubAllEnvs();
});

describe("Meta Conversions API", () => {
  it("normalizes and hashes customer data the way Meta expects", () => {
    expect(normalizeMetaPhone("0551234567")).toBe("213551234567");
    expect(normalizeMetaPhone("+213 551 23 45 67")).toBe("213551234567");
    expect(normalizeMetaPhone("12345")).toBeUndefined();
    const data = buildUserData({
      phone: "0551234567",
      full_name: "Amine Benali",
      wilaya: "05 - باتنة",
      commune: "Batna",
    });
    expect(data.ph).toEqual([sha256("213551234567")]);
    expect(data.external_id).toEqual([sha256("213551234567")]);
    expect(data.fn).toEqual([sha256("amine")]);
    expect(data.ln).toEqual([sha256("benali")]);
    expect(data.st).toEqual([sha256("باتنة")]);
    expect(data.ct).toEqual([sha256("batna")]);
    expect(data.country).toEqual([sha256("dz")]);
  });

  it("queues one Lead per draft and one Purchase, with the customer's browser context", async () => {
    const draft = orderInput({ status: "abandoned" });
    await createOrder(customer(draft), capture().response, draft);
    await createOrder(customer(draft), capture().response, draft);
    expect((await events()).map(e => e.event_id)).toEqual([
      "lead." + draft.leadId,
    ]);
    const complete = { ...draft, status: "complete" };
    await createOrder(customer(complete), capture().response, complete);
    const queued = await events();
    expect(queued.map(e => e.event_id)).toEqual([
      "lead." + draft.leadId,
      "purchase." + draft.leadId,
    ]);
    const purchase = queued[1].payload!;
    expect(purchase).toMatchObject({
      event_name: "Purchase",
      action_source: "website",
      event_source_url: "https://shop.test/?fbclid=AbC123",
      custom_data: {
        currency: "DZD",
        value: 3900,
        num_items: 3,
        order_id: draft.leadId,
        content_ids: ["maisonverre-flower-seed-mix"],
      },
    });
    expect(purchase.user_data).toMatchObject({
      client_ip_address: "41.100.1.2",
      client_user_agent: "Mozilla/5.0 (Linux; Android 14) Customer",
      fbp: "fb.1.1700000000000.123456789",
    });
    expect(purchase.user_data.fbc).toMatch(/^fb\.1\.\d+\.AbC123$/);
  });

  it("queues nothing and stores no browser context without a token", async () => {
    await setToken("");
    const body = orderInput();
    await createOrder(customer(body), capture().response, body);
    expect(await events()).toHaveLength(0);
    const [row] = await sql!`SELECT meta_context FROM atlasio_orders`;
    expect(row.meta_context).toBeNull();
  });

  it("sends each event to the Graph API and clears the stored payload", async () => {
    const body = orderInput();
    await createOrder(customer(body), capture().response, body);
    const fetchMock = vi.fn(async () => Response.json({ events_received: 1 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    expect(await flushCapi()).toEqual({ sent: 2, failed: 0 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe(`https://graph.facebook.com/v25.0/${PIXEL}/events`);
    expect(url).not.toContain(TOKEN);
    const sent = JSON.parse(String(init.body));
    expect(sent.access_token).toBe(TOKEN);
    expect(sent.data).toHaveLength(1);
    expect(sent.data[0].event_id).toMatch(/^(lead|purchase)\.AT-/);
    for (const event of await events()) {
      expect(event.status).toBe("sent");
      expect(event.payload).toBeNull();
    }
  });

  it("retries when Meta is down and stops on a permanent rejection", async () => {
    const body = orderInput();
    await createOrder(customer(body), capture().response, body);
    globalThis.fetch = (async () =>
      Response.json({}, { status: 500 })) as unknown as typeof fetch;
    await flushCapi();
    for (const event of await events()) {
      expect(event).toMatchObject({ status: "pending", attempts: 1 });
      expect(event.payload).not.toBeNull();
    }
    await sql!`UPDATE mv_capi_events SET available_at=NOW()`;
    globalThis.fetch = (async () =>
      Response.json(
        { error: { message: `Invalid OAuth access token ${TOKEN}` } },
        { status: 400 }
      )) as unknown as typeof fetch;
    await flushCapi();
    for (const event of await events()) {
      expect(event.status).toBe("failed");
      expect(event.last_error).not.toContain(TOKEN);
    }
  });

  it("never returns the token from the settings API", async () => {
    const read = capture();
    await settings(admin(), read.response, await loadEcoSettings());
    expect(read.body.capiConfigured).toBe(true);
    expect(JSON.stringify(read.body)).not.toContain(TOKEN);
    const saved = capture();
    await updateSettings(
      admin(),
      saved.response,
      {
        capiToken: "EAABanothertokenvalue0987654321",
        testEventCode: "TEST123",
      },
      await loadEcoSettings()
    );
    expect(saved.code).toBe(200);
    expect(saved.body).toMatchObject({
      capiConfigured: true,
      testEventCode: "TEST123",
    });
    expect(JSON.stringify(saved.body)).not.toContain("EAABanother");
  });

  it("sends OrderConfirmed once, with the customer's context and not the admin's", async () => {
    const body = orderInput();
    await createOrder(customer(body), capture().response, body);
    const [{ id }] = await sql!`SELECT id FROM atlasio_orders`;
    const confirm = { id, result: "confirmed" };
    const ecoSettings = await loadEcoSettings();
    await updateContact(
      admin(confirm),
      capture().response,
      confirm,
      ecoSettings
    );
    await updateContact(
      admin(confirm),
      capture().response,
      confirm,
      ecoSettings
    );
    const confirmed = (await events()).filter(
      e => e.event_name === "OrderConfirmed"
    );
    expect(confirmed).toHaveLength(1);
    expect(confirmed[0].event_id).toBe("confirmed." + body.leadId);
    expect(confirmed[0].payload!.user_data).toMatchObject({
      client_ip_address: "41.100.1.2",
      client_user_agent: "Mozilla/5.0 (Linux; Android 14) Customer",
    });
  });

  it("sends OrderDelivered once when the parcel is first delivered and drops the saved context", async () => {
    const body = orderInput();
    await createOrder(customer(body), capture().response, body);
    const [{ id }] = await sql!`SELECT id FROM atlasio_orders`;
    await sql!`UPDATE atlasio_orders SET status='shipped',ecotrack_tracking='TRK-1' WHERE id=${id}`;
    const delivered = { status: "livre_non_encaisse", activity: [] };
    await persistTracking((await rowById(id))!, delivered);
    await persistTracking((await rowById(id))!, delivered);
    const sent = (await events()).filter(
      e => e.event_name === "OrderDelivered"
    );
    expect(sent.map(e => e.event_id)).toEqual(["delivered." + body.leadId]);
    expect(sent[0].payload!.user_data.client_ip_address).toBe("41.100.1.2");
    const [row] = await sql!`SELECT status,meta_context FROM atlasio_orders`;
    expect(row).toMatchObject({ status: "delivered", meta_context: null });
  });
});
