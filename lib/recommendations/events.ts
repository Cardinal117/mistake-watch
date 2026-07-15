export const recommendationEventSchemaVersion = 1;

export const recommendationEventTypes = [
  "queue_added",
  "queue_removed",
  "queue_reordered",
  "queue_play_next",
  "playback_started",
  "playback_completed",
  "playback_skipped",
  "playback_replayed",
  "source_failed",
  "media_liked",
  "media_unliked",
] as const;

export type RecommendationEventType = (typeof recommendationEventTypes)[number];

export type RecommendationEventContract = {
  actorMemberId?: string;
  completionRatioBps?: number;
  contributorMemberId?: string;
  createdMs: bigint;
  durationSeconds?: number;
  eventId: string;
  eventType: RecommendationEventType;
  idempotencyKey: string;
  mediaId?: string;
  playbackOccurrenceId?: string;
  position?: number;
  queueItemId?: string;
  reason?: string;
  roomId: string;
  roomSessionId: string;
  schemaVersion: typeof recommendationEventSchemaVersion;
  sourceType?: string;
};

export const recommendationEventPrivacyFields = [
  "eventId",
  "eventType",
  "idempotencyKey",
  "roomId",
  "roomSessionId",
  "playbackOccurrenceId",
  "queueItemId",
  "actorMemberId",
  "contributorMemberId",
  "sourceType",
  "mediaId",
  "reason",
  "position",
  "durationSeconds",
  "completionRatioBps",
  "createdMs",
] as const;

export const forbiddenRecommendationEventFields = [
  "email",
  "oauthToken",
  "displayName",
  "sourceUrl",
  "signedUrl",
  "publicUrl",
  "r2Url",
] as const;

export function clampCompletionRatioBps(
  positionSeconds?: number,
  durationSeconds?: number,
) {
  if (
    !Number.isFinite(positionSeconds) ||
    !Number.isFinite(durationSeconds) ||
    !durationSeconds ||
    durationSeconds <= 0
  ) {
    return undefined;
  }

  return Math.max(
    0,
    Math.min(10_000, Math.round((positionSeconds! / durationSeconds) * 10_000)),
  );
}
