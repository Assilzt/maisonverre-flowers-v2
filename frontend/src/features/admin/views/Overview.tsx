import { ArrowUpLeft, Package, Phone, Truck, CheckCircle2 } from "lucide-react";
import type { DashboardContext } from "../useDashboard";
import { statusLabels } from "../presentation";
export function Overview({
  context: c,
  reports = false,
}: {
  context: DashboardContext;
  reports?: boolean;
}) {
  const stats = [
    ["إجمالي الطلبات", c.totalOrderCount, Package],
    ["تحتاج تأكيد", c.confirmationQueueCount, Phone],
    ["مؤكدة للشحن", c.confirmedCount, Truck],
    ["تم التسليم", c.deliveredCount, CheckCircle2],
  ] as const;
  return (
    <>
      <div className="stat-grid">
        {stats.map(([label, count, Icon]) => (
          <div key={label} className="stat-card">
            <div
              className="toolbar"
              style={{ justifyContent: "space-between" }}
            >
              <span>{label}</span>
              <Icon size={16} color="#90a496" />
            </div>
            <strong>{count.toLocaleString()}</strong>
            <small>كل الطلبات المسجلة</small>
          </div>
        ))}
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{reports ? "توزيع الطلبات" : "العمل القادم"}</h2>
              <p>
                {reports
                  ? "توزيع الحالات على إجمالي قاعدة البيانات"
                  : "مهام واضحة لمتابعة دورة الطلب"}
              </p>
            </div>
          </div>
          {reports
            ? Object.entries(c.globalCounts)
                .filter(([key]) => key !== "trashed")
                .map(([key, count]) => (
                  <div className="report-row" key={key}>
                    <span>
                      {statusLabels[key as keyof typeof statusLabels] || key}
                    </span>
                    <div className="report-track">
                      <span
                        style={{
                          width:
                            Math.max(
                              2,
                              (count / Math.max(1, c.totalOrderCount)) * 100
                            ) + "%",
                        }}
                      />
                    </div>
                    <strong>{count}</strong>
                  </div>
                ))
            : [
                [
                  "تأكيد الطلبات",
                  "طلبات جديدة تنتظر التواصل",
                  c.confirmationQueueCount,
                  "/admin?tab=confirmation",
                ],
                [
                  "تجهيز الشحن",
                  "طلبات مؤكدة وجاهزة للرفع",
                  c.confirmedCount,
                  "/admin?tab=shipping",
                ],
                [
                  "متابعة العملاء",
                  "محاولات اتصال تحتاج متابعة",
                  c.followUpCount,
                  "/admin?tab=incomplete",
                ],
              ].map(([label, desc, count, href]) => (
                <div key={label} className="work-item">
                  <div>
                    <p>
                      {label} <strong>({count})</strong>
                    </p>
                    <small>{desc}</small>
                  </div>
                  <a href={String(href)} className="btn small">
                    عرض
                    <ArrowUpLeft size={14} />
                  </a>
                </div>
              ))}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>{reports ? "قراءة المؤشرات" : "متجرك، في مكان واحد"}</h2>
              <p>
                {reports
                  ? "مؤشرات تشغيلية لجميع الطلبات"
                  : "إدارة المحتوى والتوصيل دون فقدان سياق العمل"}
              </p>
            </div>
          </div>
          {reports ? (
            <>
              <div className="work-item">
                <p>نسبة التأكيد عبر دورة الطلب</p>
                <strong>{c.confirmationRate}%</strong>
              </div>
              <p className="muted" style={{ marginTop: 16 }}>
                تتضمن المؤكدة والمشحونة والمسلّمة والمرتجعة. حالات الشحن
                والتحصيل لدى الشركة تُعرض في قسم الشحن.
              </p>
            </>
          ) : (
            <>
              <div className="work-item">
                <div>
                  <p>المنتجات وصفحات الهبوط</p>
                  <small>أضف منتجًا، عاينه ثم انشره.</small>
                </div>
                <a className="btn small" href="/admin/products">
                  إدارة المنتجات
                </a>
              </div>
              <div className="work-item">
                <div>
                  <p>الشحن والمخزون</p>
                  <small>تتبّع الشحنات وإدارة كميات المنتجات.</small>
                </div>
                <a className="btn small" href="/admin/shipping">
                  فتح الشحن
                </a>
              </div>
              <div className="work-item">
                <div>
                  <p>حالة التكاملات</p>
                  <small>مراجعة الإشعارات والمزامنة.</small>
                </div>
                <a
                  className="btn small"
                  href="/admin/settings?panel=operations"
                >
                  مراجعة الحالة
                </a>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}
