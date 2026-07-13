"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  GripVertical,
  Pin,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { setRoomSavedAction } from "@/lib/rooms/actions";
import type { RoomQueueItem } from "@/lib/rooms";
import { cx } from "@/lib/ui";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";
import { type QueueAddInput } from "@/components/room/listen/shared";
import {
  QueueArtwork,
  IconQueueButton,
} from "@/components/room/listen/discovery/media-cards";
import { formatSeconds } from "@/components/room/listen/helpers";

export function ListenQueueRow({
  canAddQueue,
  current,
  desktopShell,
  index,
  item,
  manageDisabled,
  metadataPriority,
  onAddQueueItem,
  onMoveQueueItem,
  onPlayQueueItem,
  playDisabled,
  onQueueItemPriorityChange,
  onRemoveQueueItem,
  queuedIndex,
  queuedItemsLength,
}: {
  canAddQueue: boolean;
  current: boolean;
  desktopShell: boolean;
  index: number;
  item: RoomQueueItem;
  manageDisabled: boolean;
  metadataPriority: number;
  onAddQueueItem(input: QueueAddInput): void;
  onMoveQueueItem(queueItemId: string, position: number): void;
  onPlayQueueItem(queueItemId: string): void;
  playDisabled: boolean;
  onQueueItemPriorityChange(
    queueItemId: string,
    input: { isPinned?: boolean; isPlayNext?: boolean },
  ): void;
  onRemoveQueueItem(queueItemId: string): void;
  queuedIndex: number;
  queuedItemsLength: number;
}) {
  const metadata = useYouTubeMetadata(
    item.sourceType === "youtube" ? item.sourceUrl : null,
    { queuePriority: metadataPriority },
  );
  const title = metadata.metadata?.title ?? item.title;
  const channel =
    metadata.metadata?.channelTitle ?? item.channelName ?? item.artist;
  const thumbnailUrl = metadata.metadata?.thumbnailUrl ?? item.thumbnailUrl;
  const duration =
    metadata.metadata?.durationSeconds !== null &&
    metadata.metadata?.durationSeconds !== undefined
      ? formatSeconds(metadata.metadata.durationSeconds)
      : item.duration;
  const isQueued = item.status === "queued";
  const isBlocked =
    item.isUnavailable || metadata.metadata?.availability?.playable === false;
  const statusLabel = isBlocked
    ? "Unavailable"
    : current
      ? "Now playing"
      : item.isPlayNext
        ? "Play next"
        : item.isPinned
          ? "Pinned"
          : queuedIndex === 0
            ? "Up next"
            : item.status;

  return (
    <div
      className={cx(
        "group grid h-full min-w-0 grid-cols-[1.25rem_1.5rem_3rem_minmax(0,1fr)_auto] items-center gap-2 overflow-hidden border-b border-white/10 px-3 py-2.5 text-label-sm transition last:border-b-0 xl:min-w-[48rem] xl:grid-cols-[2rem_2rem_3.25rem_minmax(12rem,1fr)_5rem_9rem_7rem_8.5rem] xl:gap-3 xl:px-4 xl:py-2",
        current
          ? "bg-[rgb(var(--listen-primary)/0.1)] text-on-surface"
          : "text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface",
      )}
    >
      <GripVertical className="h-4 w-4 text-on-surface-variant" aria-hidden />
      <span className="text-on-surface-variant">{index + 1}</span>
      <QueueArtwork thumbnailUrl={thumbnailUrl} title={title} />
      <div className="min-w-0">
        <p className="overflow-hidden break-words text-body-md font-semibold leading-5 text-on-surface [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] xl:min-h-12 xl:leading-6">
          {title}
        </p>
        <p
          className={cx(
            "truncate text-label-sm",
            item.failureReason ? "text-error" : "text-on-surface-variant",
          )}
          title={item.failureReason ?? undefined}
        >
          {item.failureReason ?? channel ?? "Room source"}
          {!desktopShell ? <span> · {duration}</span> : null}
        </p>
        <p
          className={cx(
            "mt-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
            desktopShell && "hidden",
            current || item.isPinned || item.isPlayNext
              ? "text-[rgb(var(--listen-primary))]"
              : "text-on-surface-variant",
          )}
        >
          {statusLabel}
        </p>
      </div>
      <span className="hidden xl:inline">{duration}</span>
      <span className="hidden truncate xl:inline">Added by {item.addedBy}</span>
      <span
        className={cx(
          "hidden text-label-sm font-semibold xl:inline",
          current
            ? "text-[rgb(var(--listen-primary))]"
            : item.isPinned || item.isPlayNext
              ? "text-[rgb(var(--listen-primary))]"
              : "text-on-surface-variant",
        )}
      >
        {statusLabel}
      </span>
      <span className="flex max-w-[6.5rem] flex-wrap items-center justify-end gap-1 xl:max-w-none xl:flex-nowrap">
        {current ? (
          <span className="inline-flex h-5 items-end gap-0.5 text-[rgb(var(--listen-primary))]">
            {[0, 1, 2].map((bar) => (
              <span
                className="w-1 rounded-sm bg-current"
                key={bar}
                style={{ height: `${7 + bar * 4}px` }}
              />
            ))}
          </span>
        ) : isQueued ? (
          <>
            <IconQueueButton
              disabled={manageDisabled || queuedIndex <= 0}
              icon={<ArrowUp className="h-4 w-4" aria-hidden />}
              label={`Move ${title} up`}
              onClick={() => onMoveQueueItem(item.id, queuedIndex - 1)}
            />
            <IconQueueButton
              disabled={
                manageDisabled ||
                queuedIndex < 0 ||
                queuedIndex >= queuedItemsLength - 1
              }
              icon={<ArrowDown className="h-4 w-4" aria-hidden />}
              label={`Move ${title} down`}
              onClick={() => onMoveQueueItem(item.id, queuedIndex + 1)}
            />
          </>
        ) : item.status === "played" ? (
          <IconQueueButton
            disabled={!canAddQueue || isBlocked}
            icon={<Plus className="h-4 w-4" aria-hidden />}
            label={isBlocked ? `${title} is unavailable` : `Requeue ${title}`}
            onClick={() =>
              onAddQueueItem({
                artist: item.artist,
                channelName: item.channelName,
                isUnavailable: item.isUnavailable,
                playlistId: item.playlistId,
                playlistTitle: item.playlistTitle,
                sourceTitle: item.title,
                sourceType: item.sourceType ?? "youtube",
                sourceUrl: item.sourceUrl ?? "",
                thumbnailUrl: item.thumbnailUrl,
              })
            }
          />
        ) : null}
        {isQueued ? (
          <IconQueueButton
            disabled={manageDisabled}
            icon={<Pin className="h-4 w-4" aria-hidden />}
            label={`${item.isPinned ? "Unpin" : "Pin"} ${title}`}
            onClick={() =>
              onQueueItemPriorityChange(item.id, {
                isPinned: !item.isPinned,
              })
            }
            selected={item.isPinned}
          />
        ) : null}
        {!current ? (
          <IconQueueButton
            disabled={playDisabled || isBlocked}
            icon={<Play className="h-4 w-4" aria-hidden />}
            label={isBlocked ? `${title} is unavailable` : `Play ${title}`}
            onClick={() => onPlayQueueItem(item.id)}
          />
        ) : null}
        <button
          aria-label={`Remove ${title}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-error/30 text-error transition hover:bg-error-container/25 disabled:opacity-35"
          disabled={manageDisabled}
          onClick={() => onRemoveQueueItem(item.id)}
          type="button"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </span>
    </div>
  );
}
export function ListenSavedRoomToggle({
  canSave,
  compact = false,
  initialSaved,
  roomId,
}: {
  canSave: boolean;
  compact?: boolean;
  initialSaved: boolean;
  roomId: string;
}) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const Icon = isSaved ? BookmarkCheck : Bookmark;

  async function handleToggle() {
    if (!canSave || saving) {
      return;
    }

    const nextSaved = !isSaved;

    setSaving(true);
    setErrorMessage(null);

    try {
      const result = await setRoomSavedAction({
        roomId,
        saved: nextSaved,
      });

      setIsSaved(result.isSaved);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Saved-room update failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (compact) {
    return (
      <Button
        className="shrink-0 border-white/10 bg-transparent text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface"
        disabled={!canSave || saving}
        onClick={handleToggle}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Icon className="h-4 w-4" aria-hidden />
        {isSaved ? "Saved" : "Save"}
      </Button>
    );
  }

  return (
    <div className="grid gap-1.5 rounded-md border border-white/10 bg-surface-container-low p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="technical-label text-secondary-fixed-dim">
            Saved Room
          </span>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Keep this room and queue available after idle cleanup.
          </p>
        </div>
        <Button
          className="shrink-0"
          disabled={!canSave || saving}
          onClick={handleToggle}
          size="sm"
          type="button"
          variant={isSaved ? "secondary" : "ghost"}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {isSaved ? "Saved" : "Save"}
        </Button>
      </div>
      {errorMessage ? (
        <p className="text-label-sm text-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
