"use client";

import { type ReactNode } from "react";
import { Headphones, ListPlus, Play, Plus } from "lucide-react";
import { Badge } from "@/components/ui";
import type { RoomQueueItem } from "@/lib/rooms";
import { cx } from "@/lib/ui";
import type { YouTubeVideoMetadata } from "@/lib/youtube/metadata";
import { getYouTubeAvailabilityLabel } from "@/lib/youtube/availability";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";
import {
  type SourceLoadInput,
  type QueueAddInput,
} from "@/components/room/listen/shared";
import {
  getQueueItemDisplayDuration,
  formatSeconds,
} from "@/components/room/listen/helpers";

export function buildProviderRecommendationQuery(item: RoomQueueItem | null) {
  if (!item) {
    return null;
  }

  return [item.artist ?? item.channelName, item.title]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();
}
export function youtubeMetadataToQueueItem(
  item: YouTubeVideoMetadata,
  addedBy: string,
): RoomQueueItem {
  return {
    addedBy,
    artist: item.channelTitle ?? undefined,
    channelName: item.channelTitle ?? undefined,
    duration: item.durationSeconds ? formatSeconds(item.durationSeconds) : "",
    durationSeconds: item.durationSeconds ?? undefined,
    id: `provider:${item.videoId}`,
    isUnavailable: !item.availability.playable,
    sourceType: "youtube",
    sourceUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
    status: "queued",
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    title: item.title ?? "YouTube video",
    videoId: item.videoId,
  };
}
export function queueItemToSourceLoadInput(
  item: RoomQueueItem,
): SourceLoadInput {
  return {
    sourceTitle: item.title,
    sourceType: item.sourceType ?? "youtube",
    sourceUrl: item.sourceUrl ?? "",
  };
}
export function queueItemToQueueAddInput(
  item: RoomQueueItem,
  options: { isPlayNext?: boolean } = {},
): QueueAddInput {
  return {
    artist: item.artist,
    channelName: item.channelName,
    durationSeconds: item.durationSeconds,
    isPlayNext: options.isPlayNext,
    isUnavailable: item.isUnavailable,
    playlistId: item.playlistId,
    playlistTitle: item.playlistTitle,
    sourceTitle: item.title,
    sourceType: item.sourceType ?? "youtube",
    sourceUrl: item.sourceUrl ?? "",
    thumbnailUrl: item.thumbnailUrl,
  };
}
export function RecommendationCard({
  canAddQueue,
  canLoadSource,
  canPlay,
  current,
  inQueue,
  item,
  onAddQueue,
  onLoadNow,
  onPlayNext,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  canPlay: boolean;
  current: boolean;
  inQueue: boolean;
  item: RoomQueueItem;
  onAddQueue(): void;
  onLoadNow(): void;
  onPlayNext(): void;
}) {
  const metadata = useYouTubeMetadata(
    item.sourceType === "youtube" ? item.sourceUrl : null,
  );
  const title = metadata.metadata?.title ?? item.title;
  const channel =
    metadata.metadata?.channelTitle ?? item.channelName ?? item.artist;
  const thumbnailUrl = metadata.metadata?.thumbnailUrl ?? item.thumbnailUrl;
  const duration = getQueueItemDisplayDuration(item, metadata);
  const isBlocked =
    item.isUnavailable || metadata.metadata?.availability?.playable === false;
  const canPrimaryPlay = inQueue ? canPlay : canLoadSource;
  const disabled = current || !canPrimaryPlay || isBlocked;
  const primaryLabel = inQueue ? "Play" : "Load now";

  return (
    <article
      className={cx(
        "group min-w-0 snap-start overflow-hidden rounded-md border bg-surface/66 text-left transition",
        current
          ? "border-[rgb(var(--listen-primary)/0.5)] bg-[rgb(var(--listen-primary)/0.08)]"
          : "border-white/10 hover:border-[rgb(var(--listen-primary)/0.42)] hover:bg-surface-container-low/62 hover:shadow-[0_0_24px_rgb(var(--listen-shadow)/0.1)]",
        disabled && !current && "opacity-75",
      )}
    >
      <button
        aria-label={
          current
            ? `${title} is now playing`
            : canPrimaryPlay
              ? isBlocked
                ? `${title} is unavailable`
                : `${primaryLabel} ${title}`
              : `Permission required for ${title}`
        }
        className="block w-full text-left disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={onLoadNow}
        type="button"
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-surface-container">
          <QueueArtwork
            className="h-full w-full rounded-none border-0"
            thumbnailUrl={thumbnailUrl}
            title={title}
          />
          <span
            className={cx(
              "absolute inset-0 grid place-items-center bg-black/0 text-[rgb(var(--listen-primary))] opacity-0 transition group-hover:bg-black/24 group-hover:opacity-100",
              current && "bg-black/18 opacity-100",
            )}
          >
            {current ? (
              <span className="technical-label border-[rgb(var(--listen-primary)/0.35)] bg-surface/80 text-[rgb(var(--listen-primary))]">
                Now
              </span>
            ) : (
              <Play
                className="h-8 w-8 drop-shadow-[0_0_16px_rgb(var(--listen-shadow)/0.35)]"
                aria-hidden
              />
            )}
          </span>
        </div>
      </button>
      <div className="grid min-h-[8.75rem] gap-1.5 p-4">
        <p className="truncate text-body-md font-semibold text-on-surface">
          {title}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {channel ?? "Room source"}
        </p>
        {duration ? (
          <p className="text-label-sm text-on-surface-variant">{duration}</p>
        ) : null}
        {isBlocked ? (
          <Badge tone="amber">
            {getYouTubeAvailabilityLabel(metadata.metadata?.availability)}
          </Badge>
        ) : null}
        <CardActionRail>
          <IconQueueButton
            disabled={disabled}
            icon={<Play className="h-3.5 w-3.5" aria-hidden />}
            label={`${primaryLabel} ${title}`}
            onClick={onLoadNow}
            rail
          />
          <IconQueueButton
            disabled={!canAddQueue || isBlocked}
            icon={<Plus className="h-3.5 w-3.5" aria-hidden />}
            label={`Add ${title} to the end of the queue`}
            onClick={onAddQueue}
            rail
          />
          <IconQueueButton
            disabled={!canAddQueue || isBlocked}
            icon={<ListPlus className="h-3.5 w-3.5" aria-hidden />}
            label={`Add ${title} to play next. Pinned songs stay first when pinned-first is active.`}
            onClick={onPlayNext}
            rail
          />
        </CardActionRail>
      </div>
    </article>
  );
}
export function SmallMediaCard({
  item,
  label,
}: {
  item: RoomQueueItem;
  label: string;
}) {
  return (
    <div className="mt-3 grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3">
      <QueueArtwork thumbnailUrl={item.thumbnailUrl} title={item.title} />
      <div className="min-w-0">
        <p className="truncate text-body-md font-semibold text-on-surface">
          {item.title}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {item.artist ?? item.channelName ?? "Room source"}
        </p>
      </div>
      <span className="text-label-sm text-on-surface-variant">
        {label === "Now" ? "Live" : item.duration}
      </span>
    </div>
  );
}
export function CardActionRail({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-sm border border-white/10 bg-background/52">
      {children}
    </div>
  );
}
export function EmptyListenPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-white/10 bg-surface/55 p-4 text-body-md text-on-surface-variant">
      {children}
    </div>
  );
}
export function QueueArtwork({
  className,
  thumbnailUrl,
  title,
}: {
  className?: string;
  thumbnailUrl?: string | null;
  title: string;
}) {
  return (
    <div
      className={cx(
        "h-12 w-12 overflow-hidden rounded-sm border border-white/10 bg-surface-container",
        className,
      )}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external media artwork.
        <img alt="" className="h-full w-full object-cover" src={thumbnailUrl} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[rgb(var(--listen-primary))]">
          <Headphones className="h-5 w-5" aria-hidden />
          <span className="sr-only">{title}</span>
        </span>
      )}
    </div>
  );
}
export function formatDurationSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
export function IconQueueButton({
  disabled,
  icon,
  label,
  onClick,
  rail = false,
  selected = false,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick?(): void;
  rail?: boolean;
  selected?: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={selected || undefined}
      className={cx(
        rail
          ? "inline-flex h-8 items-center justify-center border-l border-white/10 transition first:border-l-0 disabled:opacity-35"
          : "inline-flex h-7 w-7 items-center justify-center rounded-sm border transition disabled:opacity-35",
        selected
          ? "border-[rgb(var(--listen-primary)/0.4)] bg-[rgb(var(--listen-primary)/0.12)] text-[rgb(var(--listen-primary))] shadow-[0_0_14px_rgb(var(--listen-shadow)/0.12)]"
          : rail
            ? "border-white/10 text-on-surface-variant hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-[rgb(var(--listen-primary))]"
            : "border-white/10 text-on-surface-variant hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-[rgb(var(--listen-primary))]",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}
