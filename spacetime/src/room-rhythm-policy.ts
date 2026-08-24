export const ROOM_RHYTHM_MIN_BPM = 40;
export const ROOM_RHYTHM_MAX_BPM = 240;
export const ROOM_RHYTHM_MIN_CONFIDENCE = 0.5;
export const ROOM_RHYTHM_MIN_TTL_MS = 5_000;
export const ROOM_RHYTHM_MAX_TTL_MS = 15_000;
export const ROOM_RHYTHM_MIN_PUBLISH_INTERVAL_MS = 2_000;
export const ROOM_RHYTHM_MAX_ALGORITHM_LENGTH = 48;

type RhythmActor = {
  memberId: string;
  role: string;
  senderMatches: boolean;
};

type RhythmSession = {
  hostMemberId: string;
  playbackOccurrenceId?: string | null;
  roomId: string;
  sourceType?: string | null;
  sourceUrl?: string | null;
  status: string;
};

export type RoomRhythmProfileValue = {
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
};

type PublicationCandidate = Omit<
  RoomRhythmProfileValue,
  "expiresMs" | "publishedMs" | "sourceType"
> & {
  ttlMs: number;
};

type PolicyFailure = {
  accepted: false;
  reason: string;
};

export function evaluateRoomRhythmPublication(input: {
  actor: RhythmActor | null;
  candidate: PublicationCandidate;
  current: RoomRhythmProfileValue | null;
  nowMs: number;
  session: RhythmSession | null;
}): PolicyFailure | { accepted: true; row: RoomRhythmProfileValue } {
  const authorityFailure = validateAuthority(input.actor, input.session);
  if (authorityFailure) return authorityFailure;

  const { candidate, current, nowMs, session } = input;
  if (!session || candidate.roomId !== session.roomId) {
    return failure("room_mismatch");
  }
  if (session.sourceType !== "youtube") {
    return failure("source_mismatch");
  }
  if (session.status !== "playing") {
    return failure("playback_inactive");
  }

  const activeMediaId = youtubeVideoId(session.sourceUrl ?? "");
  if (!activeMediaId || candidate.mediaId !== activeMediaId) {
    return failure("media_mismatch");
  }
  if (
    !session.playbackOccurrenceId ||
    candidate.playbackOccurrenceId !== session.playbackOccurrenceId
  ) {
    return failure("occurrence_mismatch");
  }
  if (!isValidCandidate(candidate)) {
    return failure("invalid_profile");
  }

  const expectedRevision = current ? current.revision + 1 : 1;
  if (candidate.revision !== expectedRevision) {
    return failure("revision_mismatch");
  }
  if (
    current?.playbackOccurrenceId === candidate.playbackOccurrenceId &&
    nowMs - current.publishedMs < ROOM_RHYTHM_MIN_PUBLISH_INTERVAL_MS
  ) {
    return failure("rate_limited");
  }

  return {
    accepted: true,
    row: {
      algorithmVersion: candidate.algorithmVersion.trim(),
      beatIntervalSeconds: candidate.beatIntervalSeconds,
      bpm: candidate.bpm,
      confidence: candidate.confidence,
      expiresMs: nowMs + candidate.ttlMs,
      mediaBeatOffsetSeconds: candidate.mediaBeatOffsetSeconds,
      mediaId: candidate.mediaId,
      playbackOccurrenceId: candidate.playbackOccurrenceId,
      publishedMs: nowMs,
      revision: candidate.revision,
      roomId: candidate.roomId,
      sourceType: "youtube",
    },
  };
}

export function evaluateRoomRhythmClear(input: {
  actor: RhythmActor | null;
  current: RoomRhythmProfileValue | null;
  expectedPlaybackOccurrenceId: string;
  expectedRevision: number;
  roomId: string;
  session: RhythmSession | null;
}): PolicyFailure | { accepted: true } {
  const authorityFailure = validateAuthority(input.actor, input.session);
  if (authorityFailure) return authorityFailure;
  if (!input.session || input.roomId !== input.session.roomId) {
    return failure("room_mismatch");
  }
  if (!input.current) {
    return failure("profile_missing");
  }
  if (input.current.revision !== input.expectedRevision) {
    return failure("revision_mismatch");
  }
  if (
    input.current.playbackOccurrenceId !== input.expectedPlaybackOccurrenceId
  ) {
    return failure("occurrence_mismatch");
  }
  return { accepted: true };
}

function validateAuthority(
  actor: RhythmActor | null,
  session: RhythmSession | null,
) {
  if (
    !actor ||
    !session ||
    actor.role !== "host" ||
    actor.memberId !== session.hostMemberId ||
    !actor.senderMatches
  ) {
    return failure("permission_denied");
  }
  return null;
}

function isValidCandidate(candidate: PublicationCandidate) {
  const expectedInterval = 60 / candidate.bpm;
  const intervalTolerance = Math.max(0.005, expectedInterval * 0.02);
  const algorithmVersion = candidate.algorithmVersion.trim();

  return (
    isRange(candidate.bpm, ROOM_RHYTHM_MIN_BPM, ROOM_RHYTHM_MAX_BPM) &&
    isRange(candidate.beatIntervalSeconds, 0.25, 1.5) &&
    Math.abs(candidate.beatIntervalSeconds - expectedInterval) <=
      intervalTolerance &&
    isRange(
      candidate.mediaBeatOffsetSeconds,
      0,
      candidate.beatIntervalSeconds,
      false,
    ) &&
    isRange(candidate.confidence, ROOM_RHYTHM_MIN_CONFIDENCE, 1) &&
    Number.isInteger(candidate.revision) &&
    candidate.revision > 0 &&
    Number.isInteger(candidate.ttlMs) &&
    candidate.ttlMs >= ROOM_RHYTHM_MIN_TTL_MS &&
    candidate.ttlMs <= ROOM_RHYTHM_MAX_TTL_MS &&
    algorithmVersion.length > 0 &&
    algorithmVersion.length <= ROOM_RHYTHM_MAX_ALGORITHM_LENGTH
  );
}

function youtubeVideoId(value: string) {
  const trimmed = value.trim();
  const rawMatch = trimmed.match(/^[A-Za-z0-9_-]{11}$/);
  if (rawMatch) return rawMatch[0];

  const shortMatch = trimmed.match(
    /^https?:\/\/(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})(?:[/?#&]|$)/i,
  );
  if (shortMatch) return shortMatch[1];

  const pathMatch = trimmed.match(
    /^https?:\/\/(?:(?:www|m|music)\.)?youtube\.com\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})(?:[/?#&]|$)/i,
  );
  if (pathMatch) return pathMatch[1];

  const watchMatch = trimmed.match(
    /^https?:\/\/(?:(?:www|m|music)\.)?youtube\.com\/watch\?([^#]*)/i,
  );
  const queryId = watchMatch?.[1].match(/(?:^|&)v=([A-Za-z0-9_-]{11})(?:&|$)/);
  return queryId?.[1] ?? null;
}

function isRange(
  value: number,
  minimum: number,
  maximum: number,
  inclusiveMaximum = true,
) {
  return (
    Number.isFinite(value) &&
    value >= minimum &&
    (inclusiveMaximum ? value <= maximum : value < maximum)
  );
}

function failure(reason: string): PolicyFailure {
  return { accepted: false, reason };
}
