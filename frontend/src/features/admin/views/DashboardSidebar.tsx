import type { DashboardContext } from "../useDashboard";
import { AdminNav } from "./AdminNav";

/** Desktop sidebar in the macOS style: light, translucent, grouped. */
export function DashboardSidebar({ context }: { context: DashboardContext }) {
  return (
    <aside className="ios-sidebar">
      <AdminNav context={context} />
    </aside>
  );
}
