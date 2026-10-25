import { Request, Response, loadEcoSettings } from "../repositories/index.js";
import { updateShip } from "./update-ship.js";
export async function updateShipAll(
  request: Request,
  response: Response,
  body: Record<string, unknown>,
  settings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
  if (!ids.length || ids.length > 10) {
    response.status(400).json({ error: "حدد حتى 10 طلبات في العملية" });
    return;
  }
  const results = [];
  for (const id of ids) {
    let code = 200;
    let data: Record<string, unknown> = {};
    const capture: Response = {
      status(value) {
        code = value;
        return this;
      },
      json(value) {
        data = value as Record<string, unknown>;
      },
      setHeader() {},
    };
    try {
      await updateShip(request, capture, { ...body, id }, settings);
      results.push({
        id,
        ...data,
        ...(code >= 400 ? { error: data.error || "فشل الشحن" } : {}),
      });
    } catch (e) {
      results.push({ id, error: e instanceof Error ? e.message : "فشل الشحن" });
    }
  }
  response.status(200).json({
    results,
    shipped: results.filter(r => !("error" in r)).length,
    failed: results.filter(r => "error" in r).length,
  });
}
