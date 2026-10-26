import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import {
  ORIGIN,
  credentials,
  requestJson,
  runReadOnlyCheck,
} from "./read-only-check.mjs";
import { buildContract } from "./refresh-contract.mjs";

const env = {
  OSEN_API_TOKEN: "fake-token-for-tests",
  OSEN_MERCHANT_ID: "merchant-fixture",
  OSEN_STORE_ID: "store-fixture",
};
const auth = {
  valid: true,
  scope: "MERCHANT",
  user_id: env.OSEN_MERCHANT_ID,
  store: { id: env.OSEN_STORE_ID },
};
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function fixture(overrides = {}) {
  const calls = [];
  const data = {
    "/v2/ecomanager/auth/validate": auth,
    "/api/v1/get/wilayas": [{ wilaya_id: 1, wilaya_name: "Fixture" }],
    "/api/v1/get/communes": { 1001: { nom: "Fixture commune" } },
    "/api/v1/get/fees": {
      livraison: [{ wilaya_id: 1, tarif: "100", tarif_stopdesk: "0" }],
    },
    "/api/v1/get/products/list": { products: [], pagination: { total: 0 } },
    ...overrides,
  };
  return {
    calls,
    fetchImpl: async (url, options) => {
      calls.push({ url: new URL(url), options });
      assert.ok(
        Object.hasOwn(data, new URL(url).pathname),
        "Unexpected endpoint"
      );
      return json(data[new URL(url).pathname]);
    },
  };
}

test("read-only workflow binds merchant/store and reports empty stock accurately", async () => {
  const f = fixture();
  const result = await runReadOnlyCheck(env, f.fetchImpl);
  assert.deepEqual(result, {
    authenticated: true,
    identityMatched: true,
    wilayas: 1,
    sampleCommuneRows: 1,
    feeRows: 1,
    stockFirstPageRows: 0,
    stockTotal: 0,
    shipmentWrites: 0,
  });
  assert.equal(f.calls.length, 5);
  for (const { url, options } of f.calls) {
    assert.equal(url.origin, ORIGIN);
    assert.equal(options.redirect, "error");
    assert.ok(!url.href.includes(env.OSEN_API_TOKEN));
    if (url.pathname.endsWith("/auth/validate")) {
      assert.equal(options.method, "POST");
      assert.deepEqual(JSON.parse(options.body), {
        api_id: env.OSEN_MERCHANT_ID,
        api_token: env.OSEN_API_TOKEN,
      });
      assert.equal(options.headers.Authorization, undefined);
    } else {
      assert.equal(options.method, "GET");
      assert.equal(options.body, undefined);
      assert.equal(
        options.headers.Authorization,
        "Bearer " + env.OSEN_API_TOKEN
      );
      assert.equal(options.headers["X-Api-Id"], env.OSEN_MERCHANT_ID);
    }
  }
  assert.ok(!JSON.stringify(result).includes(env.OSEN_API_TOKEN));
});

for (const [name, value] of Object.entries({
  invalid: { ...auth, valid: false },
  merchant: { ...auth, user_id: "other-merchant" },
  store: { ...auth, store: { id: "other-store" } },
  partner: { ...auth, scope: "PARTNER", store: null },
})) {
  test(
    "stops all subsequent reads on " + name + " identity failure",
    async () => {
      const f = fixture({ "/v2/ecomanager/auth/validate": value });
      await assert.rejects(
        runReadOnlyCheck(env, f.fetchImpl),
        /Authentication failed/
      );
      assert.equal(f.calls.length, 1);
    }
  );
}

test("missing or malformed credentials fail before network activity", async () => {
  let calls = 0;
  const fake = () => {
    calls++;
    throw new Error("should not run");
  };
  await assert.rejects(runReadOnlyCheck({}, fake), /private environment file/);
  await assert.rejects(
    runReadOnlyCheck({ ...env, OSEN_STORE_ID: "bad host/" }, fake),
    /format/
  );
  assert.equal(calls, 0);
  assert.equal(
    credentials({ ...env, OSEN_API_TOKEN: " fake-token-for-tests " }).token,
    env.OSEN_API_TOKEN
  );
});

test("rejects external origins and shipment/account mutations before fetch", async () => {
  let calls = 0;
  const fetchImpl = () => {
    calls++;
    throw new Error("should not run");
  };
  for (const [route, method] of [
    ["https://example.com/api/v1/get/wilayas", "GET"],
    ["//example.com/api/v1/get/wilayas", "GET"],
    ["/api/v1/create/order", "POST"],
    ["/v2/ecomanager/orders", "POST"],
    ["/api/v1/delete/order", "DELETE"],
    ["/api/v1/get/fees", "POST"],
  ]) {
    await assert.rejects(
      requestJson(route, { method, identity: credentials(env), fetchImpl }),
      /only permits/
    );
  }
  assert.equal(calls, 0);
});

test("does not retry or leak a token when transport fails", async () => {
  let calls = 0;
  await assert.rejects(
    requestJson("/api/v1/get/wilayas", {
      identity: credentials(env),
      fetchImpl: async () => {
        calls++;
        throw new Error("unsafe " + env.OSEN_API_TOKEN);
      },
    }),
    error =>
      !error.message.includes(env.OSEN_API_TOKEN) &&
      /did not complete/.test(error.message)
  );
  assert.equal(calls, 1);
});

test("treats 429 as a failure without retrying", async () => {
  let calls = 0;
  await assert.rejects(
    requestJson("/api/v1/get/wilayas", {
      identity: credentials(env),
      fetchImpl: async () => {
        calls++;
        return json({}, 429);
      },
    }),
    /429.*no automatic retry/
  );
  assert.equal(calls, 1);
});

test("rejects business failure inside HTTP 200", async () => {
  const f = fixture({
    "/api/v1/get/fees": { success: false, error: "fixture" },
  });
  await assert.rejects(runReadOnlyCheck(env, f.fetchImpl), /rejected/);
  assert.equal(f.calls.length, 4);
});

test("rejects non-JSON and malformed stock responses without reporting success", async () => {
  await assert.rejects(
    requestJson("/api/v1/get/fees", {
      identity: credentials(env),
      fetchImpl: async () => new Response("<html>error</html>"),
    }),
    /unreadable JSON/
  );
  const f = fixture({
    "/api/v1/get/products/list": { products: {}, pagination: { total: 99 } },
  });
  await assert.rejects(runReadOnlyCheck(env, f.fetchImpl), /products array/);
});

function publicSchema() {
  return {
    openapi: "3.0.0",
    info: { version: "fixture" },
    paths: {
      "/api/v1/create/order": {
        post: {
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Fixture" },
                },
              },
            },
          },
        },
      },
      "/v2/ecomanager/auth/validate": {
        post: {
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Missing" },
                },
              },
            },
          },
        },
      },
      "/api/v1/internal/pubsub/sms": { post: { responses: { 200: {} } } },
      "/staff/payments": { get: { responses: { 200: {} } } },
    },
    components: {
      schemas: {
        Fixture: {
          type: "object",
          description: "Upstream prose",
          properties: {
            description: { type: "string", example: "customer example" },
            nested: { $ref: "#/components/schemas/Nested" },
          },
          example: { description: "private example" },
        },
        Nested: { type: "string", description: "More prose" },
      },
    },
  };
}

test("curated extraction excludes internal APIs and removes upstream examples", () => {
  const result = buildContract(publicSchema(), "2026-01-01T00:00:00.000Z");
  assert.equal(result.operations.length, 2);
  assert.equal(result.schemas.Fixture.description, undefined);
  assert.deepEqual(result.schemas.Fixture.properties.description, {
    type: "string",
  });
  assert.equal(result.schemas.Fixture.example, undefined);
  assert.equal(result.schemas.Nested.type, "string");
  assert.deepEqual(result.unresolvedSchemaRefs, ["Missing"]);
  assert.equal(result.source.sha256.length, 64);
});

test("rejects a changed or unrelated upstream contract", () => {
  assert.throws(() => buildContract({ paths: {} }), /not an OpenAPI/);
  assert.throws(
    () => buildContract({ openapi: "3.0.0", paths: {} }),
    /Expected Osen merchant/
  );
});

test("bundled snapshot contains the chosen merchant contracts and records every unresolved ref", async () => {
  const data = JSON.parse(
    await readFile(
      new URL("../references/contract-index.json", import.meta.url),
      "utf8"
    )
  );
  assert.equal(data.source.url, ORIGIN + "/api-json");
  assert.ok(!Number.isNaN(Date.parse(data.source.retrievedAt)));
  assert.ok(
    data.operations.some(
      o =>
        o.path === "/v2/ecomanager/orders" &&
        o.method === "POST" &&
        o.requestBody.content["application/json"].schema.oneOf.length === 2
    )
  );
  assert.ok(!data.operations.some(o => o.path.includes("/internal/")));
  const refs = new Set();
  function walk(value) {
    if (value && typeof value === "object") {
      if (value.$ref?.startsWith("#/components/schemas/"))
        refs.add(value.$ref.split("/").at(-1));
      Object.values(value).forEach(walk);
    }
  }
  walk(data.operations);
  walk(data.schemas);
  assert.deepEqual(
    [...refs].filter(r => !Object.hasOwn(data.schemas, r)).sort(),
    data.unresolvedSchemaRefs
  );
});

test("distributed guides and AI entrypoint have resolvable local Markdown links", async () => {
  for (const file of [
    "../SKILL.md",
    "../README.md",
    "../references/api-contract.md",
    "../references/integration-notes.md",
  ]) {
    const base = new URL(file, import.meta.url);
    const content = await readFile(base, "utf8");
    for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^(https?:|#)/.test(match[1])) continue;
      assert.ok(
        (await stat(new URL(match[1], base))).isFile(),
        "Missing linked resource: " + match[1]
      );
    }
  }
});
