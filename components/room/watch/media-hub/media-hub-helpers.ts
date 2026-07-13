import { createUploadedAssetReference } from "@/lib/media/uploaded-playback-reference";

import type {
  MediaFolder,
  MediaFolderSortDirection,
  MediaFolderSortKey,
  MediaLibraryAsset,
  WatchMediaHubItem,
} from "../contracts";
import { formatDuration, parseDurationSeconds } from "../presentation";
import { captureVideoPoster } from "../uploads/media-inspection";
import { uploadBlobToR2 } from "../uploads/upload-transport";

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

export async function moveAssetToFolder(
  assetId: string,
  folderId: string | null,
) {
  const response = await fetch(`/api/media/assets/${assetId}/folder`, {
    body: JSON.stringify({ folderId }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const payload = (await response.json()) as {
    asset?: MediaLibraryAsset;
    error?: string;
  };

  if (!response.ok || !payload.asset) {
    throw new Error(payload.error ?? "Media asset could not be moved.");
  }

  return payload.asset;
}

export async function updateAssetVisibility(
  assetId: string,
  visibility: "owner_only" | "public",
) {
  const response = await fetch(`/api/media/assets/${assetId}/visibility`, {
    body: JSON.stringify({ visibility }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const payload = (await response.json()) as {
    asset?: MediaLibraryAsset;
    error?: string;
  };

  if (!response.ok || !payload.asset) {
    throw new Error(payload.error ?? "Media visibility could not be updated.");
  }

  return payload.asset;
}

export async function createUploadedPlaybackSession(input: {
  assetId: string;
  roomId: string;
}) {
  const response = await fetch("/api/media/room-sessions", {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as {
    error?: string;
    session?: {
      id: string;
    };
  };

  if (!response.ok || !payload.session) {
    throw new Error(payload.error ?? "Uploaded media session could not start.");
  }

  return payload.session;
}

export async function approveAssetProcessing(assetId: string) {
  const response = await fetch(`/api/media/assets/${assetId}/processing`, {
    method: "POST",
  });
  const payload = (await response.json()) as {
    asset?: MediaLibraryAsset;
    error?: string;
  };

  if (!response.ok || !payload.asset) {
    throw new Error(payload.error ?? "Media conversion could not be approved.");
  }

  return payload.asset;
}

export async function deleteAsset(assetId: string) {
  const response = await fetch(`/api/media/assets/${assetId}`, {
    method: "DELETE",
  });
  const payload = (await response.json()) as {
    error?: string;
    ok?: boolean;
  };

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? "Media asset could not be deleted.");
  }
}

export async function updateFolderSort(
  folderId: string,
  sortKey: MediaFolderSortKey,
  sortDirection: MediaFolderSortDirection,
) {
  const response = await fetch(`/api/media/folders/${folderId}/sort`, {
    body: JSON.stringify({ sortDirection, sortKey }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });
  const payload = (await response.json()) as {
    error?: string;
    folder?: MediaFolder;
  };

  if (!response.ok || !payload.folder) {
    throw new Error(payload.error ?? "Folder sort could not be updated.");
  }

  return payload.folder;
}

export function mediaHubItemToQueueInput(
  item: WatchMediaHubItem,
  options: { isPlayNext?: boolean } = {},
) {
  if (!item.sourceType || !item.sourceUrl) {
    return null;
  }

  return {
    artist: item.artist,
    channelName: item.channelName,
    durationSeconds:
      item.duration === "Metadata pending"
        ? undefined
        : parseDurationSeconds(item.duration),
    isPlayNext: options.isPlayNext,
    playlistId: item.playlistId,
    playlistTitle: item.playlistTitle,
    sourceTitle: item.title,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    thumbnailUrl: item.thumbnailUrl,
  };
}

export function filterUploadedLibraryItems({
  folders,
  items,
  query,
}: {
  folders: MediaFolder[];
  items: WatchMediaHubItem[];
  query: string;
}) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const folderName =
      folders.find((folder) => folder.id === item.folderId)?.name ?? "unsorted";
    const searchable = normalizeSearchText(
      [
        item.title,
        item.artist,
        item.channelName,
        item.duration,
        item.sourceType,
        folderName,
        item.isLive ? "live" : "",
      ].join(" "),
    );

    return normalizedQuery
      .split(" ")
      .every((token) => searchable.includes(token));
  });
}

export function sortUploadedLibraryItems(
  items: WatchMediaHubItem[],
  folder: MediaFolder | null,
) {
  const sortKey = folder?.defaultSortKey ?? "created_at";
  const direction = folder?.defaultSortDirection ?? "desc";
  const multiplier = direction === "asc" ? 1 : -1;

  return [...items].sort((first, second) => {
    if (sortKey === "name") {
      return first.title.localeCompare(second.title) * multiplier;
    }

    if (sortKey === "duration_seconds") {
      return (
        ((parseDurationSeconds(first.duration) ?? Number.MAX_SAFE_INTEGER) -
          (parseDurationSeconds(second.duration) ?? Number.MAX_SAFE_INTEGER)) *
        multiplier
      );
    }

    return (
      (new Date(first.addedAt ?? 0).getTime() -
        new Date(second.addedAt ?? 0).getTime()) *
      multiplier
    );
  });
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function captureAndUploadPoster(
  asset: MediaLibraryAsset,
  onComplete: (asset: MediaLibraryAsset) => void,
) {
  try {
    const blob = await captureVideoPoster(asset.publicUrl);
    const createResponse = await fetch(
      `/api/media/assets/${asset.id}/poster-upload`,
      { method: "POST" },
    );
    const createPayload = (await createResponse.json()) as {
      error?: string;
      objectKey?: string;
      uploadUrl?: string;
    };

    if (
      !createResponse.ok ||
      !createPayload.objectKey ||
      !createPayload.uploadUrl
    ) {
      throw new Error(createPayload.error ?? "Poster upload could not start.");
    }

    await uploadBlobToR2(blob, createPayload.uploadUrl, "image/jpeg");

    const completeResponse = await fetch(
      `/api/media/assets/${asset.id}/poster`,
      {
        body: JSON.stringify({ objectKey: createPayload.objectKey }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    const completePayload = (await completeResponse.json()) as {
      asset?: MediaLibraryAsset;
      error?: string;
    };

    if (!completeResponse.ok || !completePayload.asset) {
      throw new Error(completePayload.error ?? "Poster could not be saved.");
    }

    onComplete(completePayload.asset);
  } catch {
    // Poster capture is best-effort; the asset remains playable with fallback art.
  }
}
