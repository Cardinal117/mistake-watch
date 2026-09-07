export const PLAYER_VOLUME_EVENT = "mistake-watch:player-volume";
export const PLAYER_FULLSCREEN_EVENT = "mistake-watch:player-fullscreen";
const DEFAULT_PLAYER_VOLUME = 0.72;

export type PlayerVolumeEvent = CustomEvent<{
  volume: number;
}>;

export function dispatchPlayerVolume(volume: number) {
  window.dispatchEvent(
    new CustomEvent(PLAYER_VOLUME_EVENT, {
      detail: {
        volume: Math.min(1, Math.max(0, volume)),
      },
    }),
  );
}

export function dispatchPlayerFullscreenRequest() {
  window.dispatchEvent(new CustomEvent(PLAYER_FULLSCREEN_EVENT));
}

export function readStoredPlayerVolume() {
  if (typeof window === "undefined") {
    return DEFAULT_PLAYER_VOLUME;
  }

  try {
    const stored = window.localStorage.getItem("mw_player_volume");
    if (stored === null || !stored.trim()) return DEFAULT_PLAYER_VOLUME;
    const value = Number(stored);
    return Number.isFinite(value)
      ? Math.min(1, Math.max(0, value / 100))
      : DEFAULT_PLAYER_VOLUME;
  } catch {
    return DEFAULT_PLAYER_VOLUME;
  }
}
