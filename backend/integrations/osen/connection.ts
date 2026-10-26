import { OSEN_ORIGIN, osenHeaders, type OsenIdentity } from "./config.js";
import { consumeBudget } from "../../services/rate-limit.js";
import { createHash } from "node:crypto";
export async function validateOsenConnection(settings: OsenIdentity) {
  osenHeaders(settings);
  const account = createHash("sha256")
    .update(settings.merchantId || "")
    .digest("hex");
  await consumeBudget("osen-auth:" + account, 10, 60);
  const response = await fetch(OSEN_ORIGIN + "/v2/ecomanager/auth/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_id: settings.merchantId,
      api_token: settings.token,
    }),
    signal: AbortSignal.timeout(15_000),
    redirect: "error",
  });
  if (!response.ok) throw new Error("تعذر التحقق من اتصال Osen Express");
  const data = (await response.json()) as {
    valid?: boolean;
    scope?: string;
    user_id?: string;
    store?: { id?: string } | null;
  };
  // A token for a different store must never silently operate this account.
  return (
    data.valid === true &&
    data.scope === "MERCHANT" &&
    data.user_id === settings.merchantId &&
    data.store?.id === settings.storeId
  );
}
