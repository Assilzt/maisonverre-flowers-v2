import { useEffect } from "react";
import type { DashboardState } from "./state";
import type { MutationActions } from "./mutations";

export function useDashboardPolling(
  context: Pick<DashboardState & MutationActions, "password" | "syncStatuses">
) {
  const { password, syncStatuses } = context;
  useEffect(() => {
    if (!password) return;
    const timer = window.setInterval(
      () => {
        void syncStatuses();
      },
      15 * 60 * 1000
    );
    return () => window.clearInterval(timer);
    // The interval intentionally follows the authenticated dashboard session only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [password]);
  return {};
}
export type DashboardPolling = ReturnType<typeof useDashboardPolling>;
