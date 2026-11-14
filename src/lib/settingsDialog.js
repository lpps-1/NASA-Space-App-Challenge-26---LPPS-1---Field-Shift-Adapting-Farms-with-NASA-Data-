import { useSyncExternalStore } from "react";

/**
 * Settings opens as a popup over the current page (like Claude), not as its own page.
 * openSettings("voice") opens it on a section; any component can call it.
 */
let state = { open: false, section: "general" };
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function openSettings(section = "general") {
  state = { open: true, section };
  emit();
}
export function closeSettings() {
  state = { ...state, open: false };
  emit();
}
export function setSettingsSection(section) {
  state = { ...state, section };
  emit();
}

export function useSettingsDialog() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => state,
    () => state
  );
}
