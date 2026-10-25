import { Request, Response, loadEcoSettings } from "../repositories/index.js";
import { deliveryFees } from "../services/delivery-fees.js";
export async function fees(
  _request: Request,
  response: Response,
  settings: Awaited<ReturnType<typeof loadEcoSettings>>
) {
  response.setHeader(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=60"
  );
  response.status(200).json({ fees: await deliveryFees(settings) });
}
