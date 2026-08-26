"use client";

import { type ReactNode } from "react";
import {
  Disc3,
  Maximize2,
  Pause,
  Play,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { IconButton, Slider } from "@/components/ui";
import { dispatchPlayerFullscreenRequest } from "@/lib/player/local-controls";
import { getYouTubeThumbnailUrl } from "@/lib/player/source";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { DirectMediaPlayer } from "@/components/room/direct-media-player";
import { useNextItemPreparation } from "@/components/room/use-next-item-preparation";
import { YoutubeMediaPlayer } from "@/components/room/youtube-media-player";
import { YouTubeMetadataLine } from "@/components/room/youtube-metadata-line";
import { PreferenceHeartButton } from "@/components/room/listen/preference-heart-button";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import { ListenPreparingNextStrip } from "@/components/room/listen/settings/settings-dialogs";
import { formatSeconds } from "@/components/room/listen/helpers";
import { ListenUpNextPreview } from "@/components/room/listen/now-playing/up-next-preview";

export function ListenNowPlayingPanel({
  canControl,
  currentItem,
  currentPosition,
  desktopShell,
  durationSeconds,
  liveRoom,
  mediaPreferences,
  mobileTools,
  nextPreparation,
  onNext,
  onOpenQueue,
  onPlaybackChange,
  onPrevious,
  onSeek,
  onShuffle,
  onVolumeChange,
  queueAutoplayEnabled,
  queuedItems,
  remainingQueueSeconds,
  room,
  volume,
}: {
  canControl: boolean;
  currentItem: RoomQueueItem | null;
  currentPosition: number;
  desktopShell: boolean;
  durationSeconds: number;
  liveRoom: LiveRoomState;
  mediaPreferences: MediaPreferenceController;
  mobileTools?: ReactNode;
  nextPreparation: ReturnType<typeof useNextItemPreparation>;
  onNext(): void;
  onOpenQueue(): void;
  onPlaybackChange(status: "paused" | "playing"): void;
  onPrevious(): void;
  onSeek(positionSeconds: number): void;
  onShuffle(): void;
  onVolumeChange(volume: number): void;
  queueAutoplayEnabled: boolean;
  queuedItems: RoomQueueItem[];
  remainingQueueSeconds: number | null;
  room: RoomSnapshot;
  volume: number;
}) {
  const session = liveRoom.snapshot.session;
  const liveSource = session?.sourceUrl ?? null;
  const liveSourceType = session?.sourceType ?? null;
  const youtubeSource = liveSourceType === "youtube" && liveSource;
  const thumbnailUrl =
    currentItem?.thumbnailUrl ??
    (youtubeSource ? getYouTubeThumbnailUrl(liveSource) : null);
  const title =
    session?.sourceTitle ?? currentItem?.title ?? room.nowPlaying.title;
  const artist =
    currentItem?.artist ??
    currentItem?.channelName ??
    room.nowPlaying.artist ??
    "Room source";
  const isPlaying = session?.status === "playing";
  const awaitingMedia = !liveSource;
  const progressMax =
    durationSeconds || Math.max(100, Math.ceil(currentPosition));
  return (
    <aside
      className={cx(
        "relative grid min-h-0 content-start overflow-visible border-white/10 bg-transparent p-0",
        desktopShell &&
          "h-full grid-rows-[minmax(0,1fr)] overflow-hidden rounded-xl border bg-background/72 p-0 shadow-[0_22px_64px_rgb(0_0_0_/_0.32)] backdrop-blur-xl",
        !desktopShell && "pb-2",
      )}
      style={
        desktopShell
          ? {
              background:
                "radial-gradient(circle at 18% 10%, rgb(var(--listen-primary) / 0.16), transparent 22rem), linear-gradient(180deg, rgb(14 14 15 / var(--listen-rail-dim-top,0.72)), rgb(14 14 15 / var(--listen-rail-dim-bottom,0.62)))",
            }
          : undefined
      }
    >
      <div
        className={cx(
          "relative grid min-h-0 overflow-hidden transition-colors duration-1000",
          desktopShell
            ? "grid-rows-[minmax(0,1fr)_auto] rounded-[inherit] border-0 shadow-none"
            : "rounded-none border-0 bg-transparent shadow-none",
        )}
        style={
          desktopShell
            ? {
                background:
                  "radial-gradient(circle at 48% 0%, rgb(var(--listen-primary) / 0.08), transparent 32%), linear-gradient(180deg, rgb(19 19 20 / 0.04), transparent)",
                boxShadow: "none",
              }
            : undefined
        }
      >
        {desktopShell && thumbnailUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external media artwork. */}
            <img
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              fetchPriority="high"
              loading="eager"
              src={thumbnailUrl}
              style={{
                filter:
                  "saturate(var(--listen-background-saturation, 1.44)) contrast(1.05) blur(8px)",
                opacity:
                  "calc(var(--listen-background-presence, 0.955) * 0.68)",
                transform: "scale(1.08)",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgb(10 10 11 / 0.18), rgb(10 10 11 / var(--listen-rail-dim-bottom,0.48)) 52%, rgb(10 10 11 / var(--listen-rail-dim-top,0.58)) 100%)",
              }}
            />
          </>
        ) : null}
        <div
          className={cx(
            "relative z-10 flex min-h-0 flex-col gap-[clamp(0.625rem,1.35vh,1rem)] overflow-y-auto py-1 [scrollbar-color:rgb(var(--listen-primary)_/_0.42)_transparent] [scrollbar-width:thin]",
            desktopShell && "h-full content-start px-3 py-3",
          )}
        >
          <div className="relative h-[clamp(16rem,36vh,20rem)] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_34px_rgb(var(--listen-shadow)/0.12),inset_0_0_0_1px_rgb(255_255_255_/_0.05)]">
            {thumbnailUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external media artwork. */}
                <img
                  alt=""
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl transition-opacity duration-1000"
                  fetchPriority="high"
                  loading="eager"
                  src={thumbnailUrl}
                />
              </>
            ) : null}

            {youtubeSource ? (
              <YoutubeMediaPlayer
                className="absolute inset-0 h-full w-full bg-black"
                liveRoom={liveRoom}
                mode="listen"
              />
            ) : thumbnailUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external media artwork. */}
                <img
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  fetchPriority="high"
                  loading="eager"
                  src={thumbnailUrl}
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgb(var(--listen-primary)_/_0.28),transparent_34%),linear-gradient(145deg,rgb(42_42_43),rgb(14_14_15))] text-[rgb(var(--listen-primary))]">
                <Disc3 className="h-20 w-20" aria-hidden />
              </div>
            )}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(to_top,rgb(14_14_15_/_0.58),transparent)]"
            />
          </div>

          {!youtubeSource && liveSource ? (
            <DirectMediaPlayer
              className="sr-only"
              liveRoom={liveRoom}
              mode="listen"
            />
          ) : null}

          <div className="grid gap-[clamp(0.5rem,1vh,0.75rem)]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <h1 className="text-headline-md font-semibold leading-tight text-on-surface [overflow-wrap:anywhere]">
                {title}
              </h1>
              {currentItem ? (
                <PreferenceHeartButton
                  item={currentItem}
                  onToggle={() =>
                    void mediaPreferences.togglePreference(currentItem)
                  }
                  preference={mediaPreferences.getPreference(currentItem)}
                  variant="inline"
                />
              ) : null}
            </div>
            <p className="truncate text-body-md text-on-surface-variant">
              {artist}
            </p>
            {youtubeSource ? (
              <YouTubeMetadataLine
                showChannel={false}
                sourceUrl={liveSource}
                tone="dynamic"
              />
            ) : null}
          </div>

          <div className="grid gap-[clamp(0.625rem,1.35vh,1rem)]">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-label-sm text-on-surface-variant">
              <span>{formatSeconds(currentPosition)}</span>
              <Slider
                label="Listen progress"
                max={progressMax}
                min={0}
                onChange={(event) => onSeek(Number(event.currentTarget.value))}
                readOnly={awaitingMedia || !canControl || !durationSeconds}
                tone="dynamic"
                value={
                  awaitingMedia
                    ? 0
                    : durationSeconds
                      ? Math.min(currentPosition, durationSeconds)
                      : currentPosition
                }
              />
              <span>
                {durationSeconds ? formatSeconds(durationSeconds) : "--:--"}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2">
              <IconButton
                className="hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-[rgb(var(--listen-primary))]"
                disabled={!canControl}
                label="Shuffle queue"
                onClick={onShuffle}
                variant="ghost"
              >
                <Shuffle className="h-5 w-5" aria-hidden />
              </IconButton>
              <IconButton
                className="hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-[rgb(var(--listen-primary))]"
                disabled={!canControl}
                label="Previous song"
                onClick={onPrevious}
                variant="ghost"
              >
                <SkipBack className="h-5 w-5" aria-hidden />
              </IconButton>
              <IconButton
                className="!h-14 !w-14 !rounded-full border-[1.5px] border-[rgb(var(--listen-primary)/0.78)] bg-[rgb(var(--listen-primary)/0.16)] text-on-surface shadow-[inset_0_0_0_1px_rgb(var(--listen-primary)/0.14),0_0_26px_rgb(var(--listen-shadow)/0.32),0_10px_24px_rgb(0_0_0/0.34)] backdrop-blur-md hover:bg-[rgb(var(--listen-primary)/0.24)] hover:shadow-[inset_0_0_0_1px_rgb(var(--listen-primary)/0.2),0_0_32px_rgb(var(--listen-shadow)/0.42),0_12px_28px_rgb(0_0_0/0.38)]"
                disabled={awaitingMedia || !canControl}
                label={isPlaying ? "Pause" : "Play"}
                onClick={() =>
                  onPlaybackChange(isPlaying ? "paused" : "playing")
                }
                variant="ghost"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" strokeWidth={2.5} aria-hidden />
                ) : (
                  <Play className="h-6 w-6" strokeWidth={2.5} aria-hidden />
                )}
              </IconButton>
              <IconButton
                className="hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-[rgb(var(--listen-primary))]"
                disabled={!canControl}
                label="Next song"
                onClick={onNext}
                variant="ghost"
              >
                <SkipForward className="h-5 w-5" aria-hidden />
              </IconButton>
              <IconButton
                className={cx(
                  "hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-[rgb(var(--listen-primary))]",
                  queueAutoplayEnabled &&
                    "border-[rgb(var(--listen-primary)/0.45)] bg-[rgb(var(--listen-primary)/0.1)] text-[rgb(var(--listen-primary))]",
                )}
                disabled={!canControl}
                label={
                  queueAutoplayEnabled
                    ? "Disable queue autoplay"
                    : "Enable queue autoplay"
                }
                onClick={() => liveRoom.setQueueAutoplay(!queueAutoplayEnabled)}
                variant="ghost"
              >
                <Repeat2 className="h-5 w-5" aria-hidden />
              </IconButton>
            </div>

            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-2">
              {volume <= 0 ? (
                <VolumeX
                  className="h-5 w-5 text-on-surface-variant"
                  aria-hidden
                />
              ) : (
                <Volume2
                  className="h-5 w-5 text-on-surface-variant"
                  aria-hidden
                />
              )}
              <Slider
                label="Volume"
                max={100}
                min={0}
                onChange={(event) =>
                  onVolumeChange(Number(event.currentTarget.value))
                }
                tone="dynamic"
                value={volume}
              />
              <span
                aria-label={`Volume ${Math.round(volume)} percent`}
                className="min-w-9 text-right text-label-sm tabular-nums text-on-surface-variant"
              >
                {Math.round(volume)}%
              </span>
              <IconButton
                className="hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-[rgb(var(--listen-primary))]"
                label="Fullscreen"
                onClick={dispatchPlayerFullscreenRequest}
                variant="ghost"
              >
                <Maximize2 className="h-5 w-5" aria-hidden />
              </IconButton>
            </div>
          </div>

          <ListenUpNextPreview
            items={queuedItems}
            onOpenQueue={onOpenQueue}
            remainingSeconds={remainingQueueSeconds}
          />
        </div>

        {!desktopShell &&
        nextPreparation.status !== "idle" &&
        nextPreparation.target ? (
          <ListenPreparingNextStrip nextPreparation={nextPreparation} />
        ) : null}
      </div>

      {mobileTools && !desktopShell ? <div>{mobileTools}</div> : null}
    </aside>
  );
}
