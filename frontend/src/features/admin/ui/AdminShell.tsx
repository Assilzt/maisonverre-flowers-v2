import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
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
export type AdminArea =
  "overview" | "orders" | "products" | "shipping" | "reports" | "settings";
export const navigation = [
  {
    id: "overview",
    label: "نظرة عامة",
    href: "/admin/overview",
    icon: LayoutDashboard,
  },
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
  const links = (
    <nav aria-label="التنقل الرئيسي">
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
    <div className="admin-app" dir="rtl">
      <a className="skip-link" href="#workspace-content">
        انتقل إلى المحتوى
      </a>
      <aside className="workspace-sidebar">
        <a className="workspace-brand" href="/admin/overview">
          <span className="brand-symbol">
            a<span>.</span>
          </span>
          <span>
            Atlasio<small>إدارة المتجر</small>
          </span>
        </a>
        <p className="nav-caption">مساحة العمل</p>
        {links}
        <footer>
          <a href="/" target="_blank" rel="noreferrer">
            <ArrowUpLeft size={18} />
            فتح المتجر
          </a>
          <button type="button" onClick={() => void logout()}>
            <LogOut size={18} />
            تسجيل الخروج
          </button>
          <span className="workspace-version">MAISONVERRE · V2</span>
        </footer>
      </aside>
      <div className="workspace-main">
        <div className="workspace-topbar">
          <div className="toolbar">
            <button
              type="button"
              className="icon-button mobile-menu"
              aria-label="فتح قائمة التنقل"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>
              مساحة العمل <span className="breadcrumb-divider">/</span>{" "}
              {navigation.find(n => n.id === active)?.label}
            </span>
          </div>
          <div className="account-mark">
            <span className="account-avatar">A</span>
            <span>إدارة المتجر</span>
          </div>
        </div>
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
        <footer className="workspace-footer">
          Atlasio <span>مساحة واحدة لإدارة متجرك</span>
        </footer>
      </div>
      {open && (
        <Dialog drawer title="مساحة العمل" onClose={() => setOpen(false)}>
          {links}
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
