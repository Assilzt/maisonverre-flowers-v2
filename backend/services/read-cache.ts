export const publicReadCache = new Map<
  string,
  { expiresAt: number; body: unknown }
>();

export const PUBLIC_CACHE_TTL_MS = 5 * 60 * 1000;
