import { requireDatabase } from "../repositories/index.js";
import { getBody } from "./request.js";
import type { Request, Response } from "./contracts.js";
import { readOrders } from "../handlers/read.js";
import { updateOrders } from "../handlers/update.js";
import { createOrder } from "../handlers/create.js";
export default async function handler(request: Request, response: Response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method === "OPTIONS") {
    response.status(204).json({});
    return;
  }
  try {
    await requireDatabase();
    if (request.method === "GET") return await readOrders(request, response);
    if (request.method === "PATCH")
      return await updateOrders(request, response, getBody(request.body));
    if (request.method === "POST")
      return await createOrder(request, response, getBody(request.body));
    response.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error(
      "Orders API",
      error instanceof Error ? error.message : "unknown"
    );
    response.status(500).json({ error: "تعذر تنفيذ العملية؛ أعد المحاولة" });
  }
}
