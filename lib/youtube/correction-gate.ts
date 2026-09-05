import type { CanonicalPlaybackState, SyncCorrection } from "../player/types";

// Iframe commands and clock samples are asynchronous. Give a seek time to
// settle instead of restarting the provider's buffer on every room sync tick.
const SETTLE_MS = 2500;
const BUFFER_RETRY_MS = 8000;
const PLAYING_DRIFT_SECONDS = 2;

export class YouTubeCorrectionGate {
  private state: CanonicalPlaybackState | null = null;
  private issuedAt = -Infinity;
  private bufferingSince: number | null = null;

  observe(state: CanonicalPlaybackState) {
    const previous = this.state;
    const changed =
      !previous ||
      previous.source?.url !== state.source?.url ||
      previous.activeQueueItemId !== state.activeQueueItemId ||
      previous.status !== state.status ||
      previous.positionSeconds !== state.positionSeconds ||
      Math.abs(previous.serverUpdatedAtMs - state.serverUpdatedAtMs) > 500;
    if (changed) this.state = state;
    return changed;
  }

  applied(state: CanonicalPlaybackState, now: number) {
    this.observe(state);
    this.issuedAt = now;
  }

  allow({
    state,
    correction,
    buffering,
    now,
  }: {
    state: CanonicalPlaybackState;
    correction: SyncCorrection;
    buffering: boolean;
    now: number;
  }) {
    const newCommand = this.observe(state);
    if (buffering) this.bufferingSince ??= now;
    else this.bufferingSince = null;
    if (correction.kind === "none" || correction.kind === "wait") return false;
    if (correction.kind === "user-interaction-required") return true;
    if (!newCommand) {
      if (buffering && now - this.bufferingSince! < BUFFER_RETRY_MS)
        return false;
      if (now - this.issuedAt < SETTLE_MS) return false;
      if (
        state.status === "playing" &&
        (correction.kind === "seek" || correction.kind === "hard-seek") &&
        Math.abs(correction.driftSeconds) <= PLAYING_DRIFT_SECONDS
      )
        return false;
    }
    this.issuedAt = now;
    if (buffering) this.bufferingSince = now;
    return true;
  }
}
