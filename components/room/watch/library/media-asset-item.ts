import { createUploadedAssetReference } from "@/lib/media/uploaded-playback-reference";
import type { MediaLibraryAsset, WatchMediaHubItem } from "../contracts";
import { formatDuration } from "../presentation";
export function mediaAssetToHubItem(
  asset: MediaLibraryAsset,
): WatchMediaHubItem {
  return {
    addedAt: asset.createdAt,
    addedBy: "R2 library",
    artist: "Mistake Watch Library",
    channelName: undefined,
    duration:
      typeof asset.durationSeconds === "number"
        ? formatDuration(asset.durationSeconds)
        : "Ready",
    folderId: asset.folderId,
    id: asset.id,
    isLive: asset.isLive,
    isPinned: false,
    isPlayNext: false,
    isUnavailable: asset.status !== "ready",
    playedSequence: undefined,
    playlistId: undefined,
    playlistTitle: undefined,
    processingEstimatedCredits: asset.processingEstimatedCredits,
    processingRequiresApproval: asset.processingRequiresApproval,
    processingStatus: asset.processingStatus,
    processingStrategy: asset.processingStrategy,
    sourceType: "direct",
    sourceUrl: createUploadedAssetReference(asset.id),
    status: "library",
    thumbnailUrl: asset.thumbnailUrl ?? undefined,
    title: asset.title,
    visibility: asset.visibility,
    videoId:
      asset.sourceMatches.find((match) => match.sourceType === "youtube")
        ?.sourceId ?? undefined,
  };
}
