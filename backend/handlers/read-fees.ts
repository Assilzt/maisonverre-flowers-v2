import { loadEcoSettings } from "../repositories/index.js";
import type { Request, Response } from "../http/contracts.js";
import { deliveryFees } from "../services/delivery-fees.js";
export async function fees(
  _request: Request,
  response: Response,
  settings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  response.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=86400"
  );
  response.status(200).json({ fees: await deliveryFees(settings) });
}
