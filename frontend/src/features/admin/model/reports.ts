import type { Order } from "@shared/orders";
import { statusLabels, formatDate, escapeHtml } from "../presentation";
import type { DashboardState } from "./state";

export function createReports(
  context: Pick<
    DashboardState,
    "selectedIds" | "orders" | "setShippingNotice" | "setError"
  >
) {
  const { selectedIds, orders, setShippingNotice, setError } = context;
  const exportSelectedOrdersPdf = async () => {
    const selectedOrders = selectedIds
      .map(id => orders.find(order => order.id === id))
      .filter((order): order is Order => Boolean(order));
    if (!selectedOrders.length) return;
    const totalValue = selectedOrders.reduce(
      (sum, order) => sum + order.price + (order.delivery_fee || 0),
      0
    );
    const reportRows = selectedOrders
      .map(
        order => `
      <article class="order-row">
        <div class="row-title"><strong>طلبية #${escapeHtml(order.id)}</strong><span>${escapeHtml(statusLabels[order.status])}</span></div>
        <div class="fields"><div><b>التاريخ</b>${escapeHtml(formatDate(order.created_at))}</div><div><b>الاسم</b>${escapeHtml(order.full_name || "بدون اسم")}</div><div><b>الهاتف</b><span dir="ltr">${escapeHtml(order.phone)}</span></div><div><b>الموقع</b>${escapeHtml([order.wilaya, order.commune].filter(Boolean).join("، ") || "غير محدد")}</div><div class="amount"><b>الإجمالي</b>${escapeHtml(order.price + (order.delivery_fee || 0))} دج</div></div>
      </article>`
      )
      .join("");
    const reportStyles = `@page{size:A4;margin:16mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#1f2937;font-family:Arial,"Tahoma",sans-serif;font-size:11px;line-height:1.5}.report{width:794px;margin:0 auto;background:#fff;padding:32px}.header{border-bottom:2px solid #1f2937;padding-bottom:10px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:end}.brand{font-size:22px;font-weight:800;letter-spacing:.04em}.subtitle{color:#6b7280;font-size:10px}.summary{display:flex;justify-content:space-between;border-bottom:1px solid #9ca3af;padding:8px 0;margin-bottom:14px;font-weight:700}.order-row{border-bottom:1px solid #d1d5db;padding:10px 0;break-inside:avoid}.row-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:13px}.row-title span{border:1px solid #9ca3af;border-radius:999px;padding:1px 8px;font-size:10px}.fields{display:grid;grid-template-columns:1.1fr 1.4fr 1.2fr 2fr 1fr;gap:8px;align-items:start}.fields div{min-width:0}.fields b{display:block;color:#6b7280;font-size:9px;font-weight:400;margin-bottom:2px}.fields .amount{font-weight:800;text-align:left}.footer{color:#9ca3af;text-align:center;margin-top:16px;font-size:9px}`;
    const reportContainer = document.createElement("div");
    reportContainer.dir = "rtl";
    reportContainer.style.cssText =
      "position:fixed;left:-10000px;top:0;width:794px;background:#fff;z-index:-1;";
    reportContainer.innerHTML = `<style>${reportStyles}</style><main class="report"><header class="header"><div><div class="brand">Atlasio</div><div class="subtitle">تقرير مختصر للطلبيات المحددة</div></div><div class="subtitle">${escapeHtml(new Intl.DateTimeFormat("ar-DZ", { dateStyle: "medium" }).format(new Date()))}</div></header><section class="summary"><span>عدد الطلبيات: ${selectedOrders.length}</span><span>الإجمالي: ${totalValue} دج</span></section>${reportRows}<p class="footer">تقرير داخلي مختصر — Atlasio</p></main>`;
    document.body.appendChild(reportContainer);
    try {
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => resolve())
      );
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(reportContainer, {
        backgroundColor: "#ffffff",
        scale: 2,
        width: 794,
        windowWidth: 794,
      });
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const margin = 8;
      const pageHeight = 297 - margin * 2;
      const imageWidth = 210 - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const image = canvas.toDataURL("image/jpeg", 0.94);
      let remainingHeight = imageHeight;
      let position = margin;
      pdf.addImage(image, "JPEG", margin, position, imageWidth, imageHeight);
      remainingHeight -= pageHeight;
      while (remainingHeight > 0) {
        position = margin - (imageHeight - remainingHeight);
        pdf.addPage();
        pdf.addImage(image, "JPEG", margin, position, imageWidth, imageHeight);
        remainingHeight -= pageHeight;
      }
      pdf.save(`atlasio-orders-${new Date().toISOString().slice(0, 10)}.pdf`);
      setShippingNotice({
        type: "success",
        title: "تم تحميل التقرير المختصر",
        message: `تم تصدير ${selectedOrders.length} طلبية بالمعلومات الأساسية فقط.`,
      });
    } catch (exportError) {
      console.error("PDF export error", exportError);
      setError(
        "تعذر إنشاء ملف PDF؛ حاول مرة أخرى أو اسمح بالتنزيلات من المتصفح"
      );
    } finally {
      reportContainer.remove();
    }
  };
  return { exportSelectedOrdersPdf };
}
export type ReportActions = ReturnType<typeof createReports>;
