import { useSyncExternalStore } from "react";

/** Small UI state shared across the dashboard: toasts and call mode. */
export type Toast = {
  id: number;
  text: string;
  tone: "success" | "error" | "info";
  undo?: () => void;
};
type UiState = { toasts: Toast[]; callMode: boolean };

let state: UiState = { toasts: [], callMode: false };
const listeners = new Set<() => void>();
const set = (next: Partial<UiState>) => {
  state = { ...state, ...next };
  listeners.forEach(listener => listener());
};

export function toast(
  text: string,
  options: { tone?: Toast["tone"]; undo?: () => void } = {}
) {
  const item: Toast = {
    id: Date.now() + Math.random(),
    text,
    tone: options.tone || "success",
    undo: options.undo,
  };
  set({ toasts: [...state.toasts.slice(-2), item] });
  setTimeout(() => dismissToast(item.id), options.undo ? 6000 : 3500);
}
export const dismissToast = (id: number) =>
  set({ toasts: state.toasts.filter(item => item.id !== id) });
export const setCallMode = (callMode: boolean) => set({ callMode });

export const useUi = () =>
  useSyncExternalStore(
    listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state
  );
