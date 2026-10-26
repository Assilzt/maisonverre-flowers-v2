import { Loader2, ArrowLeft } from "lucide-react";
import type { DashboardContext } from "../useDashboard";
import "@/styles/admin.css";
export function DashboardLogin({ context: c }: { context: DashboardContext }) {
  return (
    <main className="admin-app login-page" dir="rtl">
      <div className="login-card">
        <span className="brand-symbol">
          a<span>.</span>
        </span>
        <h1>أهلًا بك في Atlasio</h1>
        <p>سجّل الدخول للوصول إلى طلباتك ومنتجاتك.</p>
        <form
          onSubmit={e => {
            e.preventDefault();
            void c.loadOrders(c.passwordInput);
          }}
        >
          <label>
            كلمة المرور
            <input
              required
              type="password"
              autoComplete="current-password"
              value={c.passwordInput}
              onChange={e => c.setPasswordInput(e.target.value)}
              autoFocus
            />
          </label>
          <button
            type="submit"
            className="btn primary"
            disabled={c.loading || !c.passwordInput}
          >
            {c.loading ? (
              <Loader2 size={17} className="spinner" />
            ) : (
              <ArrowLeft size={17} />
            )}
            دخول إلى مساحة العمل
          </button>
        </form>
        {c.error && (
          <p className="notice error" role="alert" style={{ marginTop: 18 }}>
            {c.error}
          </p>
        )}
        <a
          className="text-link"
          style={{ display: "inline-block", marginTop: 24, fontSize: 11 }}
          href="/"
        >
          العودة للمتجر
        </a>
      </div>
    </main>
  );
}
