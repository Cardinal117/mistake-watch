import { expectedPositionAt } from "./sync";
import type { CanonicalPlaybackState } from "./types";

// Native duration is more precise than rounded room metadata. Treat the end as
// locally stopped while the host's ended update travels to other participants;
// play() on an ended element can otherwise restart it from the beginning.
export function boundDirectPlaybackState(
  state: CanonicalPlaybackState,
  durationSeconds: number,
  nowMs: number,
): CanonicalPlaybackState {
  if (
    !state.source ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    return state;
  }

  const bounded = {
    ...state,
    source: { ...state.source, durationSeconds },
  };
  if (
    state.status === "playing" &&
    expectedPositionAt(bounded, nowMs) >= durationSeconds
  ) {
    return { ...bounded, status: "ended", positionSeconds: durationSeconds };
  }
  return bounded;
}
