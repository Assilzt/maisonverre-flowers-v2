import { createHash } from "node:crypto";
import type { Request } from "../../http/contracts.js";
import { headerValue } from "../../http/request.js";
import { internationalPhone } from "../../../shared/phone.js";

/** Graph API version for the Conversions API (supported until July 2028). */
export const META_GRAPH_VERSION = "v25.0";

/** Browser context of the visitor, captured when the order is saved. */
export type MetaContext = {
  fbp?: string;
  fbc?: string;
  ip?: string;
  userAgent?: string;
  sourceUrl?: string;
};

export type CapiUserData = Record<string, string | string[]>;

export type CapiEvent = {
  event_name: string;
  event_id: string;
  event_time: number;
  action_source: "website" | "system_generated";
  event_source_url?: string;
  user_data: CapiUserData;
  custom_data: Record<string, unknown>;
};

export const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

/** Algerian mobile number in E.164 digits without "+" (shared helper). */
export const normalizeMetaPhone = internationalPhone;

/** Lowercase, no spaces or punctuation; Arabic letters are kept (UTF-8). */
const normalizeText = (value: unknown) =>
  String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}\d]/gu, "");

const hashed = (value: string | undefined) =>
  value ? [sha256(value)] : undefined;

export function buildUserData(
  order: {
    phone?: unknown;
    full_name?: unknown;
    wilaya?: unknown;
    commune?: unknown;
  },
  context: MetaContext = {}
): CapiUserData {
  const phone = normalizeMetaPhone(order.phone);
  const names = String(order.full_name || "")
    .trim()
    .split(/\s+/)
    .map(normalizeText)
    .filter(Boolean);
  const wilaya = normalizeText(
    String(order.wilaya || "").replace(/^\s*\d+\s*-\s*/, "")
  );
  const data: Record<string, string | string[] | undefined> = {
    ph: hashed(phone),
    external_id: hashed(phone),
    fn: hashed(names[0]),
    ln: names.length > 1 ? hashed(names[names.length - 1]) : undefined,
    ct: hashed(normalizeText(order.commune) || undefined),
    st: hashed(wilaya || undefined),
    country: [sha256("dz")],
    client_ip_address: context.ip,
    client_user_agent: context.userAgent,
    fbp: context.fbp,
    fbc: context.fbc,
  };
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined)
  ) as CapiUserData;
}

const cookieValue = (cookies: string, name: string) => {
  for (const part of cookies.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
};

const COOKIE_PATTERN = /^fb\.\d\.\d+\.[\w.-]{1,500}$/;

/** `_fbc` cookie, or one built from `fbclid` in the landing URL. */
export function clickId(
  cookie: string | undefined,
  sourceUrl: string,
  now = Date.now()
) {
  if (cookie && COOKIE_PATTERN.test(cookie)) return cookie;
  try {
    const fbclid = new URL(sourceUrl).searchParams.get("fbclid");
    if (fbclid && /^[\w.-]{1,500}$/.test(fbclid))
      return `fb.1.${now}.${fbclid}`;
  } catch {
    // Not a URL: no click id.
  }
  return undefined;
}

export function readMetaContext(
  request: Request,
  sourceUrl: string
): MetaContext {
  const cookies = headerValue(request, "cookie") || "";
  const fbp = cookieValue(cookies, "_fbp");
  const ip = String(headerValue(request, "x-forwarded-for") || "")
    .split(",")[0]
    .trim();
  const userAgent = String(headerValue(request, "user-agent") || "").slice(
    0,
    512
  );
  const context: MetaContext = {
    fbp: fbp && COOKIE_PATTERN.test(fbp) ? fbp : undefined,
    fbc: clickId(cookieValue(cookies, "_fbc"), sourceUrl),
    ip: /^[\d.:a-fA-F]{3,45}$/.test(ip) ? ip : undefined,
    userAgent: userAgent || undefined,
    sourceUrl: /^https?:\/\//.test(sourceUrl)
      ? sourceUrl.slice(0, 1000)
      : undefined,
  };
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => value)
  ) as MetaContext;
}

export class CapiError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
  }
}

/** Sends a batch of events. The token travels in the body, never the URL. */
export async function sendCapiEvents(
  pixelId: string,
  token: string,
  events: CapiEvent[],
  testEventCode?: string
) {
  let response: globalThis.Response;
  try {
    response = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          data: events,
          access_token: token,
          ...(testEventCode ? { test_event_code: testEventCode } : {}),
        }),
      }
    );
  } catch {
    throw new CapiError("Meta did not respond", true);
  }
  const data = (await response.json().catch(() => ({}))) as {
    events_received?: number;
    error?: { message?: string; code?: number };
  };
  if (!response.ok) {
    const reason = String(data.error?.message || `HTTP ${response.status}`)
      .replaceAll(token, "[token]")
      .slice(0, 300);
    throw new CapiError(
      reason,
      response.status >= 500 || response.status === 429
    );
  }
  return data.events_received ?? events.length;
}
