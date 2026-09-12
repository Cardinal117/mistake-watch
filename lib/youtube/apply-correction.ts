import { chooseSyncCorrection } from "../player/sync";
import type { CanonicalPlaybackState } from "../player/types";
import type { YoutubePlayer } from "./iframe-api";
import type { YouTubeCorrectionGate } from "./correction-gate";

/** All immediate resync paths use the same settling policy as periodic sync. */
export function applyYouTubeCorrection(
  player: YoutubePlayer,
  state: CanonicalPlaybackState,
  gate: YouTubeCorrectionGate,
  now: number,
  forcePlayAttempt = false,
) {
  const playing = player.getPlayerState() === 1;
  const correction = chooseSyncCorrection({
    state,
    clientNowMs: now,
    local: {
      positionSeconds: player.getCurrentTime() || 0,
      playbackRate: player.getPlaybackRate() || 1,
      paused: !playing,
    },
  });
  if (
    !forcePlayAttempt &&
    !gate.allow({
      state,
      correction,
      now,
      buffering: player.getPlayerState() === 3,
    })
  )
    return false;
  if (forcePlayAttempt) gate.applied(state, now);
  if (["seek", "hard-seek", "pause-and-seek"].includes(correction.kind)) {
    player.seekTo(correction.targetPositionSeconds, true);
  }
  if (state.status === "playing" && (forcePlayAttempt || !playing))
    player.playVideo();
  else if (state.status === "paused" || state.status === "ended")
    player.pauseVideo();
  return true;
}
