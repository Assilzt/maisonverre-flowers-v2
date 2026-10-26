import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";

export const SCHEMA_URL = "https://backendmain.osenexpress.com/api-json";
const supportedMethods = new Set(["get", "post", "put", "patch", "delete"]);
const compatibilityPaths = new Set([
  "/api/v1",
  "/api/v1/validate/token",
  "/api/v1/get/wilayas",
  "/api/v1/get/communes",
  "/api/v1/get/fees",
  "/api/v1/create/order",
  "/api/v1/create/orders",
  "/api/v1/update/order",
  "/api/v1/delete/order",
  "/api/v1/valid/order",
  "/api/v1/valid/returns",
  "/api/v1/get/order/label",
  "/api/v1/add/maj",
  "/api/v1/get/maj",
  "/api/v1/ask/for/order/return",
  "/api/v1/get/tracking/info",
  "/api/v1/get/trackings/info",
  "/api/v1/get/orders",
  "/api/v1/get/orders/status",
  "/api/v1/get/products/list",
]);
const ecoManagerPaths = new Set([
  "/v2/ecomanager/auth/validate",
  "/v2/ecomanager/orders",
  "/v2/ecomanager/orders/confirm",
  "/v2/ecomanager/orders/labels",
  "/v2/ecomanager/communes",
  "/v2/ecomanager/wilayas",
]);
const removedFields = new Set([
  "description",
  "example",
  "examples",
  "externalDocs",
  "default",
]);
function structural(value, propertyMap = false) {
  if (Array.isArray(value)) return value.map(item => structural(item));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => propertyMap || !removedFields.has(key))
        .map(([key, item]) => [key, structural(item, key === "properties")])
    );
  return value;
}
function references(value, found = new Set()) {
  if (!value || typeof value !== "object") return found;
  if (
    typeof value.$ref === "string" &&
    value.$ref.startsWith("#/components/schemas/")
  )
    found.add(value.$ref.slice("#/components/schemas/".length));
  for (const item of Object.values(value)) references(item, found);
  return found;
}
export function buildContract(schema, retrievedAt = new Date().toISOString()) {
  if (!schema.openapi || !schema.paths)
    throw new Error("The official response is not an OpenAPI document.");
  const operations = [];
  for (const [route, item] of Object.entries(schema.paths)) {
    if (!(
      compatibilityPaths.has(route) ||
      ecoManagerPaths.has(route) ||
      route === "/v1/users/auth/customers/validate-token"
    ))
      continue;
    for (const [method, operation] of Object.entries(item)) {
      if (!supportedMethods.has(method)) continue;
      operations.push({
        method: method.toUpperCase(),
        path: route,
        operationId: operation.operationId || null,
        parameters: structural([
          ...(item.parameters || []),
          ...(operation.parameters || []),
        ]),
        requestBody: operation.requestBody
          ? structural(operation.requestBody)
          : null,
        responses: structural(operation.responses || {}),
        security: structural(operation.security || schema.security || []),
      });
    }
  }
  if (
    !operations.some(o => o.path === "/api/v1/create/order") ||
    !operations.some(o => o.path === "/v2/ecomanager/auth/validate")
  )
    throw new Error(
      "Expected Osen merchant contracts were not present. Review the upstream API before updating."
    );
  const names = [...references(operations)],
    schemas = Object.create(null),
    missing = [];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (Object.hasOwn(schemas, name) || missing.includes(name)) continue;
    const entry = schema.components?.schemas?.[name];
    if (!entry) {
      missing.push(name);
      continue;
    }
    schemas[name] = structural(entry);
    for (const ref of references(schemas[name]))
      if (!names.includes(ref)) names.push(ref);
  }
  return {
    formatVersion: 1,
    source: {
      url: SCHEMA_URL,
      swagger: "https://backendmain.osenexpress.com/api",
      retrievedAt,
      openapi: schema.openapi,
      apiVersion: schema.info?.version || null,
      sha256: createHash("sha256").update(JSON.stringify(schema)).digest("hex"),
    },
    scope:
      "Osen merchant compatibility and EcoManager v2 contracts only; structural facts, no upstream examples or private data.",
    operations,
    schemas,
    unresolvedSchemaRefs: missing.sort(),
    knownGaps: [
      "The compatibility create/update request parameter schemas are not complete in the upstream document.",
      "The compatibility return-receipt trackings query is typed as a string without a documented list encoding.",
      "CreateOrderDto.items references OrderItemDto, whose current schema describes a full internal order instead of the title/quantity/sku items shown in the official operation example. Confirm the intended input before generating a client.",
      "The custom webhook signature/header and receiving payload contract are not specified by this subset.",
    ],
  };
}
export async function main(args = process.argv.slice(2)) {
  if (args.includes("--help")) {
    console.log(
      "Usage: node scripts/refresh-contract.mjs [--write]\nFetches only the public official OpenAPI. No credential is used."
    );
    return;
  }
  if (args.some(arg => arg !== "--write"))
    throw new Error("Unsupported argument. Use --help.");
  const response = await fetch(SCHEMA_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!response.ok)
    throw new Error("OpenAPI fetch failed with HTTP " + response.status);
  const contract = buildContract(await response.json());
  if (args.includes("--write"))
    await writeFile(
      new URL("../references/contract-index.json", import.meta.url),
      JSON.stringify(contract, null, 2) + "\n"
    );
  console.log(
    JSON.stringify(
      {
        source: SCHEMA_URL,
        operations: contract.operations.length,
        schemas: Object.keys(contract.schemas).length,
        unresolvedSchemaRefs: contract.unresolvedSchemaRefs,
        written: args.includes("--write"),
      },
      null,
      2
    )
  );
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
)
  main().catch(() => {
    console.error(
      "Could not fetch or save the public Osen contract. Check connectivity, the official schema and the output file."
    );
    process.exitCode = 1;
  });
