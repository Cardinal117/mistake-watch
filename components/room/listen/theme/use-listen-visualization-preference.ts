"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_LISTEN_VISUALIZATION_MODE,
  normalizeListenVisualizationMode,
  type ListenVisualizationMode,
} from "@/lib/player/listen-visualization";

const STORAGE_KEY = "mw_listen_visualization_mode_v1";
const CHANGE_EVENT = "mistake-watch:listen-visualization-change";
let fallbackMode: ListenVisualizationMode = DEFAULT_LISTEN_VISUALIZATION_MODE;

export function readListenVisualizationPreference(): ListenVisualizationMode {
  if (typeof window === "undefined") {
    return DEFAULT_LISTEN_VISUALIZATION_MODE;
  }

  try {
    const storedMode = window.localStorage.getItem(STORAGE_KEY);
    return storedMode === null
      ? fallbackMode
      : normalizeListenVisualizationMode(storedMode);
  } catch {
    return fallbackMode;
  }
}

export function writeListenVisualizationPreference(
  mode: ListenVisualizationMode,
) {
  fallbackMode = mode;

  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // The active tab still receives the preference when storage is unavailable.
  }

  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, {
      detail: { mode },
    }),
  );
}

function subscribeToListenVisualizationPreference(onChange: () => void) {
  function handleStorageChange(event: StorageEvent) {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    fallbackMode = normalizeListenVisualizationMode(event.newValue);
    onChange();
  }

  function handleLocalChange(event: Event) {
    fallbackMode = normalizeListenVisualizationMode(
      (event as CustomEvent<{ mode?: ListenVisualizationMode }>).detail?.mode,
    );
    onChange();
  }

  window.addEventListener(CHANGE_EVENT, handleLocalChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, handleLocalChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function useListenVisualizationPreference() {
  const mode = useSyncExternalStore(
    subscribeToListenVisualizationPreference,
    readListenVisualizationPreference,
    () => DEFAULT_LISTEN_VISUALIZATION_MODE,
  );

  const updateMode = useCallback((nextMode: ListenVisualizationMode) => {
    writeListenVisualizationPreference(nextMode);
  }, []);

  return { mode, setMode: updateMode };
}
