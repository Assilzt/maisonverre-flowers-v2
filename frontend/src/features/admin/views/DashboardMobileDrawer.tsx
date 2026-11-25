import { X } from "lucide-react";
import type { DashboardContext } from "../useDashboard";
import { AdminNav } from "./AdminNav";

/** Phone and tablet menu: an iOS Settings-style sheet with grouped cards. */
export function DashboardMobileDrawer({
  context,
}: {
  context: DashboardContext;
}) {
  const { drawerOpen, setDrawerOpen } = context;
  return (
    <aside
      className={"ios-drawer" + (drawerOpen ? " open" : "")}
      aria-hidden={!drawerOpen}
      aria-label="القائمة"
    >
      <div className="ios-nav" style={{ paddingBottom: 0 }}>
        <div className="ios-drawer-head">
          <h2>القائمة</h2>
          <button
            type="button"
            className="ops-btn round small"
            onClick={() => setDrawerOpen(false)}
            aria-label="إغلاق القائمة"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      {drawerOpen && <AdminNav context={context} />}
    </aside>
  );
}
