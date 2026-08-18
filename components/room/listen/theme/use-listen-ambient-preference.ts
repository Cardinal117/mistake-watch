"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  LISTEN_BACKGROUND_DIMMING,
  LISTEN_VISUAL_INTENSITY,
  normalizeListenAmbientLevel,
} from "@/lib/player/listen-visualization";

const INTENSITY_STORAGE_KEY = "mw_listen_visual_intensity_v1";
const INTENSITY_CHANGE_EVENT = "mistake-watch:listen-intensity-change";
const DIMMING_STORAGE_KEY = "mw_listen_background_dimming_v1";
const DIMMING_CHANGE_EVENT = "mistake-watch:listen-dimming-change";

let fallbackIntensity: number = LISTEN_VISUAL_INTENSITY.default;
let fallbackDimming: number = LISTEN_BACKGROUND_DIMMING.default;

export function useListenAmbientPreference() {
  const visualIntensity = useSyncExternalStore(
    subscribeToIntensity,
    readVisualIntensity,
    () => LISTEN_VISUAL_INTENSITY.default,
  );
  const backgroundDimming = useSyncExternalStore(
    subscribeToDimming,
    readBackgroundDimming,
    () => LISTEN_BACKGROUND_DIMMING.default,
  );

  const setVisualIntensity = useCallback((value: number) => {
    fallbackIntensity = normalizeListenAmbientLevel(
      value,
      LISTEN_VISUAL_INTENSITY,
    );
    writePreference(
      INTENSITY_STORAGE_KEY,
      INTENSITY_CHANGE_EVENT,
      fallbackIntensity,
    );
  }, []);

  const setBackgroundDimming = useCallback((value: number) => {
    fallbackDimming = normalizeListenAmbientLevel(
      value,
      LISTEN_BACKGROUND_DIMMING,
    );
    writePreference(DIMMING_STORAGE_KEY, DIMMING_CHANGE_EVENT, fallbackDimming);
  }, []);

  return {
    backgroundDimming,
    setBackgroundDimming,
    setVisualIntensity,
    visualIntensity,
  };
}

function readVisualIntensity() {
  return readPreference(
    INTENSITY_STORAGE_KEY,
    LISTEN_VISUAL_INTENSITY,
    fallbackIntensity,
  );
}

function readBackgroundDimming() {
  return readPreference(
    DIMMING_STORAGE_KEY,
    LISTEN_BACKGROUND_DIMMING,
    fallbackDimming,
  );
}

function subscribeToIntensity(onChange: () => void) {
  return subscribeToPreference(
    INTENSITY_STORAGE_KEY,
    INTENSITY_CHANGE_EVENT,
    LISTEN_VISUAL_INTENSITY,
    (value) => {
      fallbackIntensity = value;
      onChange();
    },
  );
}

function subscribeToDimming(onChange: () => void) {
  return subscribeToPreference(
    DIMMING_STORAGE_KEY,
    DIMMING_CHANGE_EVENT,
    LISTEN_BACKGROUND_DIMMING,
    (value) => {
      fallbackDimming = value;
      onChange();
    },
  );
}

function readPreference(
  storageKey: string,
  bounds: { default: number; max: number; min: number; step: number },
  fallback: number,
) {
  if (typeof window === "undefined") {
    return bounds.default;
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    return storedValue === null
      ? fallback
      : normalizeListenAmbientLevel(storedValue, bounds);
  } catch {
    return fallback;
  }
}

function writePreference(storageKey: string, eventName: string, value: number) {
  try {
    window.localStorage.setItem(storageKey, String(value));
  } catch {
    // The active tab still receives the preference when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail: { value } }));
}

function subscribeToPreference(
  storageKey: string,
  eventName: string,
  bounds: { default: number; max: number; min: number; step: number },
  onValue: (value: number) => void,
) {
  function handleStorageChange(event: StorageEvent) {
    if (event.key === storageKey) {
      onValue(normalizeListenAmbientLevel(event.newValue, bounds));
    }
  }

  function handleLocalChange(event: Event) {
    onValue(
      normalizeListenAmbientLevel(
        (event as CustomEvent<{ value?: number }>).detail?.value,
        bounds,
      ),
    );
  }

  window.addEventListener(eventName, handleLocalChange);
  window.addEventListener("storage", handleStorageChange);

  return () => {
    window.removeEventListener(eventName, handleLocalChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}
