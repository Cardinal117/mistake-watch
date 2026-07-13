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
import {
  ListenPreparingNextStrip,
  ListenRailQueueSummary,
} from "@/components/room/listen/settings/settings-dialogs";
import { formatSeconds } from "@/components/room/listen/helpers";

export function ListenNowPlayingPanel({
  canControl,
  currentItem,
  currentPosition,
  desktopShell,
  durationSeconds,
  liveRoom,
  mobileTools,
  nextPreparation,
  onNext,
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
  mobileTools?: ReactNode;
  nextPreparation: ReturnType<typeof useNextItemPreparation>;
  onNext(): void;
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
  const nextQueueItem = queuedItems[0] ?? null;

  return (
    <aside
      className={cx(
        "relative grid min-h-0 content-start overflow-visible border-white/10 bg-transparent p-0 pb-2",
        desktopShell &&
          "h-dvh grid-rows-[minmax(0,1fr)] overflow-hidden border-r bg-background/70 p-0 backdrop-blur-xl",
      )}
      style={
        desktopShell
          ? {
              background:
                "radial-gradient(circle at 18% 10%, rgb(var(--listen-primary) / 0.16), transparent 22rem), linear-gradient(180deg, rgb(14 14 15 / 0.72), rgb(14 14 15 / 0.62))",
            }
          : undefined
      }
    >
      <div
        className={cx(
          "relative grid min-h-0 overflow-hidden transition-colors duration-1000",
          desktopShell
            ? "grid-rows-[minmax(0,1fr)_auto] rounded-none border-0 shadow-none"
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
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-32 blur-3xl saturate-150"
              fetchPriority="high"
              loading="eager"
              src={thumbnailUrl}
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,rgb(14_14_15_/_0.16),rgb(14_14_15_/_0.82))]"
            />
          </>
        ) : null}
        <div
          className={cx(
            "relative z-10 flex min-h-0 flex-col gap-5 overflow-y-auto py-1 [scrollbar-color:rgb(var(--listen-primary)_/_0.42)_transparent] [scrollbar-width:thin]",
            desktopShell && "h-full content-start px-4 py-5 pt-6",
          )}
        >
          <div className="relative aspect-[1/1.02] min-h-[16rem] overflow-hidden rounded-md border border-white/8 bg-black shadow-[0_0_34px_rgb(var(--listen-shadow)/0.12),inset_0_0_0_1px_rgb(255_255_255_/_0.04)] xl:min-h-[18.5rem]">
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
                  className="absolute inset-0 h-full w-full object-contain"
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

          <div className="grid gap-2.5 pt-1">
            <h1 className="text-headline-md font-semibold leading-tight text-on-surface [overflow-wrap:anywhere]">
              {title}
            </h1>
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

          <div className="grid gap-3">
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

            <div className="flex items-center justify-center gap-3 py-1">
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
                className="bg-[rgb(var(--listen-primary))] text-background shadow-[0_0_24px_rgb(var(--listen-shadow)/0.28)] hover:bg-[rgb(var(--listen-primary)/0.9)]"
                disabled={awaitingMedia || !canControl}
                label={isPlaying ? "Pause" : "Play"}
                onClick={() =>
                  onPlaybackChange(isPlaying ? "paused" : "playing")
                }
                variant="ghost"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" aria-hidden />
                ) : (
                  <Play className="h-5 w-5" aria-hidden />
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

            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 pt-1">
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

          {desktopShell ? (
            <ListenRailQueueSummary
              nextItem={nextQueueItem}
              queueCount={queuedItems.length}
              remainingSeconds={remainingQueueSeconds}
            />
          ) : null}
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
