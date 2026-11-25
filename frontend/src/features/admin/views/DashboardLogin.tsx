import { useState } from "react";
import { ArrowLeft, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import type { DashboardContext } from "../useDashboard";
import "@/styles/ops.css";

/** Password screen in the same iOS style as the dashboard. */
export function DashboardLogin({ context: c }: { context: DashboardContext }) {
  const [visible, setVisible] = useState(false);
  return (
    <main className="ops-login" dir="rtl">
      <div className="ops ops-login-card">
        <span className="ios-brand-mark ops-login-mark" aria-hidden="true">
          M
        </span>
        <h1>MaisonVerre</h1>
        <p>أدخل كلمة المرور للوصول إلى الطلبات والمنتجات.</p>
        <form
          onSubmit={e => {
            e.preventDefault();
            void c.loadOrders(c.passwordInput);
          }}
        >
          <label className="ops-login-field">
            <Lock size={18} aria-hidden="true" />
            <input
              required
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="كلمة المرور"
              aria-label="كلمة المرور"
              value={c.passwordInput}
              onChange={e => c.setPasswordInput(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setVisible(v => !v)}
              aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>
          {c.error && (
            <p className="ops-login-error" role="alert">
              {c.error}
            </p>
          )}
          <button
            type="submit"
            className="ops-btn primary ops-login-submit"
            disabled={c.loading || !c.passwordInput}
          >
            {c.loading ? (
              <Loader2 size={18} className="ops-spin" />
            ) : (
              <ArrowLeft size={18} />
            )}
            دخول
          </button>
        </form>
        <a className="ops-btn plain" href="/">
          العودة للمتجر
        </a>
      </div>
    </main>
  );
}
