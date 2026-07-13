"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Disc3,
  Headphones,
  Maximize2,
  Monitor,
  Pause,
  Play,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  UsersRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { IconButton, Slider } from "@/components/ui";
import { getYouTubeThumbnailUrl } from "@/lib/player/source";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { DirectMediaPlayer } from "@/components/room/direct-media-player";
import { YoutubeMediaPlayer } from "@/components/room/youtube-media-player";
import { YouTubeMetadataLine } from "@/components/room/youtube-metadata-line";
import { type ListenTvSettings } from "@/components/room/listen/shared";
import {
  clampNumber,
  formatSeconds,
  formatQueueRemainingDuration,
} from "@/components/room/listen/helpers";

export function ListenTvModeLayout({
  canControl,
  currentItem,
  currentPosition,
  durationSeconds,
  liveRoom,
  onExit,
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
  style,
  tvSettings,
  volume,
}: {
  canControl: boolean;
  currentItem: RoomQueueItem | null;
  currentPosition: number;
  durationSeconds: number;
  liveRoom: LiveRoomState;
  onExit(): void;
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
  style: CSSProperties;
  tvSettings: ListenTvSettings;
  volume: number;
}) {
  const session = liveRoom.snapshot.session;
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<number | null>(null);
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
  const progressMax =
    durationSeconds || Math.max(100, Math.ceil(currentPosition));
  const nextItem = queuedItems[0] ?? null;
  const dimOpacity = clampNumber(tvSettings.dimness, 0, 80) / 100;
  const visibleUiOpacity = clampNumber(tvSettings.uiBrightness, 45, 120) / 100;
  const onlineCount = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  ).length;

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) {
        window.clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  function showControlsTemporarily() {
    setControlsVisible(true);

    if (controlsTimerRef.current) {
      window.clearTimeout(controlsTimerRef.current);
    }

    controlsTimerRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 4200);
  }

  async function requestTvFullscreen() {
    const target = shellRef.current;

    if (!target || typeof target.requestFullscreen !== "function") {
      return;
    }

    await target.requestFullscreen();
  }

  return (
    <main
      className={cx(
        "fixed inset-0 z-[100] overflow-hidden bg-black text-on-surface",
        tvSettings.hideUiOnIdle && !controlsVisible && "cursor-none",
      )}
      onMouseMove={showControlsTemporarily}
      onTouchStart={showControlsTemporarily}
      ref={shellRef}
      style={style}
    >
      <div className="absolute inset-0 bg-black">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Provider artwork drives the TV-mode ambient stage.
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-58 saturate-150"
            fetchPriority="high"
            src={thumbnailUrl}
          />
        ) : null}
        {youtubeSource ? (
          <YoutubeMediaPlayer
            className="pointer-events-none absolute inset-0 h-full w-full scale-[1.02] bg-black opacity-95"
            liveRoom={liveRoom}
            mode="listen"
            showNativeControls={false}
          />
        ) : liveSource ? (
          <DirectMediaPlayer
            className="sr-only"
            liveRoom={liveRoom}
            mode="listen"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_36%,rgb(var(--listen-primary)_/_0.26),transparent_32%),linear-gradient(145deg,rgb(14_14_15),rgb(0_0_0))] text-[rgb(var(--listen-primary))]">
            <Disc3 className="h-28 w-28" aria-hidden />
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0_/_0.64),transparent_46%,rgb(0_0_0_/_0.24)),linear-gradient(180deg,rgb(0_0_0_/_0.16),rgb(0_0_0_/_0.12)_38%,rgb(0_0_0_/_0.76))]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_82%,rgb(var(--listen-primary)_/_0.22),transparent_34%),radial-gradient(circle_at_88%_20%,rgb(var(--listen-secondary)_/_0.12),transparent_32%)]" />
        <div
          aria-hidden
          className="absolute inset-0 transition-colors duration-500"
          style={{ backgroundColor: `rgb(0 0 0 / ${dimOpacity})` }}
        />
      </div>

      <div
        className={cx(
          "pointer-events-none relative z-10 grid h-dvh grid-rows-[auto_minmax(0,1fr)_auto] p-5 transition-opacity duration-500 motion-reduce:transition-none sm:p-7 lg:p-10",
          tvSettings.hideUiOnIdle && !controlsVisible && "opacity-0",
        )}
        style={{
          opacity:
            tvSettings.hideUiOnIdle && !controlsVisible ? 0 : visibleUiOpacity,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="pointer-events-auto inline-flex items-center gap-3 rounded-md border border-white/10 bg-black/36 px-4 py-3 shadow-[0_0_32px_rgb(var(--listen-shadow)/0.16)] backdrop-blur-xl">
            <UsersRound
              className="h-5 w-5 text-[rgb(var(--listen-primary))]"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="max-w-[18rem] truncate text-title-sm font-semibold text-on-surface">
                {session?.roomName ?? room.name}
              </p>
              <p className="text-label-sm text-on-surface-variant">
                {onlineCount} listening
              </p>
            </div>
          </div>
          <button
            className="pointer-events-auto inline-flex h-12 items-center gap-3 rounded-md border border-white/10 bg-black/36 px-4 text-label-md font-semibold text-on-surface shadow-[0_0_32px_rgb(var(--listen-shadow)/0.14)] backdrop-blur-xl transition hover:border-[rgb(var(--listen-primary)/0.52)] hover:text-[rgb(var(--listen-primary))]"
            onClick={onExit}
            type="button"
          >
            <Monitor className="h-5 w-5" aria-hidden />
            Exit TV Mode
            <span className="rounded-sm border border-white/10 bg-white/8 px-2 py-1 text-[11px] text-on-surface-variant">
              T
            </span>
          </button>
        </div>

        <div className="flex min-h-0 items-end pb-5">
          <div className="pointer-events-auto grid w-full gap-6">
            <div className="grid max-w-[min(46rem,58vw)] gap-3 transition-opacity duration-500 motion-reduce:transition-none">
              <p className="technical-label border-0 p-0 text-[rgb(var(--listen-primary))]">
                Now playing
              </p>
              <h1
                className="text-[clamp(1.75rem,2.65vw,3.1rem)] font-semibold leading-[1.06] tracking-normal drop-shadow-[0_6px_28px_rgb(0_0_0_/_0.55)] [text-shadow:0_0_30px_rgb(var(--listen-shadow)_/_0.24)]"
                style={{
                  color:
                    "color-mix(in srgb, rgb(var(--listen-primary)) 14%, rgb(229 226 227))",
                }}
              >
                {title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-title-md text-on-surface-variant">
                <span>{artist}</span>
                {youtubeSource ? (
                  <YouTubeMetadataLine
                    className="[&>span]:border-white/8 [&>span]:bg-black/24 [&>span]:backdrop-blur-md"
                    compact
                    showChannel={false}
                    sourceUrl={liveSource}
                    tone="dynamic"
                  />
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 transition-opacity duration-500 motion-reduce:transition-none xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-end">
              <div />
              <ListenTvUpNextCard
                nextItem={nextItem}
                remainingSeconds={remainingQueueSeconds}
              />
            </div>

            <div className="grid gap-3 transition-opacity duration-500 motion-reduce:transition-none">
              <Slider
                label="TV mode progress"
                max={progressMax}
                min={0}
                onChange={(event) => onSeek(Number(event.currentTarget.value))}
                readOnly={!canControl || !durationSeconds}
                tone="dynamic"
                value={
                  durationSeconds
                    ? Math.min(currentPosition, durationSeconds)
                    : currentPosition
                }
              />
              <div className="flex items-center justify-between text-label-md font-semibold text-on-surface">
                <span>{formatSeconds(currentPosition)}</span>
                <span>
                  {durationSeconds ? formatSeconds(durationSeconds) : "--:--"}
                </span>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-end">
              <div
                className={cx(
                  "flex flex-wrap items-center justify-center gap-5 transition-opacity duration-500 motion-reduce:transition-none",
                  controlsVisible ? "opacity-100" : "opacity-62",
                )}
              >
                <TvControlButton
                  disabled={!canControl}
                  label="Shuffle"
                  onClick={onShuffle}
                >
                  <Shuffle className="h-6 w-6" aria-hidden />
                  <span>Shuffle</span>
                </TvControlButton>
                <IconButton
                  className="h-14 w-14 rounded-full bg-black/38 text-on-surface shadow-[0_0_24px_rgb(0_0_0_/_0.34)] hover:bg-[rgb(var(--listen-primary)/0.12)] hover:text-[rgb(var(--listen-primary))]"
                  disabled={!canControl}
                  label="Previous song"
                  onClick={onPrevious}
                  variant="ghost"
                >
                  <SkipBack className="h-8 w-8" aria-hidden />
                </IconButton>
                <IconButton
                  className="h-20 w-20 rounded-full bg-[rgb(var(--listen-primary))] text-background shadow-[0_0_42px_rgb(var(--listen-shadow)/0.52)] hover:bg-[rgb(var(--listen-primary)/0.9)]"
                  disabled={!canControl || !liveSource}
                  label={isPlaying ? "Pause" : "Play"}
                  onClick={() =>
                    onPlaybackChange(isPlaying ? "paused" : "playing")
                  }
                  variant="ghost"
                >
                  {isPlaying ? (
                    <Pause className="h-10 w-10" aria-hidden />
                  ) : (
                    <Play className="h-10 w-10" aria-hidden />
                  )}
                </IconButton>
                <IconButton
                  className="h-14 w-14 rounded-full bg-black/38 text-on-surface shadow-[0_0_24px_rgb(0_0_0_/_0.34)] hover:bg-[rgb(var(--listen-primary)/0.12)] hover:text-[rgb(var(--listen-primary))]"
                  disabled={!canControl}
                  label="Next song"
                  onClick={onNext}
                  variant="ghost"
                >
                  <SkipForward className="h-8 w-8" aria-hidden />
                </IconButton>
                <TvControlButton
                  disabled={!canControl}
                  label={
                    queueAutoplayEnabled ? "Disable repeat" : "Enable repeat"
                  }
                  onClick={() =>
                    liveRoom.setQueueAutoplay(!queueAutoplayEnabled)
                  }
                  selected={queueAutoplayEnabled}
                >
                  <Repeat2 className="h-6 w-6" aria-hidden />
                  <span>Repeat</span>
                </TvControlButton>
              </div>

              <div
                className={cx(
                  "grid gap-4 transition-opacity duration-500 motion-reduce:transition-none",
                  controlsVisible ? "opacity-100" : "opacity-72",
                )}
              >
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-white/8 bg-black/24 px-4 py-3 backdrop-blur-md">
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
                    label="TV mode volume"
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
                    label="Fullscreen TV mode"
                    onClick={requestTvFullscreen}
                    variant="ghost"
                  >
                    <Maximize2 className="h-5 w-5" aria-hidden />
                  </IconButton>
                </div>
              </div>
            </div>
          </div>
        </div>

        <span className="sr-only">TV mode is active.</span>
      </div>
    </main>
  );
}
export function TvControlButton({
  children,
  disabled,
  label,
  onClick,
  selected = false,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick(): void;
  selected?: boolean;
}) {
  return (
    <button
      className={cx(
        "inline-flex min-w-20 flex-col items-center gap-1 rounded-md border border-white/6 bg-black/16 px-3 py-2 text-label-sm font-semibold text-on-surface-variant backdrop-blur-sm transition hover:border-[rgb(var(--listen-primary)/0.34)] hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-45",
        selected &&
          "border-[rgb(var(--listen-primary)/0.34)] bg-[rgb(var(--listen-primary)/0.08)] text-[rgb(var(--listen-primary))]",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
export function ListenTvUpNextCard({
  nextItem,
  remainingSeconds,
}: {
  nextItem: RoomQueueItem | null;
  remainingSeconds: number | null;
}) {
  return (
    <div className="rounded-md border border-white/8 bg-black/24 p-4 shadow-[0_0_24px_rgb(0_0_0_/_0.22)] backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="technical-label border-0 p-0 text-[rgb(var(--listen-primary))]">
          Up next
        </p>
        {remainingSeconds ? (
          <span className="text-label-sm font-semibold text-on-surface-variant">
            {formatQueueRemainingDuration(remainingSeconds)}
          </span>
        ) : null}
      </div>
      {nextItem ? (
        <div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-3">
          <ListenTvQueueThumbnail
            thumbnailUrl={nextItem.thumbnailUrl}
            title={nextItem.title}
          />
          <div className="min-w-0 self-center">
            <p className="max-h-11 overflow-hidden text-label-lg font-semibold leading-snug text-on-surface">
              {nextItem.title}
            </p>
            <p className="mt-1 truncate text-label-sm text-on-surface-variant">
              {nextItem.artist ?? nextItem.channelName ?? nextItem.addedBy}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-body-sm text-on-surface-variant">
          Queue something to keep the room moving.
        </p>
      )}
    </div>
  );
}
export function ListenTvQueueThumbnail({
  thumbnailUrl,
  title,
}: {
  thumbnailUrl?: string | null;
  title: string;
}) {
  return (
    <div className="h-16 w-16 overflow-hidden rounded-sm border border-white/8 bg-black/28">
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external media artwork.
        <img alt="" className="h-full w-full object-cover" src={thumbnailUrl} />
      ) : (
        <span className="grid h-full w-full place-items-center text-[rgb(var(--listen-primary))]">
          <Headphones className="h-6 w-6" aria-hidden />
          <span className="sr-only">{title}</span>
        </span>
      )}
    </div>
  );
}
