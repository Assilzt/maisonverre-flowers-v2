import { pathToFileURL } from "node:url";
import path from "node:path";

export const ORIGIN = "https://backendmain.osenexpress.com";
const allowedGets = new Set([
  "/api/v1/get/wilayas",
  "/api/v1/get/communes",
  "/api/v1/get/fees",
  "/api/v1/get/products/list",
]);
export function credentials(env) {
  const token = env.OSEN_API_TOKEN?.trim(),
    merchantId = env.OSEN_MERCHANT_ID?.trim(),
    storeId = env.OSEN_STORE_ID?.trim();
  if (!token || !merchantId || !storeId)
    throw new Error(
      "Set OSEN_API_TOKEN, OSEN_MERCHANT_ID and OSEN_STORE_ID in a private environment file."
    );
  if (
    !/^[A-Za-z0-9_-]{8,128}$/.test(merchantId) ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(storeId)
  )
    throw new Error("Merchant/store identifier format is invalid.");
  return { token, merchantId, storeId };
}
export async function requestJson(
  route,
  { identity, method = "GET", body, fetchImpl = fetch }
) {
  const url = new URL(route, ORIGIN);
  const authentication =
    method === "POST" && url.pathname === "/v2/ecomanager/auth/validate";
  if (
    url.origin !== ORIGIN ||
    !(authentication || (method === "GET" && allowedGets.has(url.pathname)))
  )
    throw new Error(
      "This helper only permits its fixed read-only Osen operations."
    );
  const headers = authentication
    ? { "Content-Type": "application/json" }
    : {
        Accept: "application/json",
        Authorization: "Bearer " + identity.token,
        "X-Api-Id": identity.merchantId,
      };
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers,
      body: authentication ? JSON.stringify(body) : undefined,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "Osen request did not complete. No mutation retry was attempted."
    );
  }
  if (!response.ok)
    throw new Error(
      "Osen returned HTTP " +
        response.status +
        (response.status === 429 ? " (rate limited; no automatic retry)." : ".")
    );
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Osen returned an unreadable JSON response.");
  }
  if (data?.success === false || data?.errors)
    throw new Error("Osen rejected the request in its JSON response.");
  return data;
}
export async function runReadOnlyCheck(env = process.env, fetchImpl = fetch) {
  const identity = credentials(env);
  const auth = await requestJson("/v2/ecomanager/auth/validate", {
    identity,
    fetchImpl,
    method: "POST",
    body: { api_id: identity.merchantId, api_token: identity.token },
  });
  if (
    auth.valid !== true ||
    auth.scope !== "MERCHANT" ||
    auth.user_id !== identity.merchantId ||
    auth.store?.id !== identity.storeId
  )
    throw new Error(
      "Authentication failed or merchant/store identity did not match the expected MERCHANT scope."
    );
  const wilayas = await requestJson("/api/v1/get/wilayas", {
    identity,
    fetchImpl,
  });
  if (!Array.isArray(wilayas))
    throw new Error(
      "The wilaya response did not match the documented array contract."
    );
  const sample = wilayas[0]?.wilaya_id;
  let communeCount = 0;
  if (sample !== undefined) {
    const communes = await requestJson(
      "/api/v1/get/communes?wilaya_id=" + encodeURIComponent(String(sample)),
      { identity, fetchImpl }
    );
    if (!communes || typeof communes !== "object")
      throw new Error(
        "The commune response did not match the documented collection contract."
      );
    communeCount = Object.values(communes).filter(
      c => c && typeof c === "object" && typeof c.nom === "string"
    ).length;
  }
  const fees = await requestJson("/api/v1/get/fees", { identity, fetchImpl });
  if (!Array.isArray(fees?.livraison))
    throw new Error(
      "The fee response did not contain the documented livraison array."
    );
  const stock = await requestJson("/api/v1/get/products/list?page=1", {
    identity,
    fetchImpl,
  });
  if (!Array.isArray(stock?.products))
    throw new Error(
      "The stock response did not contain the documented products array."
    );
  return {
    authenticated: true,
    identityMatched: true,
    wilayas: wilayas.length,
    sampleCommuneRows: communeCount,
    feeRows: fees.livraison.length,
    stockFirstPageRows: stock.products.length,
    stockTotal: stock.pagination?.total ?? null,
    shipmentWrites: 0,
  };
}
export async function main(args = process.argv.slice(2)) {
  if (args.includes("--help")) {
    console.log(
      "Usage: node --env-file=/private/osen.env scripts/read-only-check.mjs\nRequired variables: OSEN_API_TOKEN, OSEN_MERCHANT_ID, OSEN_STORE_ID.\nValidates identity and reads locations, fees and stock page 1. No shipment or settings writes."
    );
    return;
  }
  if (args.length)
    throw new Error(
      "This helper accepts no credentials or endpoint overrides as command-line arguments. Use --help."
    );
  console.log(JSON.stringify(await runReadOnlyCheck(), null, 2));
}
if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
)
  main().catch(error => {
    const message = String(error?.message || "Read-only check failed.");
    console.error(
      message.replaceAll(process.env.OSEN_API_TOKEN || "\u0000", "[REDACTED]")
    );
    process.exitCode = 1;
  });
