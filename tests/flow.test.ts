import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { testDatabase } from "./database";
import { sql } from "../backend/repositories/connection";
import { createOrder } from "../backend/handlers/create";
import { updateOrders } from "../backend/handlers/update";
import { issueSession } from "../backend/auth/session";
import { allowedActions, orderStage, canTrash } from "../shared/order-flow";
import media from "../api/media";
import type { Request, Response } from "../backend/http/contracts";

let db: Awaited<ReturnType<typeof testDatabase>>;
function capture() {
  let code = 200,
    body: unknown = {},
    sent: unknown;
  const headers: Record<string, string> = {};
  const response: Response = {
    status(n) {
      code = n;
      return this;
    },
    json(value) {
      body = value;
    },
    setHeader(name, value) {
      headers[name] = value;
    },
    send(value) {
      sent = value;
    },
  };
  return {
    response,
    headers,
    get code() {
      return code;
    },
    get body() {
      return body as Record<string, any>;
    },
    get sent() {
      return sent;
    },
  };
}
const admin = (body: unknown, method = "PATCH"): Request => ({
  method,
  headers: { cookie: "mv_session=" + issueSession() },
  body,
});
const patch = async (body: Record<string, unknown>) => {
  const c = capture();
  await updateOrders(admin(body), c.response, body);
  return c;
};
const newOrder = async (extra: Record<string, unknown> = {}) => {
  const body = {
    leadId: "AT-" + crypto.randomUUID(),
    leadToken: crypto.randomUUID(),
    status: "complete",
    phone: "0551234567",
    quantity: 3,
    fullName: "Flow test",
    wilaya: "05 - باتنة",
    commune: "Batna",
    ...extra,
  };
  await createOrder(
    { method: "POST", headers: {}, body },
    capture().response,
    body
  );
  const [row] =
    await sql!`SELECT id,status FROM atlasio_orders WHERE lead_id=${body.leadId}`;
  return row as { id: number; status: string };
};

beforeAll(async () => {
  vi.stubEnv("DASHBOARD_PASSWORD", "fixture-only-password");
  vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
  db = await testDatabase();
});
beforeEach(async () => {
  await db.exec(
    "TRUNCATE atlasio_orders,mv_notification_outbox,mv_rate_limits,mv_media RESTART IDENTITY CASCADE"
  );
});
afterAll(async () => {
  await db.close();
  vi.unstubAllEnvs();
});

describe("order flow", () => {
  it("offers only the next sensible steps", () => {
    expect(allowedActions({ status: "complete", phone: "0551234567" })).toEqual(
      ["confirm", "no_answer", "busy", "call_later", "wrong_number", "refused"]
    );
    expect(allowedActions({ status: "abandoned", phone: "055" })).not.toContain(
      "confirm"
    );
    expect(allowedActions({ status: "confirmed" })).toEqual([
      "ship",
      "unconfirm",
      "cancel",
    ]);
    expect(allowedActions({ status: "cancelled" })).toEqual(["reopen"]);
    expect(
      allowedActions({ status: "shipped", ecotrack_tracking: "T1" })
    ).toEqual([]);
    expect(allowedActions({ status: "delivered" })).toEqual([]);
    expect(orderStage({ status: "confirmed" })).toEqual({ step: 1 });
    expect(orderStage({ status: "cancelled" }).ended).toBe("cancelled");
    expect(canTrash({ status: "shipped", ecotrack_tracking: "T1" })).toBe(
      false
    );
  });

  it("moves an order step by step and refuses jumps", async () => {
    const order = await newOrder();
    expect((await patch({ id: order.id, status: "complete" })).code).toBe(409);
    expect(
      (await patch({ action: "contact", id: order.id, result: "confirmed" }))
        .code
    ).toBe(200);
    expect(
      (await patch({ action: "contact", id: order.id, result: "busy" })).code
    ).toBe(409);
    expect((await patch({ id: order.id, status: "complete" })).code).toBe(200);
    expect((await patch({ id: order.id, status: "confirmed" })).code).toBe(200);
    expect((await patch({ id: order.id, status: "cancelled" })).code).toBe(200);
    expect((await patch({ id: order.id, status: "confirmed" })).code).toBe(409);
    const reopened = await patch({ id: order.id, status: "complete" });
    expect(reopened.code).toBe(200);
    expect(reopened.body.order.status).toBe("complete");
  });

  it("will not confirm an order with an incomplete phone", async () => {
    const order = await newOrder({ status: "abandoned", phone: "055" });
    const c = await patch({
      action: "contact",
      id: order.id,
      result: "confirmed",
    });
    expect(c.code).toBe(409);
  });

  it("will not trash an order whose parcel is on its way", async () => {
    const order = await newOrder();
    await sql!`UPDATE atlasio_orders SET status='shipped',ecotrack_tracking='T-9' WHERE id=${order.id}`;
    expect((await patch({ action: "trash", id: order.id })).code).toBe(409);
  });
});

describe("repeated phone numbers", () => {
  it("saves a second order from the same phone within a day and flags it", async () => {
    const first = await newOrder();
    const second = await newOrder();
    const rows =
      await sql!`SELECT id,order_snapshot FROM atlasio_orders ORDER BY id`;
    expect(rows).toHaveLength(2);
    expect(rows[0].order_snapshot.duplicateOf).toBeUndefined();
    expect(rows[1].order_snapshot.duplicateOf).toMatch(/^AT-/);
    expect(first.id).not.toBe(second.id);
  });
});

describe("image upload", () => {
  const png =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  it("stores an image once and serves it with a long cache", async () => {
    const up = capture();
    await media(admin({ type: "image/png", data: png }, "POST"), up.response);
    expect(up.code).toBe(200);
    expect(up.body.src).toMatch(/^\/api\/media\?id=[a-f0-9]{24}$/);
    const again = capture();
    await media(
      admin({ type: "image/png", data: png }, "POST"),
      again.response
    );
    expect(again.body.src).toBe(up.body.src);
    const get = capture();
    await media(
      {
        method: "GET",
        headers: {},
        query: { id: up.body.src.split("=")[1] },
      },
      get.response
    );
    expect(get.code).toBe(200);
    expect(get.headers["Content-Type"]).toBe("image/png");
    expect(get.headers["Cache-Control"]).toContain("immutable");
    expect(Buffer.isBuffer(get.sent)).toBe(true);
  });
  it("rejects uploads from visitors and files that are not images", async () => {
    const visitor = capture();
    await media(
      { method: "POST", headers: {}, body: { type: "image/png", data: png } },
      visitor.response
    );
    expect(visitor.code).toBe(401);
    const bad = capture();
    await media(admin({ type: "text/html", data: png }, "POST"), bad.response);
    expect(bad.code).toBe(400);
  });
});
