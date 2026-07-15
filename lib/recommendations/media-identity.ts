const uploadedAssetPrefix = "mw-uploaded-asset:";
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const recommendationSourceTypes = new Set([
  "direct",
  "hls",
  "uploaded",
  "youtube",
]);

export type RecommendationMediaIdentity = {
  mediaId: string;
  sourceType: "direct" | "hls" | "uploaded" | "youtube";
};

export function normalizeRecommendationMediaIdentity({
  mediaId,
  sourceType,
}: {
  mediaId: string;
  sourceType: string;
}): RecommendationMediaIdentity | null {
  const normalizedMediaId = mediaId.trim();
  const normalizedSourceType = sourceType.trim().toLowerCase();

  if (
    !recommendationSourceTypes.has(normalizedSourceType) ||
    !isValidMediaId(normalizedSourceType, normalizedMediaId)
  ) {
    return null;
  }

  return {
    mediaId: normalizedMediaId,
    sourceType:
      normalizedSourceType as RecommendationMediaIdentity["sourceType"],
  };
}

export function recommendationMediaKey(identity: RecommendationMediaIdentity) {
  return `${identity.sourceType}:${identity.mediaId}`;
}

export function recommendationMediaIdentity({
  queueItemId,
  sourceType,
  sourceUrl,
}: {
  queueItemId: string;
  sourceType: string;
  sourceUrl: string;
}): RecommendationMediaIdentity | null {
  const normalizedType = sourceType.trim().toLowerCase();
  const normalizedUrl = sourceUrl.trim();

  if (!queueItemId.trim() || !normalizedUrl) {
    return null;
  }

  if (normalizedUrl.startsWith(uploadedAssetPrefix)) {
    const assetId = normalizedUrl.slice(uploadedAssetPrefix.length).trim();
    return normalizeRecommendationMediaIdentity({
      mediaId: assetId,
      sourceType: "uploaded",
    });
  }

  if (normalizedType === "youtube") {
    const videoId = youtubeVideoId(normalizedUrl);
    return videoId
      ? normalizeRecommendationMediaIdentity({
          mediaId: videoId,
          sourceType: "youtube",
        })
      : null;
  }

  return normalizeRecommendationMediaIdentity({
    mediaId: `queue:${queueItemId.trim()}`,
    sourceType: normalizedType === "hls" ? "hls" : "direct",
  });
}

function youtubeVideoId(value: string) {
  try {
    const url = new URL(value);

    if (url.hostname === "youtu.be") {
      return boundedProviderId(url.pathname.slice(1));
    }

    if (url.hostname.endsWith("youtube.com")) {
      return boundedProviderId(url.searchParams.get("v") ?? "");
    }
  } catch {
    return boundedProviderId(value);
  }

  return null;
}

function boundedProviderId(value: string) {
  const normalized = value.trim();
  return /^[A-Za-z0-9_-]{6,64}$/.test(normalized) ? normalized : null;
}

function isValidMediaId(sourceType: string, mediaId: string) {
  if (!mediaId || mediaId.length > 180) {
    return false;
  }

  if (sourceType === "youtube") {
    return /^[A-Za-z0-9_-]{6,64}$/.test(mediaId);
  }

  if (sourceType === "uploaded") {
    return uuidPattern.test(mediaId);
  }

  return (
    mediaId.startsWith("queue:") &&
    mediaId.length > "queue:".length &&
    !/[/?#\\\s]/.test(mediaId.slice("queue:".length))
  );
}
