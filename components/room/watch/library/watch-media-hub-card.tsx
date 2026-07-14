"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Eye,
  EyeOff,
  Film,
  History,
  ListPlus,
  MoreVertical,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

import {
  createUploadedSessionReference,
  parseUploadedAssetReference,
} from "@/lib/media/uploaded-playback-reference";
import { resolveMediaAssetDisplayState } from "@/lib/media/processing-display-state";
import { SignalStatusChip } from "@/components/ui";
import { cx } from "@/lib/ui";
import type {
  MediaFolder,
  UploadedLibraryViewMode,
  WatchMediaHubItem,
} from "../contracts";
import {
  createUploadedPlaybackSession,
  mediaHubItemToQueueInput,
} from "../media-hub/media-hub-helpers";
import { formatCreditEstimate, parseDurationSeconds } from "../presentation";
import { LazyMediaPoster } from "./lazy-media-poster";

export function WatchMediaHubCard({
  canAddQueue,
  canLoadSource,
  canManageQueue,
  folders = [],
  isOwner = false,
  item,
  layout = "grid",
  onAddQueueItem,
  onApproveProcessing,
  onDeleteAsset,
  onFolderChange,
  onLoadSource,
  onPlayNext,
  onPlayQueueItem,
  posterEager = false,
  posterScrollRootRef,
  roomId,
  onVisibilityChange,
}: {
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  folders?: MediaFolder[];
  isOwner?: boolean;
  item: WatchMediaHubItem;
  layout?: UploadedLibraryViewMode;
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
  onApproveProcessing?(assetId: string): Promise<void>;
  onDeleteAsset?(assetId: string): Promise<void>;
  onFolderChange?(assetId: string, folderId: string | null): Promise<void>;
  onLoadSource?(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): void;
  onPlayNext?(queueItemId: string): void;
  onPlayQueueItem?(queueItemId: string): void;
  posterEager?: boolean;
  posterScrollRootRef?: RefObject<HTMLDivElement | null>;
  roomId: string;
  onVisibilityChange?(
    assetId: string,
    visibility: "owner_only" | "public",
  ): Promise<void>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    placement: "bottom" | "top";
    top: number;
  } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const canUseQueueSource = Boolean(item.sourceUrl && item.sourceType);
  const queued = item.status === "queued";
  const library = item.status === "library";
  const hidden = item.visibility === "owner_only";
  const mediaDisplayState = library
    ? resolveMediaAssetDisplayState(item)
    : null;
  const approvalRequired = mediaDisplayState?.state === "blocked";
  const processingFailed = mediaDisplayState?.state === "failed";
  const processing =
    mediaDisplayState?.state === "processing" ||
    mediaDisplayState?.state === "queued";
  const playbackBlocked = processing || approvalRequired || processingFailed;
  const directActionsDisabled = {
    add:
      playbackBlocked ||
      queued ||
      !canAddQueue ||
      !canUseQueueSource ||
      !onAddQueueItem,
    next: queued
      ? !canManageQueue || !onPlayNext
      : playbackBlocked ||
        !canAddQueue ||
        !canUseQueueSource ||
        !onAddQueueItem,
    play: queued
      ? !canManageQueue || !onPlayQueueItem
      : playbackBlocked ||
        !canLoadSource ||
        !canUseQueueSource ||
        !onLoadSource,
  };

  function addQueueItem(isPlayNext = false) {
    if (!canUseQueueSource || !item.sourceType || !item.sourceUrl) {
      return;
    }

    onAddQueueItem?.({
      artist: item.artist,
      channelName: item.channelName,
      durationSeconds:
        item.duration === "Metadata pending"
          ? undefined
          : parseDurationSeconds(item.duration),
      isPlayNext,
      playlistId: item.playlistId,
      playlistTitle: item.playlistTitle,
      sourceTitle: item.title,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      thumbnailUrl: item.thumbnailUrl,
    });
  }

  async function playNow() {
    if (queued) {
      onPlayQueueItem?.(item.id);
      return;
    }

    if (!canUseQueueSource || !item.sourceType || !item.sourceUrl) {
      return;
    }

    const assetId = parseUploadedAssetReference(item.sourceUrl);

    if (assetId) {
      const session = await createUploadedPlaybackSession({
        assetId,
        roomId,
      });

      onLoadSource?.({
        sourceTitle: item.title,
        sourceType: "direct",
        sourceUrl: createUploadedSessionReference(session.id),
      });
      return;
    }

    onLoadSource?.({
      sourceTitle: item.title,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
    });
  }

  function playNext() {
    if (queued) {
      onPlayNext?.(item.id);
      return;
    }

    addQueueItem(true);
  }

  async function changeFolder(folderId: string | null) {
    await onFolderChange?.(item.id, folderId);
    setMenuOpen(false);
  }

  async function toggleVisibility() {
    await onVisibilityChange?.(item.id, hidden ? "public" : "owner_only");
    setMenuOpen(false);
  }

  async function deleteFile() {
    const confirmed = window.confirm(
      `Delete "${item.title}" from the uploaded media library? This removes the R2 file and cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    await onDeleteAsset?.(item.id);
    setMenuOpen(false);
  }

  async function approveProcessing() {
    await onApproveProcessing?.(item.id);
    setMenuOpen(false);
  }

  function toggleMenu() {
    if (menuOpen) {
      setMenuOpen(false);
      return;
    }

    const rect = menuButtonRef.current?.getBoundingClientRect();

    if (!rect) {
      setMenuOpen(true);
      return;
    }

    const menuWidth = 240;
    const menuHeight = isOwner ? 360 : 130;
    const viewportPadding = 12;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement =
      spaceBelow < menuHeight + viewportPadding ? "top" : "bottom";
    const top =
      placement === "top"
        ? Math.max(viewportPadding, rect.top - menuHeight - 8)
        : Math.min(
            window.innerHeight - viewportPadding - menuHeight,
            rect.bottom + 8,
          );
    const maxLeft = Math.max(
      viewportPadding,
      window.innerWidth - viewportPadding - menuWidth,
    );
    const left = Math.min(
      maxLeft,
      Math.max(viewportPadding, rect.right - menuWidth),
    );

    setMenuPosition({ left, placement, top });
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function closeMenu() {
      setMenuOpen(false);
    }

    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);

    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [menuOpen]);

  const actionMenu = (
    <div
      className="watch-menu-popover fixed z-[95] grid max-h-[min(24rem,calc(100dvh-1.5rem))] w-60 gap-1 overflow-y-auto rounded-md border border-white/10 bg-surface-container-low/95 p-1.5 text-label-sm shadow-[0_18px_48px_rgb(0_0_0_/_0.35)] backdrop-blur-xl"
      data-placement={menuPosition?.placement ?? "bottom"}
      style={{
        left: menuPosition?.left ?? 12,
        top: menuPosition?.top ?? 12,
      }}
    >
      <button
        className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-on-surface transition hover:bg-primary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={directActionsDisabled.play || approvalRequired}
        onClick={() => {
          playNow();
          setMenuOpen(false);
        }}
        type="button"
      >
        <Play className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
        Play now
      </button>
      <button
        className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-on-surface transition hover:bg-primary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={directActionsDisabled.next || approvalRequired}
        onClick={() => {
          playNext();
          setMenuOpen(false);
        }}
        type="button"
      >
        <ListPlus className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
        Add next
      </button>
      <button
        className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-on-surface transition hover:bg-primary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-45"
        disabled={directActionsDisabled.add || approvalRequired}
        onClick={() => {
          addQueueItem();
          setMenuOpen(false);
        }}
        type="button"
      >
        <Plus className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
        Add to queue
      </button>
      {isOwner ? (
        <>
          {approvalRequired || processingFailed ? (
            <>
              <div className="my-1 h-px bg-white/10" />
              <button
                className="flex min-h-8 items-center gap-2 rounded-sm px-2 py-1 text-left text-secondary-fixed-dim transition hover:bg-secondary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!onApproveProcessing}
                onClick={() => void approveProcessing()}
                type="button"
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                <span className="grid gap-0.5">
                  <span>
                    {processingFailed
                      ? "Retry conversion"
                      : "Approve conversion"}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {processingFailed
                      ? "Uses the stored R2 source file"
                      : formatCreditEstimate(item.processingEstimatedCredits)}
                  </span>
                </span>
              </button>
            </>
          ) : null}
          <div className="my-1 h-px bg-white/10" />
          <button
            className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-on-surface transition hover:bg-primary-fixed-dim/10 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!onVisibilityChange}
            onClick={() => void toggleVisibility()}
            type="button"
          >
            {hidden ? (
              <EyeOff
                className="h-3.5 w-3.5 text-primary-fixed-dim"
                aria-hidden
              />
            ) : (
              <Eye className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden />
            )}
            <span className="min-w-0 flex-1">
              {hidden ? "Hidden from viewers" : "Visible to viewers"}
            </span>
            <Check
              className={cx(
                "h-3.5 w-3.5",
                hidden ? "opacity-100" : "opacity-0",
              )}
              aria-hidden
            />
          </button>
          <div className="grid gap-1 px-2 py-1">
            <span className="technical-label text-on-surface-variant">
              Move to folder
            </span>
            <button
              className={cx(
                "flex h-7 items-center justify-between rounded-sm px-2 text-left transition hover:bg-primary-fixed-dim/10",
                !item.folderId ? "text-primary-fixed-dim" : "text-on-surface",
              )}
              onClick={() => void changeFolder(null)}
              type="button"
            >
              Unsorted
              {!item.folderId ? (
                <Check className="h-3.5 w-3.5" aria-hidden />
              ) : null}
            </button>
            {folders.map((folder) => (
              <button
                className={cx(
                  "flex h-7 items-center justify-between rounded-sm px-2 text-left transition hover:bg-primary-fixed-dim/10",
                  item.folderId === folder.id
                    ? "text-primary-fixed-dim"
                    : "text-on-surface",
                )}
                key={folder.id}
                onClick={() => void changeFolder(folder.id)}
                type="button"
              >
                <span className="truncate">{folder.name}</span>
                {item.folderId === folder.id ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : null}
              </button>
            ))}
          </div>
          {library ? (
            <>
              <div className="my-1 h-px bg-white/10" />
              <button
                className="flex h-8 items-center gap-2 rounded-sm px-2 text-left text-error transition hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!onDeleteAsset}
                onClick={() => void deleteFile()}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete file
              </button>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
  const renderedActionMenu =
    menuOpen && menuPosition ? createPortal(actionMenu, document.body) : null;

  if (layout === "list") {
    return (
      <article
        className="relative grid gap-3 rounded-md border border-white/10 bg-background/12 p-2 transition hover:border-primary-fixed-dim/30 md:grid-cols-[6rem_minmax(0,1fr)_auto_auto] md:items-center"
        data-media-asset-id={item.id}
      >
        <div className="aspect-video overflow-hidden rounded-sm bg-surface-container-lowest">
          {item.thumbnailUrl ? (
            <LazyMediaPoster
              eager={posterEager}
              scrollRootRef={posterScrollRootRef}
              src={item.thumbnailUrl}
            />
          ) : (
            <div className="grid h-full place-items-center text-primary-fixed-dim">
              <Film className="h-5 w-5" aria-hidden />
            </div>
          )}
        </div>
        <div className="grid min-w-0 gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-label-sm font-semibold text-on-surface">
              {item.title}
            </span>
            {mediaDisplayState ? (
              <SignalStatusChip state={mediaDisplayState} />
            ) : null}
            {hidden ? (
              <span className="technical-label text-secondary-fixed-dim">
                Hidden
              </span>
            ) : null}
          </div>
          <span className="truncate text-[11px] text-on-surface-variant">
            {item.artist ?? item.channelName ?? item.duration} / {item.duration}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 md:w-44">
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/16 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={directActionsDisabled.play}
            onClick={playNow}
            type="button"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Play now</span>
          </button>
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-white/10 bg-background/20 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/12 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={directActionsDisabled.next}
            onClick={playNext}
            type="button"
          >
            <ListPlus className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Add next</span>
          </button>
          <button
            className="inline-flex h-8 items-center justify-center rounded-sm border border-white/10 bg-background/20 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/12 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={directActionsDisabled.add}
            onClick={() => addQueueItem()}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">Add to queue</span>
          </button>
        </div>
        <div className="justify-self-end">
          <button
            aria-expanded={menuOpen}
            ref={menuButtonRef}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 bg-background/24 text-on-surface-variant transition hover:border-primary-fixed-dim/35 hover:text-primary-fixed-dim"
            onClick={toggleMenu}
            title="Media settings"
            type="button"
          >
            <MoreVertical className="h-4 w-4" aria-hidden />
          </button>
          {renderedActionMenu}
        </div>
      </article>
    );
  }

  return (
    <article
      className="group relative grid min-h-36 overflow-hidden rounded-sm border border-white/10 bg-background/12 text-left transition hover:border-primary-fixed-dim/35 hover:bg-primary-fixed-dim/8"
      data-media-asset-id={item.id}
    >
      <button
        aria-expanded={menuOpen}
        ref={menuButtonRef}
        className="absolute right-2 top-2 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 bg-background/55 text-on-surface-variant opacity-90 backdrop-blur-md transition hover:border-primary-fixed-dim/35 hover:text-primary-fixed-dim"
        onClick={toggleMenu}
        title="Media settings"
        type="button"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {renderedActionMenu}
      <div className="aspect-video overflow-hidden bg-surface-container-lowest">
        {item.thumbnailUrl ? (
          <LazyMediaPoster
            className="h-full w-full object-cover opacity-90 transition group-hover:scale-[1.03]"
            eager={posterEager}
            scrollRootRef={posterScrollRootRef}
            src={item.thumbnailUrl}
          />
        ) : (
          <div className="grid h-full place-items-center text-primary-fixed-dim">
            <Film className="h-5 w-5" aria-hidden />
          </div>
        )}
      </div>
      <div className="grid gap-1 p-2">
        {mediaDisplayState ? (
          <SignalStatusChip state={mediaDisplayState} />
        ) : (
          <span className="technical-label text-primary-fixed-dim">
            {item.isLive
              ? "Live"
              : item.status === "now"
                ? "Now"
                : item.status === "played"
                  ? "History"
                  : "Play"}
          </span>
        )}
        <span className="line-clamp-2 text-label-sm font-semibold text-on-surface">
          {item.title}
        </span>
        <span className="truncate text-[11px] text-on-surface-variant">
          {item.artist ?? item.channelName ?? item.duration}
        </span>
        {hidden ? (
          <span className="technical-label text-secondary-fixed-dim">
            Hidden from viewers
          </span>
        ) : null}
        {processing && mediaDisplayState ? (
          <span className="text-[11px] text-on-surface-variant">
            {mediaDisplayState.detail}
          </span>
        ) : null}
        {approvalRequired ? (
          <span className="technical-label text-secondary-fixed-dim">
            {formatCreditEstimate(item.processingEstimatedCredits)}
          </span>
        ) : null}
      </div>
    </article>
  );
}
