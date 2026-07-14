import { createUploadedAssetReference } from "@/lib/media/uploaded-playback-reference";
import type { QueueAddInput } from "../../queue/contracts";
import type { PlaylistPreviewItem } from "./contracts";

type MediaLibraryAsset = {
  durationSeconds: number | null;
  id: string;
  publicUrl: string;
  sourceMatches: Array<{
    sourceId: string;
    sourceType: string;
    status: string;
  }>;
  thumbnailUrl: string | null;
  title: string;
};

export async function fetchFirstPartyMediaMatches(videoIds: string[]) {
  const uniqueVideoIds = Array.from(
    new Set(videoIds.filter((videoId) => /^[a-zA-Z0-9_-]{11}$/.test(videoId))),
  );

  if (uniqueVideoIds.length === 0) {
    return new Map<string, MediaLibraryAsset>();
  }

  const response = await fetch("/api/media/source-matches", {
    body: JSON.stringify({
      sources: uniqueVideoIds.map((videoId) => ({
        sourceId: videoId,
        sourceType: "youtube",
      })),
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as { assets?: MediaLibraryAsset[] };

  if (!response.ok || !payload.assets) {
    return new Map<string, MediaLibraryAsset>();
  }

  const matches = new Map<string, MediaLibraryAsset>();

  for (const asset of payload.assets) {
    for (const match of asset.sourceMatches) {
      if (match.sourceType === "youtube") {
        matches.set(match.sourceId, asset);
      }
    }
  }

  return matches;
}

export function playlistItemToQueueInput(
  item: PlaylistPreviewItem,
  options: {
    playlistId?: string | null;
    playlistTitle?: string | null;
  },
): QueueAddInput {
  return {
    artist: item.channelTitle ?? undefined,
    channelName: item.channelTitle ?? undefined,
    durationSeconds: item.durationSeconds ?? undefined,
    playlistId: options.playlistId ?? undefined,
    playlistTitle: options.playlistTitle ?? undefined,
    sourceTitle: item.title,
    sourceType: "youtube",
    sourceUrl: item.sourceUrl,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
  };
}

export function firstPartyAssetToQueueInput(
  asset: MediaLibraryAsset,
  item: Pick<
    PlaylistPreviewItem,
    "channelTitle" | "durationSeconds" | "sourceUrl" | "thumbnailUrl" | "title"
  >,
): QueueAddInput {
  return {
    artist: item.channelTitle ?? "Mistake Watch Library",
    channelName: item.channelTitle ?? undefined,
    durationSeconds: asset.durationSeconds ?? item.durationSeconds ?? undefined,
    playlistId: undefined,
    playlistTitle: "Matched first-party media",
    sourceTitle: asset.title || item.title,
    sourceType: "direct",
    sourceUrl: createUploadedAssetReference(asset.id),
    thumbnailUrl: asset.thumbnailUrl ?? item.thumbnailUrl ?? undefined,
  };
}
