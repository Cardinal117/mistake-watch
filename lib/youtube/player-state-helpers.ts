import type { CanonicalPlaybackState } from "@/lib/player/types";
import type { YouTubeAvailability } from "./availability";

export function isYouTubePlaying(state: number) {
  return state === window.YT?.PlayerState.PLAYING;
}

export function shouldAutoSkipYouTubeRuntimeError(
  availability: YouTubeAvailability,
) {
  return (
    availability.status === "removed-private" ||
    availability.status === "embed-blocked"
  );
}

export function getActivePlaybackKey(state: CanonicalPlaybackState | null) {
  if (!state?.source?.url) {
    return null;
  }

  return state.activeQueueItemId ?? state.source.url;
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}
