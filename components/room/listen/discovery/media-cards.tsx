"use client";

import { type ReactNode } from "react";
import { Headphones, ListPlus, Play, Plus } from "lucide-react";
import { Badge } from "@/components/ui";
import type { RoomQueueItem } from "@/lib/rooms";
import { cx } from "@/lib/ui";
import type { YouTubeVideoMetadata } from "@/lib/youtube/metadata";
import { getYouTubeAvailabilityLabel } from "@/lib/youtube/availability";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import { PreferenceHeartButton } from "@/components/room/listen/preference-heart-button";
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
export function RecommendationCard({
  canAddQueue,
  canLoadSource,
  canPlay,
  current,
  inQueue,
  item,
  mediaPreferences,
  onAddQueue,
  onLoadNow,
  onPlayNext,
  reason,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  canPlay: boolean;
  current: boolean;
  inQueue: boolean;
  item: RoomQueueItem;
  mediaPreferences: MediaPreferenceController;
  onAddQueue(): void;
  onLoadNow(): void;
  onPlayNext(): void;
  reason?: string;
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
        "group grid h-[7.5rem] min-w-0 snap-start grid-cols-[6rem_minmax(0,1fr)] grid-rows-[minmax(0,1fr)_2.25rem] overflow-hidden rounded-md border bg-surface/58 text-left transition",
        current
          ? "border-[rgb(var(--listen-primary)/0.5)] bg-[rgb(var(--listen-primary)/0.08)]"
          : "border-white/10 hover:border-[rgb(var(--listen-primary)/0.38)] hover:bg-surface-container-low/58",
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
        className="group/artwork relative row-span-2 block overflow-hidden border-r border-white/10 text-left disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={onLoadNow}
        type="button"
      >
        <QueueArtwork
          className="h-full w-full rounded-none border-0"
          thumbnailUrl={thumbnailUrl}
          title={title}
        />
        <span
          className={cx(
            "absolute inset-0 grid place-items-center bg-black/0 text-[rgb(var(--listen-primary))] opacity-0 transition group-hover/artwork:bg-black/26 group-hover/artwork:opacity-100 group-focus-visible/artwork:bg-black/26 group-focus-visible/artwork:opacity-100",
            current && "bg-black/20 opacity-100",
          )}
        >
          {current ? (
            <span className="technical-label border-[rgb(var(--listen-primary)/0.35)] bg-surface/84 text-[rgb(var(--listen-primary))]">
              Now
            </span>
          ) : (
            <Play className="h-6 w-6" aria-hidden />
          )}
        </span>
      </button>
      <div className="min-w-0 self-center px-2.5 py-1.5">
        <p
          className="truncate text-body-md font-semibold text-on-surface"
          title={title}
        >
          {title}
        </p>
        <p
          className="mt-0.5 truncate text-label-sm text-on-surface-variant"
          title={channel ?? "Room source"}
        >
          {channel ?? "Room source"}
        </p>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          {duration ? (
            <span className="shrink-0 text-label-sm text-on-surface-variant">
              {duration}
            </span>
          ) : null}
          {reason ? (
            <span
              className="truncate text-label-sm text-[rgb(var(--listen-primary))]"
              title={reason}
            >
              {reason}
            </span>
          ) : null}
          {isBlocked ? (
            <Badge tone="amber">
              {getYouTubeAvailabilityLabel(metadata.metadata?.availability)}
            </Badge>
          ) : null}
        </div>
      </div>
      <CardActionRail className="!mt-0 rounded-none border-x-0 border-b-0">
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
        <div className="grid h-full min-h-9 place-items-center border-l border-white/10">
          <PreferenceHeartButton
            className="h-full w-full rounded-none border-0"
            item={item}
            onToggle={() => void mediaPreferences.togglePreference(item)}
            preference={mediaPreferences.getPreference(item)}
          />
        </div>
      </CardActionRail>
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
export function CardActionRail({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "mt-2 grid grid-flow-col auto-cols-fr overflow-hidden rounded-sm border border-white/10 bg-background/52",
        className,
      )}
    >
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
        <img
          alt=""
          className="h-full w-full object-cover"
          decoding="async"
          loading="lazy"
          src={thumbnailUrl}
        />
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
          ? "inline-flex h-full min-h-9 items-center justify-center border-l border-white/10 py-1 transition first:border-l-0 disabled:opacity-35"
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
