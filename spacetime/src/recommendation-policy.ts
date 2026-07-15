export const RECOMMENDATION_OUTBOX_BATCH_LIMIT = 100;

export function completionRatioBps(
  positionSeconds: number,
  durationSeconds?: number,
) {
  if (!durationSeconds || durationSeconds <= 0) {
    return undefined;
  }

  return Math.max(
    0,
    Math.min(10_000, Math.round((positionSeconds / durationSeconds) * 10_000)),
  );
}

export function classifyPlaybackAdvance(input: {
  autoplay: boolean;
  completionRatioBps?: number;
  playbackStatus: string;
}) {
  const completed =
    input.autoplay &&
    (input.playbackStatus === "ended" ||
      (input.completionRatioBps ?? 0) >= 9_000);

  return {
    outcome: completed ? ("completed" as const) : ("skipped" as const),
    reason: completed
      ? "ended_autoplay"
      : input.autoplay
        ? "autoplay_before_completion_threshold"
        : "manual_next",
  };
}

export function recommendationMediaIdentity(input: {
  queueItemId: string;
  sourceType: string;
  sourceUrl: string;
}) {
  const sourceUrl = input.sourceUrl.trim();
  const queueItemId = input.queueItemId.trim();

  if (!queueItemId || !sourceUrl) {
    return null;
  }

  if (sourceUrl.startsWith("mw-uploaded-asset:")) {
    const mediaId = sourceUrl.slice("mw-uploaded-asset:".length).trim();
    return mediaId ? { mediaId, sourceType: "uploaded" } : null;
  }

  if (input.sourceType.trim().toLowerCase() === "youtube") {
    const mediaId = youtubeVideoId(sourceUrl);
    return mediaId ? { mediaId, sourceType: "youtube" } : null;
  }

  return {
    mediaId: `queue:${queueItemId}`,
    sourceType:
      input.sourceType.trim().toLowerCase() === "hls" ? "hls" : "direct",
  };
}

export function selectRecommendationOutboxBatch<
  Row extends { created_ms: bigint; event_id: string },
>(rows: Iterable<Row>, requestedLimit: number) {
  const limit = Math.max(
    1,
    Math.min(RECOMMENDATION_OUTBOX_BATCH_LIMIT, Math.floor(requestedLimit)),
  );

  return [...rows]
    .sort((left, right) =>
      left.created_ms === right.created_ms
        ? left.event_id.localeCompare(right.event_id)
        : left.created_ms < right.created_ms
          ? -1
          : 1,
    )
    .slice(0, limit);
}

function youtubeVideoId(value: string) {
  const watchMatch = value.match(/[?&]v=([A-Za-z0-9_-]{6,64})/);
  const shortMatch = value.match(/youtu\.be\/([A-Za-z0-9_-]{6,64})/);
  const rawMatch = value.match(/^[A-Za-z0-9_-]{6,64}$/);
  return watchMatch?.[1] ?? shortMatch?.[1] ?? rawMatch?.[0] ?? null;
}
