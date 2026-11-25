import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Inbox,
  LogOut,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Settings,
  Trash2,
  Truck,
  Undo2,
} from "lucide-react";
import "@/styles/ops.css";
import type { DashboardContext } from "../useDashboard";
import type { OrderSection } from "../model/sections";

type Icon = ComponentType<{ size?: number; className?: string }>;
type Tone =
  "green" | "blue" | "orange" | "indigo" | "teal" | "red" | "gray" | "pink";

function Item({
  icon: Glyph,
  tone,
  label,
  count,
  current = false,
  onClick,
  href,
  disabled,
  spin,
}: {
  icon: Icon;
  tone: Tone;
  label: string;
  count?: ReactNode;
  current?: boolean;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  spin?: boolean;
}) {
  const body = (
    <>
      <span className={"ios-icon " + tone}>
        <Glyph size={16} className={spin ? "ops-spin" : undefined} />
      </span>
      {label}
      {count !== undefined && (
        <span className="ios-item-count num">{count}</span>
      )}
    </>
  );
  return href ? (
    <a className="ios-item" href={href} aria-current={current}>
      {body}
    </a>
  ) : (
    <button
      type="button"
      className="ios-item"
      aria-current={current}
      onClick={onClick}
      disabled={disabled}
    >
      {body}
    </button>
  );
}

/** One navigation for the desktop sidebar and the phone menu. */
export function AdminNav({ context: c }: { context: DashboardContext }) {
  const onOperations = window.location.pathname === "/admin/operations";
  const open = (section: OrderSection) => {
    if (onOperations) window.location.assign("/admin?tab=" + section);
    else c.goToSection(section);
  };
  const queue = (
    section: OrderSection,
    label: string,
    icon: Icon,
    tone: Tone,
    count?: number
  ) => (
    <Item
      key={section}
      icon={icon}
      tone={tone}
      label={label}
      count={count}
      current={!onOperations && c.section === section}
      onClick={() => open(section)}
    />
  );
  return (
    <nav className="ios-nav" aria-label="لوحة التحكم">
      <div className="ios-brand">
        <span className="ios-brand-mark">M</span>
        <div>
          <strong>MaisonVerre</strong>
          <span>لوحة الطلبات</span>
        </div>
      </div>

      <div>
        <p className="ios-group-title">الطلبات</p>
        <div className="ios-group">
          {queue("orders", "كل الطلبات", Inbox, "blue", c.totalOrderCount)}
          {queue(
            "confirmation",
            "التأكيد",
            Phone,
            "green",
            c.confirmationQueueCount
          )}
          {queue("shipping", "الشحن", Truck, "orange", c.shippingQueueCount)}
          {queue("tracking", "التتبع", MapPin, "indigo", c.trackingQueueCount)}
          {queue("incomplete", "تحتاج متابعة", Clock, "pink", c.followUpCount)}
        </div>
      </div>

      <div>
        <p className="ios-group-title">الأرشيف</p>
        <div className="ios-group">
          {queue(
            "completed",
            "تم التسليم",
            CheckCircle2,
            "teal",
            c.counts.delivered || 0
          )}
          {queue("returns", "المرتجعات", Undo2, "red", c.counts.returned || 0)}
          {queue("trash", "المحذوفات", Trash2, "gray", c.counts.trashed || 0)}
          {queue("analytics", "التقارير", BarChart3, "indigo")}
        </div>
      </div>

      <div>
        <p className="ios-group-title">المتجر</p>
        <div className="ios-group">
          <Item
            icon={Package}
            tone="teal"
            label="المنتجات وصفحات الهبوط"
            href="/admin/products"
          />
          <Item
            icon={AlertTriangle}
            tone="orange"
            label="المهام والأخطاء"
            href="/admin/operations"
            current={onOperations}
          />
          <Item
            icon={RefreshCw}
            tone="blue"
            label="مزامنة حالات الشحن"
            spin={c.syncing}
            disabled={c.syncing}
            onClick={() => {
              void c.syncStatuses();
              c.setDrawerOpen(false);
            }}
          />
          <Item
            icon={Settings}
            tone="gray"
            label="الإعدادات"
            onClick={() => {
              c.setSettingsOpen(true);
              c.setDrawerOpen(false);
            }}
          />
          <Item
            icon={LogOut}
            tone="red"
            label="خروج"
            onClick={() => {
              void fetch("/api/session", { method: "DELETE" });
              c.setPassword("");
            }}
          />
        </div>
      </div>

      <div className="ios-status">
        <i className={c.tokenConfigured ? "on" : ""} />
        {c.tokenConfigured
          ? "شركة التوصيل متصلة وجاهزة"
          : "شركة التوصيل تحتاج إعداد الرمز"}
      </div>
    </nav>
  );
}
