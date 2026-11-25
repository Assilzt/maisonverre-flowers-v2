import {
  loadEcoSettings,
  rowById,
  sql,
  recordEvent,
} from "../backend/repositories/index.js";
import { isAdmin, getBody } from "../backend/http/request.js";
import type { Request, Response } from "../backend/http/contracts.js";
import { fetchEcoTrackOrders } from "../backend/integrations/ecotrack/client.js";
export default async function recovery(request: Request, response: Response) {
  if (!isAdmin(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const id = Number(getBody(request.body).id),
      order = await rowById(id);
    if (!order) throw new Error("الطلب غير موجود");
    if (order.ecotrack_tracking) {
      response.status(200).json({ order });
      return;
    }
    if (!["processing", "uncertain"].includes(order.shipment_status))
      throw new Error("الطلب لا يحتاج مطابقة");
    const settings = await loadEcoSettings(
      order.shipping_provider_id || undefined
    );
    for (let page = 1; page <= 10; page++) {
      const data = await fetchEcoTrackOrders(settings, page);
      const matches = data.data.filter(row => row.reference === order.lead_id);
      if (matches.length > 1)
        throw new Error("أكثر من شحنة بنفس المرجع؛ راجع الشركة");
      const match = matches[0];
      if (match?.tracking) {
        await sql!`UPDATE atlasio_orders SET ecotrack_tracking=${String(match.tracking)},ecotrack_status=${String(match.status || "created")},status='shipped',shipment_status='ready' WHERE id=${id}`;
        await recordEvent(
          id,
          "shipment_recovered",
          "تمت مطابقة الشحنة بالمرجع",
          undefined,
          undefined,
          { tracking: match.tracking }
        );
        response.status(200).json({ order: await rowById(id) });
        return;
      }
      if (page >= data.last_page) break;
    }
    throw new Error(
      "لم تُثبت المطابقة ضمن الصفحات المفحوصة. تحقق من EcoTrack قبل أي إعادة رفع؛ المخزون المحجوز لم يُحرر تلقائيًا."
    );
  } catch (e) {
    response
      .status(409)
      .json({ error: e instanceof Error ? e.message : "تعذرت المطابقة" });
  }
}
