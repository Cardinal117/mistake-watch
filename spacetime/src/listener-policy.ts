export type CoverageInterval = [number, number];
export type ListenerSample = {
  atMs: number;
  position: number;
  sequence: number;
  anchorMs: number;
  audible: boolean;
};
export const LISTENER_MAX_GAP_MS = 20_000;
export const LISTENER_STATE_TTL_MS = 6 * 60 * 60 * 1000;
export const LISTENER_RECEIPT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const LISTENER_ROOM_STATE_LIMIT = 2048;
export const LISTENER_ROOM_OUTBOX_LIMIT = 512;

export function qualifyingInterval(
  previous: ListenerSample | null,
  current: ListenerSample,
  context: {
    duration?: number;
    canonicalPosition: number;
    rate: number;
    playing: boolean;
    validFromMs: number;
  },
): CoverageInterval | null {
  const { duration, rate } = context;
  if (
    !previous ||
    !duration ||
    !Number.isFinite(duration) ||
    duration > 21600 ||
    !Number.isFinite(rate) ||
    rate <= 0 ||
    rate > 4 ||
    !context.playing ||
    !previous.audible ||
    !current.audible ||
    current.sequence <= previous.sequence ||
    previous.anchorMs !== current.anchorMs ||
    previous.atMs < context.validFromMs ||
    !Number.isFinite(current.position) ||
    !Number.isFinite(previous.position) ||
    !Number.isFinite(context.canonicalPosition)
  )
    return null;
  const elapsed = current.atMs - previous.atMs;
  const delta = current.position - previous.position;
  if (
    !Number.isFinite(elapsed) ||
    elapsed <= 0 ||
    elapsed > LISTENER_MAX_GAP_MS ||
    previous.position < 0 ||
    current.position > duration + 0.25 ||
    delta <= 0 ||
    delta > (elapsed / 1000) * rate + 0.25 ||
    Math.abs(current.position - context.canonicalPosition) > 2.5
  )
    return null;
  // Tolerance admits clock jitter but never credits more than elapsed playback.
  return [
    previous.position,
    Math.min(
      duration,
      previous.position + Math.min(delta, (elapsed / 1000) * rate),
    ),
  ];
}

export function mergeCoverage(
  existing: CoverageInterval[],
  added: CoverageInterval,
): CoverageInterval[] {
  const sorted = [...existing, added].sort((a, b) => a[0] - b[0]);
  const merged: CoverageInterval[] = [];
  for (const pair of sorted) {
    const last = merged[merged.length - 1];
    if (last && pair[0] <= last[1]) last[1] = Math.max(last[1], pair[1]);
    else merged.push([...pair]);
  }
  // Conservative loss beats inventing coverage across unobserved gaps.
  return merged.length <= 128 ? merged : existing;
}

export function coverageRatio(intervals: CoverageInterval[], duration: number) {
  return Math.min(
    10000,
    Math.floor(
      (intervals.reduce((sum, [start, end]) => sum + end - start, 0) /
        duration) *
        10000,
    ),
  );
}
