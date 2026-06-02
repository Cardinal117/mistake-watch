import type {
  CanonicalPlaybackState,
  LocalPlaybackSample,
  SyncCorrection,
  SyncThresholds,
} from "./types";

export const DEFAULT_SYNC_THRESHOLDS = {
  hardSeekDriftSeconds: 1.5,
  maxRateCorrection: 0.06,
  rateCorrectionDriftSeconds: 0.35,
  settledDriftSeconds: 0.075,
} satisfies SyncThresholds;

const MIN_PLAYBACK_RATE = 0.25;
const MAX_PLAYBACK_RATE = 4;
const NO_RATE_WATCH_SETTLED_DRIFT_SECONDS = 0.5;
const NO_RATE_LISTEN_SETTLED_DRIFT_SECONDS = 0.75;

export function expectedPositionAt(
  state: CanonicalPlaybackState,
  clientNowMs: number,
): number {
  const durationSeconds = state.source?.durationSeconds;
  const basePosition = clampSeconds(state.positionSeconds, durationSeconds);

  if (state.status !== "playing") {
    return basePosition;
  }

  const elapsedSeconds = Math.max(
    0,
    (clientNowMs - state.serverUpdatedAtMs) / 1000,
  );

  return clampSeconds(
    basePosition + elapsedSeconds * normalizePlaybackRate(state.playbackRate),
    durationSeconds,
  );
}

export function chooseSyncCorrection({
  clientNowMs,
  local,
  state,
  thresholds = DEFAULT_SYNC_THRESHOLDS,
}: {
  clientNowMs: number;
  local: LocalPlaybackSample;
  state: CanonicalPlaybackState;
  thresholds?: SyncThresholds;
}): SyncCorrection {
  const targetPositionSeconds = expectedPositionAt(state, clientNowMs);
  const driftSeconds = targetPositionSeconds - local.positionSeconds;
  const absoluteDrift = Math.abs(driftSeconds);
  const canonicalRate = normalizePlaybackRate(state.playbackRate);
  const rateCorrectionAllowed = shouldUseRateCorrection(state);
  const settledDriftSeconds = rateCorrectionAllowed
    ? thresholds.settledDriftSeconds
    : noRateSettledDriftSeconds(state);

  if (state.status === "error" || state.status === "buffering") {
    return {
      driftSeconds,
      kind: "wait",
      targetPositionSeconds,
    };
  }

  if (state.status === "ended") {
    return chooseStoppedCorrection({
      driftSeconds,
      local,
      targetPositionSeconds,
      thresholds,
    });
  }

  if (state.status === "paused") {
    if (absoluteDrift > settledDriftSeconds || !local.paused) {
      return {
        driftSeconds,
        kind: "pause-and-seek",
        targetPositionSeconds,
      };
    }

    return {
      driftSeconds,
      kind: "none",
      targetPositionSeconds,
    };
  }

  if (local.autoplayBlocked) {
    return {
      driftSeconds,
      kind: "user-interaction-required",
      targetPositionSeconds,
    };
  }

  if (local.paused) {
    return absoluteDrift > settledDriftSeconds
      ? {
          driftSeconds,
          kind: "seek",
          shouldPlay: true,
          targetPositionSeconds,
        }
      : {
          driftSeconds,
          kind: "play",
          playbackRate: canonicalRate,
          targetPositionSeconds,
        };
  }

  if (absoluteDrift <= settledDriftSeconds) {
    return Math.abs(local.playbackRate - canonicalRate) >
      thresholds.maxRateCorrection / 2
      ? {
          driftSeconds,
          kind: "set-playback-rate",
          playbackRate: canonicalRate,
          targetPositionSeconds,
        }
      : {
          driftSeconds,
          kind: "none",
          targetPositionSeconds,
        };
  }

  if (
    rateCorrectionAllowed &&
    absoluteDrift <= thresholds.rateCorrectionDriftSeconds
  ) {
    return {
      driftSeconds,
      kind: "set-playback-rate",
      playbackRate: calculateCorrectivePlaybackRate({
        canonicalRate,
        driftSeconds,
        thresholds,
      }),
      targetPositionSeconds,
    };
  }

  if (absoluteDrift < thresholds.hardSeekDriftSeconds) {
    return {
      driftSeconds,
      kind: "seek",
      shouldPlay: true,
      targetPositionSeconds,
    };
  }

  return {
    driftSeconds,
    kind: "hard-seek",
    shouldPlay: true,
    targetPositionSeconds,
  };
}

export function calculateCorrectivePlaybackRate({
  canonicalRate,
  driftSeconds,
  thresholds = DEFAULT_SYNC_THRESHOLDS,
}: {
  canonicalRate: number;
  driftSeconds: number;
  thresholds?: SyncThresholds;
}): number {
  const rateOffset = clamp(
    driftSeconds / thresholds.rateCorrectionDriftSeconds,
    -1,
    1,
  );

  return normalizePlaybackRate(
    canonicalRate + rateOffset * thresholds.maxRateCorrection,
  );
}

function shouldUseRateCorrection(state: CanonicalPlaybackState) {
  return state.mode === "watch" && state.source?.kind !== "youtube";
}

function noRateSettledDriftSeconds(state: CanonicalPlaybackState) {
  return state.mode === "listen"
    ? NO_RATE_LISTEN_SETTLED_DRIFT_SECONDS
    : NO_RATE_WATCH_SETTLED_DRIFT_SECONDS;
}

function chooseStoppedCorrection({
  driftSeconds,
  local,
  targetPositionSeconds,
  thresholds,
}: {
  driftSeconds: number;
  local: LocalPlaybackSample;
  targetPositionSeconds: number;
  thresholds: SyncThresholds;
}): SyncCorrection {
  if (
    Math.abs(driftSeconds) > thresholds.settledDriftSeconds ||
    !local.paused
  ) {
    return {
      driftSeconds,
      kind: "pause-and-seek",
      targetPositionSeconds,
    };
  }

  return {
    driftSeconds,
    kind: "none",
    targetPositionSeconds,
  };
}

function clampSeconds(value: number, durationSeconds?: number) {
  return clamp(value, 0, durationSeconds ?? Number.POSITIVE_INFINITY);
}

function normalizePlaybackRate(value: number) {
  return clamp(
    Number.isFinite(value) && value > 0 ? value : 1,
    MIN_PLAYBACK_RATE,
    MAX_PLAYBACK_RATE,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
