export async function api<T = Record<string, unknown>>(
  url: string,
  body?: unknown,
  method = body ? "POST" : "GET"
): Promise<T> {
  const response = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response
    .json()
    .catch(() => ({ error: "رد غير صالح من الخادم" }));
  if (!response.ok)
    throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}
export const updateOrder = <T = Record<string, unknown>>(body: unknown) =>
  api<T>("/api/orders", body, "PATCH");
