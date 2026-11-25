import { useEffect, useState, type ReactNode } from "react";
import {
  ClipboardList,
  Package,
  Truck,
  BarChart3,
  Settings,
  ArrowUpLeft,
  LogOut,
  Menu,
} from "lucide-react";
import { Dialog } from "./Dialog";
import "@/styles/admin.css";
import "@/styles/ios-admin.css";
export type AdminArea =
  "overview" | "orders" | "products" | "shipping" | "reports" | "settings";
export const navigation = [
  { id: "orders", label: "الطلبات", href: "/admin", icon: ClipboardList },
  { id: "products", label: "المنتجات", href: "/admin/products", icon: Package },
  {
    id: "shipping",
    label: "الشحن والمخزون",
    href: "/admin/shipping",
    icon: Truck,
  },
  { id: "reports", label: "التقارير", href: "/admin/reports", icon: BarChart3 },
  {
    id: "settings",
    label: "الإعدادات",
    href: "/admin/settings",
    icon: Settings,
  },
  {
    id: "overview",
    label: "المهام والأخطاء",
    href: "/admin/overview",
    icon: BarChart3,
  },
] as const;
export function AdminShell({
  active,
  title,
  description,
  actions,
  children,
}: {
  active: AdminArea;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.title = title + " — Atlasio";
  }, [title]);
  const links = (mobile = false) => (
    <nav
      aria-label="التنقل الرئيسي"
      className={mobile ? "legacy-mobile-nav" : "legacy-tabs"}
    >
      {navigation.map(({ id, label, href, icon: Icon }) => (
        <a
          key={id}
          href={href}
          aria-current={active === id ? "page" : undefined}
          className={active === id ? "active" : ""}
        >
          <Icon size={19} />
          <span>{label}</span>
        </a>
      ))}
    </nav>
  );
  const logout = async () => {
    await fetch("/api/session", { method: "DELETE" });
    window.location.assign("/admin");
  };
  return (
    <div className="admin-app legacy-dashboard" dir="rtl">
      <a className="skip-link" href="#workspace-content">
        انتقل إلى المحتوى
      </a>
      <header className="legacy-header">
        <div className="legacy-heading">
          <h1>MaisonVerre</h1>
          <span>إدارة المتجر</span>
        </div>
        <div className="legacy-quick-actions">
          <a href="/" target="_blank" rel="noreferrer">
            <ArrowUpLeft size={16} /> المتجر
          </a>
          <a href="/admin/products">
            <Package size={16} /> محرر الصفحات
          </a>
          <button type="button" onClick={() => void logout()}>
            <LogOut size={16} /> خروج
          </button>
          <button
            type="button"
            className="icon-button legacy-menu"
            aria-label="فتح قائمة التنقل"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      <div className="legacy-nav-row">{links()}</div>
      <div className="workspace-main">
        <main id="workspace-content" className="workspace-content">
          <header className="page-heading">
            <div>
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </div>
            {actions && <div className="page-actions">{actions}</div>}
          </header>
          {children}
        </main>
      </div>
      {open && (
        <Dialog drawer title="مساحة العمل" onClose={() => setOpen(false)}>
          {links(true)}
          <a className="btn" href="/" target="_blank" rel="noreferrer">
            فتح المتجر
            <ArrowUpLeft size={16} />
          </a>
          <button type="button" className="btn" onClick={() => void logout()}>
            تسجيل الخروج
          </button>
        </Dialog>
      )}
    </div>
  );
}
