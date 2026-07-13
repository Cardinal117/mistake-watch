"use client";

import {
  Database,
  EyeOff,
  Folder,
  Grid2X2,
  List,
  ListPlus,
  Play,
  Plus,
  Radio,
  Search,
} from "lucide-react";

import { cx } from "@/lib/ui";
import type {
  LoadSourceInput,
  MediaFolder,
  MediaFolderSortDirection,
  MediaFolderSortKey,
  MediaLibraryAccess,
  QueueItemInput,
  UploadedLibraryViewMode,
  WatchMediaHubItem,
} from "../contracts";
import {
  mediaHubItemToQueueInput,
  sortUploadedLibraryItems,
} from "../media-hub/media-hub-helpers";
import { isLiveMediaHubItem } from "../presentation";
import { WatchMediaHubCard } from "./watch-media-hub-card";

export function UploadedMediaLibrary({
  access,
  assets,
  allAssets,
  canAddQueue,
  canLoadSource,
  canManageQueue,
  folders,
  isOwner,
  onAddQueueItem,
  onApproveProcessing,
  onDeleteAsset,
  onFolderSortChange,
  onFolderChange,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
  roomId,
  onVisibilityChange,
  searchQuery,
  selectedFolderId,
  setSelectedFolderId,
  setSearchQuery,
  setViewMode,
  viewMode,
}: {
  access: MediaLibraryAccess | null;
  assets: WatchMediaHubItem[];
  allAssets: WatchMediaHubItem[];
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  folders: MediaFolder[];
  isOwner: boolean;
  onAddQueueItem?(input: {
    artist?: string;
    channelName?: string;
    durationSeconds?: number;
    isPlayNext?: boolean;
    playlistId?: string;
    playlistTitle?: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
    thumbnailUrl?: string;
  }): void;
  onApproveProcessing(assetId: string): Promise<void>;
  onDeleteAsset(assetId: string): Promise<void>;
  onFolderChange(assetId: string, folderId: string | null): Promise<void>;
  onFolderSortChange(
    folderId: string,
    sortKey: MediaFolderSortKey,
    sortDirection: MediaFolderSortDirection,
  ): Promise<void>;
  onLoadSource?(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): void;
  onPlayNext?(queueItemId: string): void;
  onPlayQueueItem?(queueItemId: string): void;
  roomId: string;
  onVisibilityChange(
    assetId: string,
    visibility: "owner_only" | "public",
  ): Promise<void>;
  searchQuery: string;
  selectedFolderId: string;
  setSelectedFolderId(folderId: string): void;
  setSearchQuery(query: string): void;
  setViewMode(viewMode: UploadedLibraryViewMode): void;
  viewMode: UploadedLibraryViewMode;
}) {
  if (access && !access.canAccessUploadedCatalogue) {
    return (
      <section className="grid gap-3">
        <div>
          <p className="technical-label text-primary-fixed-dim">
            Uploaded media
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Uploaded catalogue content is hidden for this account.
          </p>
        </div>
        <div className="rounded-md border border-dashed border-white/10 bg-background/10 px-3 py-8 text-center">
          <p className="text-label-sm font-semibold text-on-surface">
            No permission to access uploaded content
          </p>
          <p className="mx-auto mt-2 max-w-xl text-label-sm text-on-surface-variant">
            {access.message}
          </p>
        </div>
      </section>
    );
  }

  const selectedFolder = folders.find(
    (folder) => folder.id === selectedFolderId,
  );
  const folderActionItems = selectedFolder
    ? sortUploadedLibraryItems(
        allAssets.filter((item) => item.folderId === selectedFolder.id),
        selectedFolder,
      )
    : [];
  const hiddenCount = allAssets.filter(
    (item) => item.visibility === "owner_only",
  ).length;
  const liveCount = allAssets.filter(isLiveMediaHubItem).length;
  const unsortedCount = allAssets.filter((item) => !item.folderId).length;

  function addMediaItem(item: WatchMediaHubItem, isPlayNext = false) {
    const input = mediaHubItemToQueueInput(item, { isPlayNext });

    if (input) {
      onAddQueueItem?.(input);
    }
  }

  function playItem(item: WatchMediaHubItem) {
    if (item.status === "queued") {
      onPlayQueueItem?.(item.id);
      return;
    }

    if (!item.sourceType || !item.sourceUrl) {
      return;
    }

    onLoadSource?.({
      sourceTitle: item.title,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
    });
  }

  function queueFolder(action: "append" | "next" | "play") {
    if (folderActionItems.length === 0) {
      return;
    }

    if (action === "play") {
      const [first, ...rest] = folderActionItems;
      playItem(first);
      rest.forEach((item) => addMediaItem(item));
      return;
    }

    folderActionItems.forEach((item) => addMediaItem(item, action === "next"));
  }

  async function updateSort(value: string) {
    if (!selectedFolder) {
      return;
    }

    const [sortKey, sortDirection] = value.split(":");

    await onFolderSortChange(
      selectedFolder.id,
      sortKey as MediaFolderSortKey,
      sortDirection as MediaFolderSortDirection,
    );
  }

  return (
    <section className="grid gap-3">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="technical-label text-primary-fixed-dim">Folders</p>
            <p className="mt-1 text-label-sm text-on-surface-variant">
              Browse uploaded media by folder, quick view, or search.
            </p>
          </div>
          <div className="inline-grid h-9 grid-cols-2 rounded-sm border border-white/10 bg-background/20 p-1">
            <button
              className={cx(
                "inline-flex items-center justify-center gap-1 rounded-sm px-3 text-label-sm font-semibold transition",
                viewMode === "grid"
                  ? "bg-primary-fixed-dim/14 text-primary-fixed-dim"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
              onClick={() => setViewMode("grid")}
              type="button"
            >
              <Grid2X2 className="h-3.5 w-3.5" aria-hidden />
              Grid
            </button>
            <button
              className={cx(
                "inline-flex items-center justify-center gap-1 rounded-sm px-3 text-label-sm font-semibold transition",
                viewMode === "list"
                  ? "bg-primary-fixed-dim/14 text-primary-fixed-dim"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
              onClick={() => setViewMode("list")}
              type="button"
            >
              <List className="h-3.5 w-3.5" aria-hidden />
              List
            </button>
          </div>
        </div>
        <label className="grid h-10 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-sm border border-white/10 bg-surface-container-low px-3">
          <Search className="h-4 w-4 text-on-surface-variant" aria-hidden />
          <input
            className="min-w-0 bg-transparent text-label-sm text-on-surface outline-none placeholder:text-on-surface-variant/55"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search uploaded media, folders, episodes, or numbers"
            value={searchQuery}
          />
        </label>
      </div>

      <div className="grid gap-2">
        <p className="technical-label text-on-surface">Quick views</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className={cx(
              "inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-label-sm transition",
              selectedFolderId === "all"
                ? "border-primary-fixed-dim/45 bg-primary-fixed-dim/12 text-primary-fixed-dim"
                : "border-white/10 bg-background/18 text-on-surface-variant",
            )}
            onClick={() => setSelectedFolderId("all")}
            type="button"
          >
            <Database className="h-3.5 w-3.5" aria-hidden />
            See all media
            <span className="text-[11px] opacity-70">{allAssets.length}</span>
          </button>
          <button
            className={cx(
              "inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-label-sm transition",
              selectedFolderId === "unsorted"
                ? "border-primary-fixed-dim/45 bg-primary-fixed-dim/12 text-primary-fixed-dim"
                : "border-white/10 bg-background/18 text-on-surface-variant",
            )}
            onClick={() => setSelectedFolderId("unsorted")}
            type="button"
          >
            <Folder className="h-3.5 w-3.5" aria-hidden />
            Unsorted
            <span className="text-[11px] opacity-70">{unsortedCount}</span>
          </button>
          <button
            className={cx(
              "inline-flex h-9 items-center gap-2 rounded-sm border px-3 text-label-sm transition",
              selectedFolderId === "live"
                ? "border-primary-fixed-dim/45 bg-primary-fixed-dim/12 text-primary-fixed-dim"
                : "border-white/10 bg-background/18 text-on-surface-variant",
            )}
            onClick={() => setSelectedFolderId("live")}
            type="button"
          >
            <Radio className="h-3.5 w-3.5" aria-hidden />
            Live
            <span className="text-[11px] opacity-70">{liveCount}</span>
          </button>
          {isOwner && hiddenCount > 0 ? (
            <span className="inline-flex h-9 items-center gap-2 rounded-sm border border-white/10 bg-background/12 px-3 text-label-sm text-on-surface-variant">
              <EyeOff className="h-3.5 w-3.5" aria-hidden />
              {hiddenCount} hidden
            </span>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2">
        <p className="technical-label text-on-surface">Folders</p>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder) => (
            <button
              className={cx(
                "grid min-h-20 gap-1 rounded-md border p-3 text-left transition",
                selectedFolderId === folder.id
                  ? "border-primary-fixed-dim/45 bg-primary-fixed-dim/12 text-primary-fixed-dim"
                  : "border-white/10 bg-background/18 text-on-surface-variant",
              )}
              key={folder.id}
              onClick={() => setSelectedFolderId(folder.id)}
              type="button"
            >
              <span className="inline-flex items-center gap-2">
                <Folder className="h-3.5 w-3.5" aria-hidden />
                <span className="truncate font-semibold">{folder.name}</span>
              </span>
              <span className="text-[11px] text-on-surface-variant">
                {allAssets.filter((item) => item.folderId === folder.id).length}{" "}
                items
              </span>
            </button>
          ))}
          {folders.length === 0 ? (
            <div className="rounded-md border border-dashed border-white/10 bg-background/10 px-3 py-4 text-label-sm text-on-surface-variant">
              No folders yet
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 border-t border-white/10 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="technical-label text-primary-fixed-dim">
              {selectedFolder?.name ??
                (selectedFolderId === "all"
                  ? "All media"
                  : selectedFolderId === "live"
                    ? "Live"
                    : "Unsorted")}
            </p>
            <p className="mt-1 text-label-sm text-on-surface-variant">
              {assets.length} visible result{assets.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedFolder ? (
              <>
                <select
                  className="h-9 rounded-sm border border-white/10 bg-surface-container-low px-3 text-label-sm text-on-surface outline-none focus:border-primary-fixed-dim/60"
                  onChange={(event) => void updateSort(event.target.value)}
                  value={`${selectedFolder.defaultSortKey}:${selectedFolder.defaultSortDirection}`}
                >
                  <option value="name:asc">Name A-Z</option>
                  <option value="name:desc">Name Z-A</option>
                  <option value="created_at:desc">Recently added</option>
                  <option value="created_at:asc">Oldest added</option>
                  <option value="duration_seconds:asc">
                    Shortest duration
                  </option>
                  <option value="duration_seconds:desc">
                    Longest duration
                  </option>
                </select>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-primary-fixed-dim/35 bg-primary-fixed-dim/10 px-3 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/16 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canLoadSource || folderActionItems.length === 0}
                  onClick={() => queueFolder("play")}
                  type="button"
                >
                  <Play className="h-3.5 w-3.5" aria-hidden />
                  Play folder
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-white/10 bg-background/20 px-3 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/12 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canAddQueue || folderActionItems.length === 0}
                  onClick={() => queueFolder("next")}
                  type="button"
                >
                  <ListPlus className="h-3.5 w-3.5" aria-hidden />
                  Add next
                </button>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-white/10 bg-background/20 px-3 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/12 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={!canAddQueue || folderActionItems.length === 0}
                  onClick={() => queueFolder("append")}
                  type="button"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Queue folder
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {assets.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {assets.map((item) => (
              <WatchMediaHubCard
                canAddQueue={canAddQueue}
                canLoadSource={canLoadSource}
                canManageQueue={canManageQueue}
                folders={folders}
                isOwner={isOwner}
                item={item}
                key={item.id}
                layout="grid"
                onAddQueueItem={onAddQueueItem}
                onApproveProcessing={onApproveProcessing}
                onDeleteAsset={onDeleteAsset}
                onFolderChange={onFolderChange}
                onLoadSource={onLoadSource}
                onPlayNext={onPlayNext}
                onPlayQueueItem={onPlayQueueItem}
                roomId={roomId}
                onVisibilityChange={onVisibilityChange}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            {assets.map((item) => (
              <WatchMediaHubCard
                canAddQueue={canAddQueue}
                canLoadSource={canLoadSource}
                canManageQueue={canManageQueue}
                folders={folders}
                isOwner={isOwner}
                item={item}
                key={item.id}
                layout="list"
                onAddQueueItem={onAddQueueItem}
                onApproveProcessing={onApproveProcessing}
                onDeleteAsset={onDeleteAsset}
                onFolderChange={onFolderChange}
                onLoadSource={onLoadSource}
                onPlayNext={onPlayNext}
                onPlayQueueItem={onPlayQueueItem}
                roomId={roomId}
                onVisibilityChange={onVisibilityChange}
              />
            ))}
          </div>
        )
      ) : (
        <div className="rounded-md border border-dashed border-white/10 bg-background/10 px-3 py-8 text-center text-label-sm text-on-surface-variant">
          No uploaded media matches this view
        </div>
      )}
    </section>
  );
}
