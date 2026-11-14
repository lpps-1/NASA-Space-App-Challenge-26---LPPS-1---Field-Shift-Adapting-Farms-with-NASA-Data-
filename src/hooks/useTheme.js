import { useCallback, useSyncExternalStore } from "react";

/**
 * One shared light/dark theme for the whole app. Every component that calls
 * useTheme() (the sidebar button, the Settings switch) reads and changes the
 * same value, so they can never disagree. index.html applies the saved theme
 * before the first paint, so there is no flash of the wrong theme.
 */
const KEY = "kisan-theme";
const EVENT = "kisan-theme-change";

const read = () => (document.documentElement.classList.contains("dark") ? "dark" : "light");

export function applyTheme(next) {
  const theme = next === "dark" ? "dark" : "light";
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* storage blocked: the theme still applies for this visit */
  }
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb) {
  window.addEventListener(EVENT, cb);
  // Another tab changed the theme.
  const onStorage = (e) => {
    if (e.key === KEY) {
      document.documentElement.classList.toggle("dark", e.newValue === "dark");
      document.documentElement.style.colorScheme = e.newValue === "dark" ? "dark" : "light";
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "dark");
  const setTheme = useCallback((next) => applyTheme(next), []);
  const toggle = useCallback(() => applyTheme(read() === "dark" ? "light" : "dark"), []);
  return { theme, setTheme, toggle };
}
