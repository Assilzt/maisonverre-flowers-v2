import { consumeBudget } from "../../services/rate-limit.js";
import { createHash } from "node:crypto";
import { EcoTrackSettings } from "./types.js";
import { OSEN_COMPAT_BASE, OSEN_ORIGIN, osenHeaders } from "../osen/config.js";

export const envProvider = process.env.ECOTRACK_PROVIDER || "navexdelivery";

export const envToken = process.env.ECOTRACK_API_TOKEN || "";

export const getConfig = (settings?: EcoTrackSettings) => ({
  kind: settings?.kind || "ecotrack",
  provider: String(settings?.provider || envProvider).trim(),
  token: String(settings?.token || envToken).trim(),
});

export const getHeaders = (settings?: EcoTrackSettings) => {
  if (settings?.kind === "osen") return osenHeaders(settings);
  const { token } = getConfig(settings);
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

export const getBaseUrl = (settings?: EcoTrackSettings) => {
  if (settings?.kind === "osen") {
    osenHeaders(settings);
    return OSEN_COMPAT_BASE;
  }
  if (settings?.kind && settings.kind !== "ecotrack")
    throw new Error("نوع تكامل شركة التوصيل غير معروف");
  const provider = getConfig(settings).provider;
  if (!/^[a-z0-9-]+$/.test(provider))
    throw new Error("Invalid EcoTrack subdomain");
  return `https://${provider}.ecotrack.dz/api/v1`;
};

export const ensureToken = (settings?: EcoTrackSettings) => {
  if (settings?.kind === "osen") {
    osenHeaders(settings);
    return;
  }
  if (!getConfig(settings).token)
    throw new Error("ECOTRACK_API_TOKEN غير مضبوط في إعدادات لوحة التحكم");
};

// A timed-out mutation may already have reached EcoTrack. Never retry it here.
export class EcoTrackRejectedError extends Error {}
export const ecoFetch: typeof fetch = async (input, init) => {
  const osen = new URL(String(input)).origin === OSEN_ORIGIN;
  const brand = osen ? "Osen Express" : "EcoTrack";
  const account = createHash("sha256")
    .update(
      String(new Headers(init?.headers).get("Authorization") || "") +
        new URL(String(input)).host
    )
    .digest("hex");
  await consumeBudget("eco:" + account, 45, 60);
  await consumeBudget("eco:" + account, 450, 3600);
  await consumeBudget(osen ? "osen:global" : "eco:global", 45, 60);
  await consumeBudget(osen ? "osen:global" : "eco:global", 450, 3600);
  const response = await fetch(input, {
    ...init,
    redirect: "error",
    signal: init?.signal ?? AbortSignal.timeout(15_000),
  });
  if (response.status === 429) {
    throw new EcoTrackRejectedError(
      `${brand} rate limit (429); retry after ${response.headers.get("retry-after") || "the provider limit resets"}`
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
        `${brand} رفض العملية؛ تحقق من صلاحية الحساب وبيانات الطلب`
      );
    }
  }
  return response;
};
