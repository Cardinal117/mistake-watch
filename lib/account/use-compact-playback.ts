"use client";
import { useSyncExternalStore } from "react";
import type { AccountSummary } from "./types";

const eventName = "mw-compact-playback-change";
const fallback = new Map<string, boolean>();
function subscribe(notify: () => void) {
  window.addEventListener("storage", notify);
  window.addEventListener(eventName, notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener(eventName, notify);
  };
}
export function useCompactPlayback(account: AccountSummary) {
  const allowed =
    account.status === "signed-in" &&
    account.accountStatus === "active" &&
    account.canUseCompactPlayback === true;
  const key = allowed ? `mw:compact-playback:${account.id}` : null;
  const enabled = useSyncExternalStore(
    subscribe,
    () => {
      if (!key) return false;
      if (fallback.has(key)) return fallback.get(key)!;
      try {
        return window.localStorage.getItem(key) === "true";
      } catch {
        return fallback.get(key) ?? false;
      }
    },
    () => false,
  );
  function setEnabled(value: boolean) {
    if (!key) return;
    try {
      window.localStorage.setItem(key, String(value));
      fallback.delete(key);
    } catch {
      fallback.set(key, value);
    }
    window.dispatchEvent(new Event(eventName));
  }
  return { allowed, enabled, setEnabled };
}
