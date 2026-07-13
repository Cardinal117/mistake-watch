export type NormalizedMediaFailure = {
  code:
    | "embed-blocked"
    | "player-error"
    | "provider-unavailable"
    | "removed-private"
    | "unknown";
  permanent: boolean;
  reason: string;
};

export function normalizeMediaFailure(
  failureCode: string,
): NormalizedMediaFailure {
  switch (failureCode) {
    case "removed-private":
      return {
        code: "removed-private",
        permanent: true,
        reason: "This YouTube item was removed, unavailable, or made private.",
      };
    case "embed-blocked":
      return {
        code: "embed-blocked",
        permanent: true,
        reason: "The owner does not allow this YouTube item to play embedded.",
      };
    case "player-error":
      return {
        code: "player-error",
        permanent: false,
        reason: "YouTube could not play this item in the embedded player.",
      };
    case "provider-unavailable":
      return {
        code: "provider-unavailable",
        permanent: false,
        reason: "YouTube could not complete the playback request.",
      };
    default:
      return {
        code: "unknown",
        permanent: false,
        reason: "YouTube playback failed for an unknown reason.",
      };
  }
}

export function isPermanentMediaFailureCode(failureCode?: string) {
  return failureCode === "removed-private" || failureCode === "embed-blocked";
}

function youtubeProviderId(sourceUrl: string) {
  const trimmed = sourceUrl.trim();

  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return (
    trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1] ??
    trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)?.[1] ??
    trimmed.match(/embed\/([A-Za-z0-9_-]{11})/)?.[1]
  );
}

export function mediaProviderId(
  sourceType: string,
  sourceUrl: string,
  queueItemId?: string,
) {
  if (sourceType === "youtube") {
    return youtubeProviderId(sourceUrl) ?? queueItemId ?? "unknown-youtube";
  }

  return queueItemId ?? "room-media";
}

export function createMediaFailureEvent(input: {
  actorMemberId: string;
  canAdvance: boolean;
  failure: NormalizedMediaFailure;
  queueItemId?: string;
  roomId: string;
  sourceType: "direct" | "hls" | "youtube";
  sourceUrl: string;
  title: string;
}) {
  const title = input.title.trim().slice(0, 160) || "Current media";

  return {
    actorMemberId: input.actorMemberId,
    actorSource: "system" as const,
    code: `media_${input.failure.code}`,
    eventType: input.canAdvance
      ? "media-auto-skipped"
      : "media-playback-failed",
    message: input.canAdvance
      ? `Skipped ${title}. ${input.failure.reason}`
      : `${title} could not play. ${input.failure.reason}`,
    permanent: input.failure.permanent,
    providerId: mediaProviderId(
      input.sourceType,
      input.sourceUrl,
      input.queueItemId,
    ),
    queueItemId: input.queueItemId,
    roomId: input.roomId,
    severity: input.failure.permanent
      ? ("warning" as const)
      : ("error" as const),
    sourceType: input.sourceType,
    title,
  };
}
