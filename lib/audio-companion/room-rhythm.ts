import type { RhythmFrameV1 } from "./client";

export const ROOM_RHYTHM_ALGORITHM_VERSION = "first-party-beat-v1";
export const ROOM_RHYTHM_INITIAL_RETRY_MS = 2_000;
export const ROOM_RHYTHM_PUBLICATION_TTL_MS = 12_000;
export const ROOM_RHYTHM_REFRESH_MS = 6_000;
export const ROOM_RHYTHM_MIN_CONFIDENCE = 0.5;

export type SharedRoomRhythmProfile = Readonly<{
  algorithmVersion: string;
  beatIntervalSeconds: number;
  bpm: number;
  confidence: number;
  expiresMs: number;
  mediaBeatOffsetSeconds: number;
  mediaId: string;
  playbackOccurrenceId: string;
  publishedMs: number;
  revision: number;
  roomId: string;
  sourceType: "youtube";
}>;

export type RoomRhythmPublication = Readonly<{
  algorithmVersion: string;
  beatIntervalSeconds: number;
  bpm: number;
  confidence: number;
  mediaBeatOffsetSeconds: number;
  mediaId: string;
  playbackOccurrenceId: string;
  revision: number;
  ttlMs: number;
}>;

type PublicationContext = {
  algorithmVersion: string;
  currentRevision: number;
  mediaId: string;
  mediaPositionSeconds: number;
  playbackOccurrenceId: string;
};

export function selectRoomRhythmPublicationContext(input: {
  algorithmVersion: string;
  canManageAuthority: boolean;
  connectionStatus: string;
  currentRevision: number;
  mediaId: string | null;
  mediaPositionSeconds: number;
  playbackOccurrenceId: string | null;
  playbackStatus: string;
  sourceType: string | null;
}): PublicationContext | null {
  if (
    !input.canManageAuthority ||
    input.connectionStatus !== "connected" ||
    input.sourceType !== "youtube" ||
    input.playbackStatus !== "playing" ||
    !input.mediaId ||
    !input.playbackOccurrenceId
  ) {
    return null;
  }

  return {
    algorithmVersion: input.algorithmVersion,
    currentRevision: input.currentRevision,
    mediaId: input.mediaId,
    mediaPositionSeconds: input.mediaPositionSeconds,
    playbackOccurrenceId: input.playbackOccurrenceId,
  };
}

export type StableRoomRhythmState = Readonly<{
  consistentObservations: number;
  frame: RhythmFrameV1;
  mediaBeatOffsetSeconds: number;
  mediaId: string;
  playbackOccurrenceId: string;
}>;

export function mapCaptureBeatOffsetToMediaTime(input: {
  beatIntervalSeconds: number;
  captureBeatOffsetSeconds: number;
  captureSampledAtSeconds: number;
  mediaPositionSeconds: number;
}) {
  return roundRhythm(
    positiveModulo(
      input.mediaPositionSeconds -
        input.captureSampledAtSeconds +
        input.captureBeatOffsetSeconds,
      input.beatIntervalSeconds,
    ),
  );
}

export function observeStableRoomRhythm(
  previous: StableRoomRhythmState | null,
  input: { context: PublicationContext; frame: RhythmFrameV1 },
): {
  publication: RoomRhythmPublication | null;
  state: StableRoomRhythmState | null;
} {
  const { context, frame } = input;
  if (!isPublishableFrame(frame)) {
    return { publication: null, state: null };
  }

  const mediaBeatOffsetSeconds = mapCaptureBeatOffsetToMediaTime({
    beatIntervalSeconds: frame.beatIntervalSeconds,
    captureBeatOffsetSeconds: frame.beatOffsetSeconds,
    captureSampledAtSeconds: frame.sampledAtSeconds,
    mediaPositionSeconds: context.mediaPositionSeconds,
  });
  const consistent = isConsistent(
    previous,
    context,
    frame,
    mediaBeatOffsetSeconds,
  );
  const previousObservationCount = previous?.consistentObservations ?? 0;
  const state = Object.freeze({
    consistentObservations: consistent ? previousObservationCount + 1 : 1,
    frame,
    mediaBeatOffsetSeconds,
    mediaId: context.mediaId,
    playbackOccurrenceId: context.playbackOccurrenceId,
  });

  if (state.consistentObservations < 2) {
    return { publication: null, state };
  }

  return {
    publication: Object.freeze({
      algorithmVersion: context.algorithmVersion,
      beatIntervalSeconds: frame.beatIntervalSeconds,
      bpm: frame.bpm,
      confidence: frame.confidence,
      mediaBeatOffsetSeconds,
      mediaId: context.mediaId,
      playbackOccurrenceId: context.playbackOccurrenceId,
      revision: context.currentRevision + 1,
      ttlMs: ROOM_RHYTHM_PUBLICATION_TTL_MS,
    }),
    state,
  };
}

export function isRoomRhythmPublicationDue(input: {
  hasPublishedProfile: boolean;
  lastAttemptMs: number | null;
  nowMs: number;
}) {
  if (input.lastAttemptMs === null) {
    return true;
  }

  const interval = input.hasPublishedProfile
    ? ROOM_RHYTHM_REFRESH_MS
    : ROOM_RHYTHM_INITIAL_RETRY_MS;
  return input.nowMs - input.lastAttemptMs >= interval;
}

export function isUsableRoomRhythmProfile(
  profile: SharedRoomRhythmProfile | null,
  active: {
    algorithmVersion: string;
    mediaId: string;
    nowMs: number;
    playbackOccurrenceId: string;
  },
) {
  return Boolean(
    profile &&
    profile.sourceType === "youtube" &&
    profile.mediaId === active.mediaId &&
    profile.playbackOccurrenceId === active.playbackOccurrenceId &&
    profile.algorithmVersion === active.algorithmVersion &&
    profile.expiresMs > active.nowMs,
  );
}

export function roomRhythmPhase(input: {
  beatIntervalSeconds: number;
  mediaBeatOffsetSeconds: number;
  mediaPositionSeconds: number;
}) {
  return roundRhythm(
    positiveModulo(
      input.mediaPositionSeconds - input.mediaBeatOffsetSeconds,
      input.beatIntervalSeconds,
    ) / input.beatIntervalSeconds,
  );
}

function isPublishableFrame(frame: RhythmFrameV1): frame is RhythmFrameV1 & {
  beatIntervalSeconds: number;
  beatOffsetSeconds: number;
  bpm: number;
} {
  return (
    frame.bpm !== null &&
    frame.beatIntervalSeconds !== null &&
    frame.beatOffsetSeconds !== null &&
    frame.confidence >= ROOM_RHYTHM_MIN_CONFIDENCE
  );
}

function isConsistent(
  previous: StableRoomRhythmState | null,
  context: PublicationContext,
  frame: RhythmFrameV1 & {
    beatIntervalSeconds: number;
    beatOffsetSeconds: number;
    bpm: number;
  },
  mediaBeatOffsetSeconds: number,
) {
  if (
    !previous ||
    previous.mediaId !== context.mediaId ||
    previous.playbackOccurrenceId !== context.playbackOccurrenceId ||
    frame.sequence <= previous.frame.sequence ||
    previous.frame.bpm === null
  ) {
    return false;
  }

  const bpmTolerance = Math.max(1, previous.frame.bpm * 0.02);
  const phaseTolerance = Math.max(0.04, frame.beatIntervalSeconds * 0.15);
  const phaseDistance = circularDistance(
    mediaBeatOffsetSeconds,
    previous.mediaBeatOffsetSeconds,
    frame.beatIntervalSeconds,
  );
  return (
    Math.abs(frame.bpm - previous.frame.bpm) <= bpmTolerance &&
    phaseDistance <= phaseTolerance
  );
}

function circularDistance(left: number, right: number, interval: number) {
  const direct = Math.abs(left - right);
  return Math.min(direct, interval - direct);
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function roundRhythm(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}
