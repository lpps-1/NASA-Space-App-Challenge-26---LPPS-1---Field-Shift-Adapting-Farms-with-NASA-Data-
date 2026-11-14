import { useSyncExternalStore } from "react";

/**
 * The open conversation's id, shared between the chat page and the sidebar's
 * history list (which lives in the layout, like Claude's sidebar).
 */
let active = null;
const listeners = new Set();

export function setActiveConversation(id) {
  if (id === active) return;
  active = id || null;
  listeners.forEach((fn) => fn());
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const useActiveConversation = () => useSyncExternalStore(subscribe, () => active, () => null);
