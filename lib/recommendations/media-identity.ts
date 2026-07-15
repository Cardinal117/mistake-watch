const uploadedAssetPrefix = "mw-uploaded-asset:";

export type RecommendationMediaIdentity = {
  mediaId: string;
  sourceType: "direct" | "hls" | "uploaded" | "youtube";
};

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
    return assetId ? { mediaId: assetId, sourceType: "uploaded" } : null;
  }

  if (normalizedType === "youtube") {
    const videoId = youtubeVideoId(normalizedUrl);
    return videoId ? { mediaId: videoId, sourceType: "youtube" } : null;
  }

  return {
    mediaId: `queue:${queueItemId.trim()}`,
    sourceType: normalizedType === "hls" ? "hls" : "direct",
  };
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
