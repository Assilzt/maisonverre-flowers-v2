import type { Request } from "./contracts.js";
import { verifySession } from "./../auth/session.js";

export const getBody = (body: unknown): Record<string, unknown> => {
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return (body || {}) as Record<string, unknown>;
};

export const headerValue = (request: Request, name: string) => {
  const value = request.headers[name] ?? request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
};

export const isAdmin = (request: Request) =>
  verifySession(headerValue(request, "cookie") || "");

export const isCron = (request: Request) =>
  Boolean(
    process.env.CRON_SECRET &&
    headerValue(request, "authorization") ===
      `Bearer ${process.env.CRON_SECRET}`
  );

export const queryValue = (request: Request, name: string) => {
  const value = request.query?.[name];
  return Array.isArray(value) ? value[0] : value;
};
