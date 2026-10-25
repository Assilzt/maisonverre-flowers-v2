import {
  isAdmin,
  getBody,
  queryValue,
  rowById,
  loadEcoSettings,
  recordEvent,
  sql,
  cancelLocalShipment,
  Request,
  Response,
} from "../backend/repositories/index.js";
import {
  carrierAction,
  carrierLabel,
} from "../backend/integrations/ecotrack/actions.js";
import { fetchEcoTrackTrackingsInfo } from "../backend/integrations/ecotrack/client.js";
import { remoteActionAllowed } from "../shared/shipping-status.js";
export default async function shipping(request: Request, response: Response) {
  if (!isAdmin(request)) {
    response.status(401).json({ error: "غير مصرح" });
    return;
  }
  const body = getBody(request.body),
    id = Number(body.id || queryValue(request, "id"));
  try {
    const order = await rowById(id);
    if (!order?.ecotrack_tracking) {
      response.status(404).json({ error: "الشحنة غير موجودة" });
      return;
    }
    const settings = await loadEcoSettings(
      order.shipping_provider_id || undefined
    );
    if (request.method === "GET") {
      const pdf = await carrierLabel(order.ecotrack_tracking, settings);
      response.setHeader("Content-Type", "application/pdf");
      response.setHeader(
        "Content-Disposition",
        `inline; filename="label-${id}.pdf"`
      );
      response.send?.(pdf);
      return;
    }
    if (request.method !== "POST") {
      response.status(405).json({ error: "Method not allowed" });
      return;
    }
    const action = String(body.action);
    const details = await fetchEcoTrackTrackingsInfo(
      [order.ecotrack_tracking],
      settings
    );
    const remote = details[order.ecotrack_tracking];
    if (!remote?.status)
      throw new Error("تعذر التحقق من الحالة الحالية لدى الشركة");
    if (
      !remoteActionAllowed(
        action,
        remote.status,
        Boolean(order.remote_validated)
      )
    )
      throw new Error("الإجراء غير متاح في المرحلة الحالية");
    const fields = (body.fields || {}) as Record<string, unknown>;
    if (action === "edit") {
      if (
        !String(fields.client || "").trim() ||
        !/^0[5-7]\d{8}$/.test(String(fields.tel || "")) ||
        !String(fields.adresse || "").trim() ||
        !String(fields.commune || "").trim() ||
        !Number.isFinite(Number(fields.montant)) ||
        Number(fields.montant) < order.delivery_fee
      )
        throw new Error("تحقق من اسم العميل والهاتف والعنوان والمبلغ");
    }
    await carrierAction(action, order.ecotrack_tracking, settings, fields);
    if (action === "edit")
      await sql!`UPDATE atlasio_orders SET full_name=${String(fields.client)},phone=${String(fields.tel)},commune=${String(fields.commune)},price=${Math.round(Number(fields.montant)) - order.delivery_fee},updated_at=NOW() WHERE id=${id}`;
    if (action === "validate" || action === "pickup")
      await sql!`UPDATE atlasio_orders SET remote_validated=TRUE WHERE id=${id}`;
    if (action === "delete") await cancelLocalShipment(id);
    await recordEvent(
      id,
      "carrier_" + action,
      `EcoTrack: ${action}`,
      undefined,
      undefined,
      {
        tracking: order.ecotrack_tracking,
        fields: action === "note" ? { content: fields.content } : {},
      }
    );
    response.status(200).json({ ok: true, order: await rowById(id) });
  } catch (error) {
    response.status(409).json({
      error: error instanceof Error ? error.message : "تعذر تنفيذ الإجراء",
    });
  }
}
