import type { YoutubePlayer } from "@/lib/youtube/iframe-api";

export function safeNumber(value: number) {
  return Number.isFinite(value) ? value : undefined;
}

export function safeDurationSeconds(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : undefined;
}

export function isUsableYouTubePlayer(
  player: Partial<YoutubePlayer> | null,
): player is YoutubePlayer {
  return Boolean(
    player &&
    typeof player.getCurrentTime === "function" &&
    typeof player.getDuration === "function" &&
    typeof player.getPlaybackRate === "function" &&
    typeof player.getPlayerState === "function" &&
    typeof player.getVideoData === "function" &&
    typeof player.cueVideoById === "function" &&
    typeof player.loadVideoById === "function" &&
    typeof player.mute === "function" &&
    typeof player.pauseVideo === "function" &&
    typeof player.playVideo === "function" &&
    typeof player.seekTo === "function" &&
    typeof player.setPlaybackRate === "function" &&
    typeof player.setVolume === "function" &&
    typeof player.unMute === "function",
  );
}

export function destroyYouTubePlayer(player: Partial<YoutubePlayer> | null) {
  if (player && typeof player.destroy === "function") {
    player.destroy();
  }
}
