export const RHYTHM_CONTRACT_VERSION = 1;
export const RHYTHM_STALE_AFTER_SECONDS = 2;

const BPM_MIN = 40;
const BPM_MAX = 240;
const INTERVAL_MIN_SECONDS = 60 / BPM_MAX;
const INTERVAL_MAX_SECONDS = 60 / BPM_MIN;

export function createRhythmFrameV1(value) {
  const bpm = nullableRange(value.bpm, BPM_MIN, BPM_MAX);
  const interval = nullableRange(
    value.beatIntervalSeconds,
    INTERVAL_MIN_SECONDS,
    INTERVAL_MAX_SECONDS,
  );
  const hasTempo = bpm !== null && interval !== null;

  return Object.freeze({
    version: RHYTHM_CONTRACT_VERSION,
    sequence: toNonNegativeInteger(value.sequence),
    sampledAtSeconds: toNonNegative(value.sampledAtSeconds),
    bpm: hasTempo ? bpm : null,
    beatIntervalSeconds: hasTempo ? interval : null,
    beatOffsetSeconds: hasTempo
      ? clamp(
          value.beatOffsetSeconds,
          0,
          Math.max(0, interval - Number.EPSILON),
        )
      : null,
    confidence: clampUnit(value.confidence),
    onset: clampUnit(value.onset),
    bass: clampUnit(value.bass),
    mids: clampUnit(value.mids),
    highs: clampUnit(value.highs),
    energy: clampUnit(value.energy),
  });
}

export function normalizeRhythmFrameV1(value) {
  if (
    value?.version !== RHYTHM_CONTRACT_VERSION ||
    !Number.isInteger(value.sequence) ||
    value.sequence < 0 ||
    !isNonNegativeFinite(value.sampledAtSeconds) ||
    !areFinite(
      value.confidence,
      value.onset,
      value.bass,
      value.mids,
      value.highs,
      value.energy,
    )
  ) {
    return null;
  }

  const hasNoTempo =
    value.bpm === null &&
    value.beatIntervalSeconds === null &&
    value.beatOffsetSeconds === null;
  const hasValidTempo =
    isInRange(value.bpm, BPM_MIN, BPM_MAX) &&
    isInRange(
      value.beatIntervalSeconds,
      INTERVAL_MIN_SECONDS,
      INTERVAL_MAX_SECONDS,
    ) &&
    isInRange(value.beatOffsetSeconds, 0, value.beatIntervalSeconds, false);

  if (!hasNoTempo && !hasValidTempo) {
    return null;
  }

  return createRhythmFrameV1(value);
}

export function isFreshRhythmFrame(
  candidate,
  previous,
  currentSourceTimeSeconds,
  staleAfterSeconds = RHYTHM_STALE_AFTER_SECONDS,
) {
  const frame = normalizeRhythmFrameV1(candidate);

  if (!frame || frame.sequence <= (previous?.sequence ?? -1)) {
    return false;
  }

  if (
    previous &&
    frame.sampledAtSeconds < (previous.sampledAtSeconds ?? -Infinity)
  ) {
    return false;
  }

  return (
    currentSourceTimeSeconds - frame.sampledAtSeconds >= 0 &&
    currentSourceTimeSeconds - frame.sampledAtSeconds <= staleAfterSeconds
  );
}

function areFinite(...values) {
  return values.every(Number.isFinite);
}

function clamp(value, minimum, maximum) {
  return Math.min(
    maximum,
    Math.max(minimum, Number.isFinite(value) ? value : 0),
  );
}

function clampUnit(value) {
  return clamp(value, 0, 1);
}

function isInRange(value, minimum, maximum, inclusiveMaximum = true) {
  return (
    Number.isFinite(value) &&
    value >= minimum &&
    (inclusiveMaximum ? value <= maximum : value < maximum)
  );
}

function isNonNegativeFinite(value) {
  return Number.isFinite(value) && value >= 0;
}

function nullableRange(value, minimum, maximum) {
  return isInRange(value, minimum, maximum) ? value : null;
}

function toNonNegative(value) {
  return isNonNegativeFinite(value) ? value : 0;
}

function toNonNegativeInteger(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
