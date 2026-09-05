"use client";

import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUp,
  Film,
  ListPlus,
  Music2,
  Pin,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { CompactQueueRow } from "./compact-queue-row";
import { Badge } from "@/components/ui";
import { MetadataPlaceholderChips } from "../metadata-placeholder-chips";
import { getQueueMetadataPriority } from "@/lib/queue/metadata-priority";
import type { RoomQueueItem } from "@/lib/rooms";
import { cx } from "@/lib/ui";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";
import { formatDuration } from "./queue-utils";

export function QueueRow({
  compact = false,
  item,
  manageDisabled,
  mode,
  onMoveQueueItem,
  onPin,
  onPlayNext,
  onPlayQueueItem,
  onRemoveQueueItem,
  onRequeue,
  queuedIndex,
  queuedItemsLength,
}: {
  compact?: boolean;
  item: RoomQueueItem;
  manageDisabled: boolean;
  mode: "listen" | "watch";
  onMoveQueueItem?(queueItemId: string, position: number): void;
  onPin?(item: RoomQueueItem): void;
  onPlayNext?(item: RoomQueueItem): void;
  onPlayQueueItem?(queueItemId: string): void;
  onRemoveQueueItem?(queueItemId: string): void;
  onRequeue?(item: RoomQueueItem): void;
  queuedIndex: number;
  queuedItemsLength: number;
}) {
  const metadata = useYouTubeMetadata(
    item.sourceType === "youtube" ? item.sourceUrl : null,
    {
      queuePriority: getQueueMetadataPriority({
        current: item.status === "now",
        itemIndex: Math.max(0, queuedIndex),
        queuedIndex,
      }),
    },
  );
  const title = metadata.metadata?.title ?? item.title;
  const channel = metadata.metadata?.channelTitle ?? item.channelName;
  const thumbnailUrl = metadata.metadata?.thumbnailUrl ?? item.thumbnailUrl;
  const duration =
    metadata.metadata?.durationSeconds !== null &&
    metadata.metadata?.durationSeconds !== undefined
      ? formatDuration(metadata.metadata.durationSeconds)
      : item.duration;
  const isQueued = item.status === "queued";
  const isActive = item.status === "now";
  const isBlocked =
    item.isUnavailable || metadata.metadata?.availability?.playable === false;
  const activeTone =
    mode === "listen"
      ? "border-secondary-fixed-dim/40 bg-secondary-fixed-dim/10 shadow-[0_0_24px_rgba(255,186,32,0.08)]"
      : "border-primary-fixed-dim/40 bg-primary-fixed-dim/10 shadow-[0_0_24px_rgba(0,219,233,0.08)]";

  if (compact)
    return (
      <CompactQueueRow
        item={item}
        title={title}
        channel={channel}
        thumbnailUrl={thumbnailUrl}
        duration={duration}
        blocked={Boolean(isBlocked)}
        disabled={manageDisabled}
        onMove={onMoveQueueItem}
        onPin={onPin}
        onNext={onPlayNext}
        onPlay={onPlayQueueItem}
        onRemove={onRemoveQueueItem}
        onRequeue={onRequeue}
        index={queuedIndex}
        count={queuedItemsLength}
      />
    );

  return (
    <li
      className={cx(
        "relative grid grid-cols-[3.75rem_minmax(0,1fr)] items-start gap-2 rounded-md border bg-surface-container-low/82 p-2 pr-9 transition",
        isActive ? activeTone : "border-white/10",
      )}
    >
      <button
        aria-label={`Remove ${title}`}
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-sm border border-error/30 text-error transition hover:bg-error-container/25 disabled:cursor-not-allowed disabled:opacity-35"
        disabled={manageDisabled}
        onClick={() => onRemoveQueueItem?.(item.id)}
        title={
          manageDisabled
            ? "Permission or queue state does not allow this."
            : `Remove ${title}`
        }
        type="button"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
      <QueueThumbnail item={item} mode={mode} thumbnailUrl={thumbnailUrl} />
      <div className="min-w-0 pt-0.5">
        <div className="flex min-w-0 items-start gap-1.5 pr-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-on-surface">
            {title}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
          {channel ? `${channel} / ` : item.artist ? `${item.artist} / ` : null}
          {duration}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {item.status === "now" ? (
            <Badge tone={mode === "listen" ? "amber" : "cyan"}>Now</Badge>
          ) : item.status === "played" ? (
            <Badge tone="neutral">Previous</Badge>
          ) : queuedIndex === 0 ? (
            <Badge tone={mode === "listen" ? "amber" : "cyan"}>Next</Badge>
          ) : null}
          {item.isPinned ? <Badge tone="neutral">Pinned</Badge> : null}
          {item.isPlayNext ? <Badge tone="neutral">Play Next</Badge> : null}
          {item.playlistId ? <Badge tone="neutral">Playlist</Badge> : null}
          {item.isUnavailable ? <Badge tone="amber">Unavailable</Badge> : null}
          {(item.failureCount ?? 0) > 1 ? (
            <Badge tone="neutral">Repeated {item.failureCount}</Badge>
          ) : null}
        </div>
        {item.sourceType === "youtube" && metadata.status !== "available" ? (
          metadata.loading ? (
            <MetadataPlaceholderChips className="mt-1" compact />
          ) : (
            <span className="technical-label mt-1 block text-on-surface-variant/80">
              Metadata unavailable
            </span>
          )
        ) : null}
        {isBlocked ? (
          <p className="mt-1 text-label-sm text-error">
            {item.failureReason ??
              metadata.metadata?.availability.reason ??
              "This YouTube item is known unavailable."}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1">
          {isQueued ? (
            <>
              <IconQueueButton
                disabled={manageDisabled || queuedIndex <= 0}
                icon={<ArrowUp className="h-4 w-4" aria-hidden />}
                label={`Move ${title} up`}
                onClick={() => onMoveQueueItem?.(item.id, queuedIndex - 1)}
              />
              <IconQueueButton
                disabled={
                  manageDisabled ||
                  queuedIndex < 0 ||
                  queuedIndex >= queuedItemsLength - 1
                }
                icon={<ArrowDown className="h-4 w-4" aria-hidden />}
                label={`Move ${title} down`}
                onClick={() => onMoveQueueItem?.(item.id, queuedIndex + 1)}
              />
              <IconQueueButton
                disabled={manageDisabled}
                icon={<ChevronsUp className="h-4 w-4" aria-hidden />}
                label={`${item.isPlayNext ? "Unset" : "Set"} ${title} as play next`}
                onClick={() => onPlayNext?.(item)}
              />
              <IconQueueButton
                disabled={manageDisabled}
                icon={<Pin className="h-4 w-4" aria-hidden />}
                label={`${item.isPinned ? "Unpin" : "Pin"} ${title}`}
                onClick={() => onPin?.(item)}
              />
            </>
          ) : item.status === "played" ? (
            <>
              <IconQueueButton
                disabled={manageDisabled}
                icon={<RotateCcw className="h-4 w-4" aria-hidden />}
                label={`Requeue ${title}`}
                onClick={() => onRequeue?.(item)}
              />
              <IconQueueButton
                disabled={manageDisabled}
                icon={<ChevronsUp className="h-4 w-4" aria-hidden />}
                label={`Play ${title} next`}
                onClick={() => onPlayNext?.(item)}
              />
            </>
          ) : null}
          {item.status !== "now" ? (
            <IconQueueButton
              disabled={manageDisabled || isBlocked || !onPlayQueueItem}
              icon={<Play className="h-4 w-4" aria-hidden />}
              label={
                item.status === "played"
                  ? `Play ${title} again`
                  : `Play ${title} now`
              }
              onClick={() => onPlayQueueItem?.(item.id)}
              tone="primary"
            />
          ) : (
            <span
              className={cx(
                "inline-flex h-7 items-center gap-1 rounded-sm border px-2 text-label-sm",
                mode === "listen"
                  ? "border-secondary-fixed-dim/40 text-secondary-fixed-dim"
                  : "border-primary-fixed-dim/40 text-primary-fixed-dim",
              )}
            >
              <ListPlus className="h-4 w-4" aria-hidden />
              Active
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function IconQueueButton({
  disabled,
  icon,
  label,
  onClick,
  tone = "neutral",
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick?(): void;
  tone?: "danger" | "neutral" | "primary";
}) {
  return (
    <button
      aria-label={label}
      className={cx(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm border transition disabled:cursor-not-allowed disabled:opacity-35",
        tone === "primary"
          ? "border-primary-fixed-dim/35 text-primary-fixed-dim hover:bg-primary-fixed-dim/10"
          : tone === "danger"
            ? "border-error/30 text-error hover:bg-error-container/25"
            : "border-white/10 text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
      )}
      disabled={disabled}
      onClick={onClick}
      title={
        disabled ? "Permission or queue state does not allow this." : label
      }
      type="button"
    >
      {icon}
    </button>
  );
}

function QueueThumbnail({
  item,
  mode,
  thumbnailUrl,
}: {
  item: RoomQueueItem;
  mode: "listen" | "watch";
  thumbnailUrl?: string | null;
}) {
  const Icon = mode === "listen" ? Music2 : Film;

  if (thumbnailUrl) {
    return <QueueImage thumbnailUrl={thumbnailUrl} />;
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-md border border-white/10 bg-surface-container text-on-surface-variant">
      <Icon className="h-5 w-5" aria-hidden />
      <span className="sr-only">{item.title}</span>
    </div>
  );
}

export function QueueImage({ thumbnailUrl }: { thumbnailUrl?: string | null }) {
  if (!thumbnailUrl) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-white/10 bg-surface-container text-on-surface-variant">
        <Film className="h-4 w-4" aria-hidden />
      </div>
    );
  }

  return (
    <div className="h-14 w-14 overflow-hidden rounded-sm border border-white/10 bg-surface-container">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        src={thumbnailUrl}
      />
    </div>
  );
}
