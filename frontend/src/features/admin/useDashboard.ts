import { useDashboardState } from "./model/state";
import { useDashboardSession } from "./model/session";
import { createSettingsActions } from "./model/settings";
import { createMutationActions } from "./model/mutations";
import { useDashboardPolling } from "./model/polling";
import { useDashboardDerived } from "./model/derived";
import { createOrderActions } from "./model/orders";
import { createReports } from "./model/reports";
export function useDashboard() {
  const state = useDashboardState();
  const session = useDashboardSession({ ...state });
  const settings = createSettingsActions({ ...state, ...session });
  const mutations = createMutationActions({
    ...state,
    ...session,
    ...settings,
  });
  const polling = useDashboardPolling({
    ...state,
    ...session,
    ...settings,
    ...mutations,
  });
  const derived = useDashboardDerived({
    ...state,
    ...session,
    ...settings,
    ...mutations,
    ...polling,
  });
  const orderActions = createOrderActions({
    ...state,
    ...session,
    ...settings,
    ...mutations,
    ...polling,
    ...derived,
  });
  const reports = createReports({
    ...state,
    ...session,
    ...settings,
    ...mutations,
    ...polling,
    ...derived,
    ...orderActions,
  });
  return {
    ...state,
    ...session,
    ...settings,
    ...mutations,
    ...polling,
    ...derived,
    ...orderActions,
    ...reports,
  };
}
export type DashboardContext = ReturnType<typeof useDashboard>;
