import { useCallback, useSyncExternalStore } from "react";

/**
 * Page size (zoom) for the whole app. The app is shown at 90% by default and the
 * farmer can pick 70% to 110% in Settings. index.html applies the saved value
 * before the first paint, so the page never jumps.
 */
export const ZOOM_KEY = "kisan-zoom";
export const ZOOM_DEFAULT = 90;
export const ZOOM_STEPS = [70, 80, 90, 100, 110];
const EVENT = "kisan-zoom-change";

export function readZoom() {
  try {
    const v = Number(localStorage.getItem(ZOOM_KEY));
    return ZOOM_STEPS.includes(v) ? v : ZOOM_DEFAULT;
  } catch {
    return ZOOM_DEFAULT;
  }
}

export function applyZoom(pct) {
  const v = ZOOM_STEPS.includes(pct) ? pct : ZOOM_DEFAULT;
  try {
    localStorage.setItem(ZOOM_KEY, String(v));
  } catch {
    /* storage blocked: still applies for this visit */
  }
  // The layout is built in rem, so changing the root font size scales the whole app
  // (unlike CSS zoom, it leaves full-screen heights like 100vh intact).
  document.documentElement.style.fontSize = `${v}%`;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function usePageZoom() {
  const zoom = useSyncExternalStore(subscribe, readZoom, () => ZOOM_DEFAULT);
  const setZoom = useCallback((v) => applyZoom(v), []);
  return { zoom, setZoom };
}
