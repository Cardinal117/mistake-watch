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

  const storedVolume = Number(window.localStorage.getItem("mw_player_volume"));

  if (!Number.isFinite(storedVolume) || storedVolume <= 0) {
    return DEFAULT_PLAYER_VOLUME;
  }

  return Math.min(1, Math.max(0.01, storedVolume / 100));
}
