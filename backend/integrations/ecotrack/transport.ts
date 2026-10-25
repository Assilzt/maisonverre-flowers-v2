import { consumeBudget } from "../../services/rate-limit.js";
import { createHash } from "node:crypto";
import { EcoTrackSettings } from "./types.js";

export const envProvider = process.env.ECOTRACK_PROVIDER || "navexdelivery";

export const envToken = process.env.ECOTRACK_API_TOKEN || "";

export const getConfig = (settings?: EcoTrackSettings) => ({
  provider: String(settings?.provider || envProvider).trim(),
  token: String(settings?.token || envToken).trim(),
});

export const getHeaders = (settings?: EcoTrackSettings) => {
  const { token } = getConfig(settings);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const getBaseUrl = (settings?: EcoTrackSettings) => {
  const provider = getConfig(settings).provider;
  if (!/^[a-z0-9-]+$/.test(provider))
    throw new Error("Invalid EcoTrack subdomain");
  return `https://${provider}.ecotrack.dz/api/v1`;
};

export const ensureToken = (settings?: EcoTrackSettings) => {
  if (!getConfig(settings).token)
    throw new Error("ECOTRACK_API_TOKEN غير مضبوط في إعدادات لوحة التحكم");
};

// A timed-out mutation may already have reached EcoTrack. Never retry it here.
export class EcoTrackRejectedError extends Error {}
export const ecoFetch: typeof fetch = async (input, init) => {
  const account = createHash("sha256")
    .update(
      String(new Headers(init?.headers).get("Authorization") || "") +
        new URL(String(input)).host
    )
    .digest("hex");
  await consumeBudget("eco:" + account, 45, 60);
  await consumeBudget("eco:" + account, 450, 3600);
  await consumeBudget("eco:global", 45, 60);
  await consumeBudget("eco:global", 450, 3600);
  const response = await fetch(input, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  if (response.status === 429) {
    throw new EcoTrackRejectedError(
      `EcoTrack rate limit (429); retry after ${response.headers.get("retry-after") || "the provider limit resets"}`
    );
  }
  // Some provider operations report a rejected request in a HTTP 200 body.
  if (response.ok && response.headers.get("content-type")?.includes("json")) {
    const body = (await response
      .clone()
      .json()
      .catch(() => null)) as Record<string, unknown> | null;
    if (body?.success === false || body?.errors) {
      throw new EcoTrackRejectedError(
        "EcoTrack رفض العملية؛ تحقق من صلاحية الحساب وبيانات الطلب"
      );
    }
  }
  return response;
};
