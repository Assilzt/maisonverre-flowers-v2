import { OperationsPanel } from "./OperationsPanel";
import "@/styles/admin.css";
export default function AdminOperations() {
  return (
    <main className="admin-shell" dir="rtl">
      <header className="admin-header">
        <div>
          <p className="eyebrow">ATLASIO / OPERATIONS</p>
          <h1>المهام والأخطاء</h1>
        </div>
        <a className="btn" href="/admin">
          العودة إلى اللوحة
        </a>
      </header>
      <OperationsPanel />
    </main>
  );
}
