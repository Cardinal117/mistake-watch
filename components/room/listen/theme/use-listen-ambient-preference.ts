"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_LISTEN_AMBIENT_FALLBACK_ENABLED,
  DEFAULT_LISTEN_VISUALIZER_ARTWORK_ENABLED,
  LISTEN_BACKGROUND_DIMMING,
  LISTEN_BACKGROUND_VIBRANCY,
  LISTEN_VISUAL_INTENSITY,
  normalizeListenAmbientLevel,
  normalizeListenBooleanPreference,
} from "@/lib/player/listen-visualization";

const INTENSITY_STORAGE_KEY = "mw_listen_visual_intensity_v1";
const INTENSITY_CHANGE_EVENT = "mistake-watch:listen-intensity-change";
const DIMMING_STORAGE_KEY = "mw_listen_background_dimming_v1";
const DIMMING_CHANGE_EVENT = "mistake-watch:listen-dimming-change";
const VIBRANCY_STORAGE_KEY = "mw_listen_background_vibrancy_v1";
const VIBRANCY_CHANGE_EVENT = "mistake-watch:listen-vibrancy-change";
const AMBIENT_FALLBACK_STORAGE_KEY = "mw_listen_ambient_fallback_enabled_v1";
const AMBIENT_FALLBACK_CHANGE_EVENT =
  "mistake-watch:listen-ambient-fallback-change";
const VISUALIZER_ARTWORK_STORAGE_KEY =
  "mw_listen_visualizer_artwork_enabled_v1";
const VISUALIZER_ARTWORK_CHANGE_EVENT =
  "mistake-watch:listen-visualizer-artwork-change";

let fallbackIntensity: number = LISTEN_VISUAL_INTENSITY.default;
let fallbackDimming: number = LISTEN_BACKGROUND_DIMMING.default;
let fallbackVibrancy: number = LISTEN_BACKGROUND_VIBRANCY.default;
let fallbackAmbientFallbackEnabled = DEFAULT_LISTEN_AMBIENT_FALLBACK_ENABLED;
let fallbackVisualizerArtworkEnabled =
  DEFAULT_LISTEN_VISUALIZER_ARTWORK_ENABLED;

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
  const backgroundVibrancy = useSyncExternalStore(
    subscribeToVibrancy,
    readBackgroundVibrancy,
    () => LISTEN_BACKGROUND_VIBRANCY.default,
  );
  const ambientFallbackEnabled = useSyncExternalStore(
    subscribeToAmbientFallback,
    readAmbientFallbackEnabled,
    () => DEFAULT_LISTEN_AMBIENT_FALLBACK_ENABLED,
  );
  const visualizerArtworkEnabled = useSyncExternalStore(
    subscribeToVisualizerArtwork,
    readVisualizerArtworkEnabled,
    () => DEFAULT_LISTEN_VISUALIZER_ARTWORK_ENABLED,
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

  const setBackgroundVibrancy = useCallback((value: number) => {
    fallbackVibrancy = normalizeListenAmbientLevel(
      value,
      LISTEN_BACKGROUND_VIBRANCY,
    );
    writePreference(
      VIBRANCY_STORAGE_KEY,
      VIBRANCY_CHANGE_EVENT,
      fallbackVibrancy,
    );
  }, []);

  const setAmbientFallbackEnabled = useCallback((value: boolean) => {
    fallbackAmbientFallbackEnabled = value;
    writePreference(
      AMBIENT_FALLBACK_STORAGE_KEY,
      AMBIENT_FALLBACK_CHANGE_EVENT,
      value,
    );
  }, []);

  const setVisualizerArtworkEnabled = useCallback((value: boolean) => {
    fallbackVisualizerArtworkEnabled = value;
    writePreference(
      VISUALIZER_ARTWORK_STORAGE_KEY,
      VISUALIZER_ARTWORK_CHANGE_EVENT,
      value,
    );
  }, []);

  return {
    ambientFallbackEnabled,
    backgroundDimming,
    backgroundVibrancy,
    setAmbientFallbackEnabled,
    setBackgroundDimming,
    setBackgroundVibrancy,
    setVisualizerArtworkEnabled,
    setVisualIntensity,
    visualizerArtworkEnabled,
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

function readBackgroundVibrancy() {
  return readPreference(
    VIBRANCY_STORAGE_KEY,
    LISTEN_BACKGROUND_VIBRANCY,
    fallbackVibrancy,
  );
}

function readAmbientFallbackEnabled() {
  return readBooleanPreference(
    AMBIENT_FALLBACK_STORAGE_KEY,
    fallbackAmbientFallbackEnabled,
  );
}

function readVisualizerArtworkEnabled() {
  return readBooleanPreference(
    VISUALIZER_ARTWORK_STORAGE_KEY,
    fallbackVisualizerArtworkEnabled,
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

function subscribeToVibrancy(onChange: () => void) {
  return subscribeToPreference(
    VIBRANCY_STORAGE_KEY,
    VIBRANCY_CHANGE_EVENT,
    LISTEN_BACKGROUND_VIBRANCY,
    (value) => {
      fallbackVibrancy = value;
      onChange();
    },
  );
}

function subscribeToAmbientFallback(onChange: () => void) {
  return subscribeToBooleanPreference(
    AMBIENT_FALLBACK_STORAGE_KEY,
    AMBIENT_FALLBACK_CHANGE_EVENT,
    DEFAULT_LISTEN_AMBIENT_FALLBACK_ENABLED,
    (value) => {
      fallbackAmbientFallbackEnabled = value;
      onChange();
    },
  );
}

function subscribeToVisualizerArtwork(onChange: () => void) {
  return subscribeToBooleanPreference(
    VISUALIZER_ARTWORK_STORAGE_KEY,
    VISUALIZER_ARTWORK_CHANGE_EVENT,
    DEFAULT_LISTEN_VISUALIZER_ARTWORK_ENABLED,
    (value) => {
      fallbackVisualizerArtworkEnabled = value;
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

function readBooleanPreference(storageKey: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;

  try {
    return normalizeListenBooleanPreference(
      window.localStorage.getItem(storageKey),
      fallback,
    );
  } catch {
    return fallback;
  }
}

function writePreference(
  storageKey: string,
  eventName: string,
  value: boolean | number,
) {
  try {
    window.localStorage.setItem(storageKey, String(value));
  } catch {
    // The active tab still receives the preference when storage is unavailable.
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail: { value } }));
}

function subscribeToBooleanPreference(
  storageKey: string,
  eventName: string,
  fallback: boolean,
  onValue: (value: boolean) => void,
) {
  function handleStorageChange(event: StorageEvent) {
    if (event.key === storageKey) {
      onValue(normalizeListenBooleanPreference(event.newValue, fallback));
    }
  }

  function handleLocalChange(event: Event) {
    onValue(
      normalizeListenBooleanPreference(
        (event as CustomEvent<{ value?: boolean }>).detail?.value,
        fallback,
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
