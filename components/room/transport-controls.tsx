"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Maximize2,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { IconButton, Slider } from "@/components/ui";
import { expectedPositionAt, type CanonicalPlaybackState } from "@/lib/player";
import {
  dispatchPlayerFullscreenRequest,
  dispatchPlayerVolume,
  readStoredPlayerVolume,
} from "@/lib/player/local-controls";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { YouTubeMetadataLine } from "./youtube-metadata-line";
import { useNextItemPreparation } from "./use-next-item-preparation";

type TransportControlsProps = {
  liveRoom: LiveRoomState;
  room: RoomSnapshot;
};

export function TransportControls({ liveRoom, room }: TransportControlsProps) {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [volume, setVolume] = useState(readStoredVolume);
  const session = liveRoom.snapshot.session;
  const awaitingMedia = !session?.sourceUrl;
  const canControl = liveRoom.canControlPlayback;
  const queueAutoplayEnabled = session?.queueAutoplayEnabled ?? true;
  const nextPreparation = useNextItemPreparation(liveRoom);
  const currentPosition = useMemo(() => {
    const canonicalState = buildCanonicalState(liveRoom, room.mode);

    return canonicalState ? expectedPositionAt(canonicalState, clockMs) : 0;
  }, [clockMs, liveRoom, room.mode]);
  const currentQueueItem = session?.activeQueueItemId
    ? liveRoom.snapshot.queue.find(
        (item) => item.queueItemId === session.activeQueueItemId,
      )
    : null;
  const title = session?.sourceTitle ?? room.nowPlaying.title;
  const durationSeconds =
    currentQueueItem?.durationSeconds ?? session?.sourceDurationSeconds ?? 0;
  const labelClass =
    room.mode === "listen"
      ? "text-secondary-fixed-dim"
      : "text-primary-fixed-dim";
  const progressClass =
    awaitingMedia && room.mode === "listen"
      ? "awaiting-media-slider awaiting-media-slider-amber"
      : awaitingMedia
        ? "awaiting-media-slider"
        : undefined;

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    dispatchPlayerVolume(volume / 100);
  }, [volume]);

  function setPlayback(status: "paused" | "playing") {
    liveRoom.setPlaybackState({
      positionSeconds: currentPosition,
      status,
    });
  }

  function seekRelative(deltaSeconds: number) {
    liveRoom.setPlaybackState({
      positionSeconds: Math.max(0, currentPosition + deltaSeconds),
      status: session?.status === "playing" ? "playing" : "paused",
    });
  }

  function setLocalVolume(nextVolume: number) {
    const safeVolume = Math.min(100, Math.max(0, nextVolume));
    setVolume(safeVolume);
    window.localStorage.setItem("mw_player_volume", String(safeVolume));
    dispatchPlayerVolume(safeVolume / 100);
  }

  return (
    <section
      aria-label="Playback controls"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface/92 backdrop-blur-xl"
    >
      <div className="grid gap-2 px-margin-mobile py-3 md:px-margin-desktop lg:px-0">
        <div className="min-w-0 lg:pl-4 lg:pr-[380px]">
          <p className={`technical-label ${labelClass}`}>
            {awaitingMedia ? "Awaiting Media" : "Now Playing"}
          </p>
          <p className="truncate text-body-md font-semibold text-on-surface">
            {title}
          </p>
          {room.nowPlaying.artist ? (
            <p className="truncate text-label-sm text-on-surface-variant">
              {room.nowPlaying.artist}
            </p>
          ) : null}
          {session?.sourceType === "youtube" ? (
            <YouTubeMetadataLine
              className="mt-1"
              sourceUrl={session.sourceUrl}
              tone={room.mode === "listen" ? "amber" : "cyan"}
            />
          ) : null}
          {nextPreparation.status !== "idle" && nextPreparation.target ? (
            <p className="mt-1 truncate text-label-sm text-on-surface-variant">
              <span className={labelClass}>
                {formatPreparationStatus(nextPreparation.status)}
              </span>{" "}
              {nextPreparation.target.title}
              {typeof nextPreparation.durationMs === "number" ? (
                <span> - {nextPreparation.durationMs}ms</span>
              ) : null}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)_380px] lg:items-center lg:gap-4">
          <div className="hidden lg:block" aria-hidden />
          <div className="grid min-w-0 gap-2">
            <div className="flex items-center justify-center gap-2">
              <IconButton
                disabled={awaitingMedia || !canControl}
                label="Back 10 seconds"
                onClick={() => seekRelative(-10)}
                variant="ghost"
              >
                <SkipAmountIcon amount={10} direction="back" />
              </IconButton>
              <IconButton
                disabled={awaitingMedia || !canControl}
                label="Back 5 seconds"
                onClick={() => seekRelative(-5)}
                variant="ghost"
              >
                <SkipAmountIcon amount={5} direction="back" />
              </IconButton>
              <IconButton
                disabled={awaitingMedia || !canControl}
                label={session?.status === "playing" ? "Pause" : "Play"}
                onClick={() =>
                  setPlayback(
                    session?.status === "playing" ? "paused" : "playing",
                  )
                }
                variant="primary"
              >
                {session?.status === "playing" ? (
                  <Pause className="h-5 w-5" aria-hidden />
                ) : (
                  <Play className="h-5 w-5" aria-hidden />
                )}
              </IconButton>
              <IconButton
                disabled={awaitingMedia || !canControl}
                label="Forward 5 seconds"
                onClick={() => seekRelative(5)}
                variant="ghost"
              >
                <SkipAmountIcon amount={5} direction="forward" />
              </IconButton>
              <IconButton
                disabled={awaitingMedia || !canControl}
                label="Forward 10 seconds"
                onClick={() => seekRelative(10)}
                variant="ghost"
              >
                <SkipAmountIcon amount={10} direction="forward" />
              </IconButton>
            </div>
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-label-sm text-on-surface-variant sm:gap-3">
              <span>{formatSeconds(currentPosition)}</span>
              {room.mode === "listen" ? (
                <WaveformProgress
                  awaitingMedia={awaitingMedia}
                  canControl={canControl}
                  currentPosition={currentPosition}
                  durationSeconds={durationSeconds}
                  isPlaying={session?.status === "playing"}
                  onSeek={(positionSeconds) =>
                    liveRoom.setPlaybackState({
                      positionSeconds,
                      status:
                        session?.status === "playing" ? "playing" : "paused",
                    })
                  }
                />
              ) : (
                <Slider
                  aria-valuetext={
                    awaitingMedia
                      ? "Awaiting media"
                      : `${formatSeconds(currentPosition)} elapsed`
                  }
                  className={progressClass}
                  label="Playback progress"
                  max={
                    durationSeconds || Math.max(100, Math.ceil(currentPosition))
                  }
                  min={0}
                  onChange={(event) =>
                    liveRoom.setPlaybackState({
                      positionSeconds: Number(event.currentTarget.value),
                      status:
                        session?.status === "playing" ? "playing" : "paused",
                    })
                  }
                  readOnly={awaitingMedia || !canControl || !durationSeconds}
                  tone="cyan"
                  value={
                    awaitingMedia
                      ? 0
                      : durationSeconds
                        ? Math.min(currentPosition, durationSeconds)
                        : currentPosition
                  }
                />
              )}
              <span>
                {durationSeconds ? formatSeconds(durationSeconds) : "--:--"}
              </span>
            </div>
            <div className="grid gap-2 rounded-md border border-white/10 bg-surface-container-low/70 p-2 lg:hidden">
              <div className="flex items-center justify-between gap-2">
                <span className="technical-label text-on-surface-variant">
                  Sound
                </span>
                <div className="flex items-center gap-2">
                  <IconButton
                    className={cx(
                      queueAutoplayEnabled &&
                        (room.mode === "listen"
                          ? "border-secondary-fixed-dim/45 bg-secondary-fixed-dim/10 text-secondary-fixed-dim"
                          : "border-primary-fixed-dim/45 bg-primary-fixed-dim/10 text-primary-fixed-dim"),
                    )}
                    disabled={!canControl}
                    label={
                      queueAutoplayEnabled
                        ? "Disable queue autoplay"
                        : "Enable queue autoplay"
                    }
                    onClick={() =>
                      liveRoom.setQueueAutoplay(!queueAutoplayEnabled)
                    }
                    variant="default"
                  >
                    <Repeat2 className="h-4 w-4" aria-hidden />
                  </IconButton>
                  <IconButton
                    label="Fullscreen"
                    onClick={dispatchPlayerFullscreenRequest}
                    variant="ghost"
                  >
                    <Maximize2 className="h-4 w-4" aria-hidden />
                  </IconButton>
                </div>
              </div>
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
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
                    setLocalVolume(Number(event.currentTarget.value))
                  }
                  tone={room.mode === "listen" ? "amber" : "cyan"}
                  value={volume}
                />
                <span className="text-label-sm text-on-surface-variant">
                  {volume}%
                </span>
              </div>
            </div>
          </div>

          <div className="hidden min-w-0 items-center justify-end gap-2 lg:flex lg:pr-4">
            <IconButton
              className={cx(
                queueAutoplayEnabled &&
                  (room.mode === "listen"
                    ? "border-secondary-fixed-dim/45 bg-secondary-fixed-dim/10 text-secondary-fixed-dim"
                    : "border-primary-fixed-dim/45 bg-primary-fixed-dim/10 text-primary-fixed-dim"),
              )}
              disabled={!canControl}
              label={
                queueAutoplayEnabled
                  ? "Disable queue autoplay"
                  : "Enable queue autoplay"
              }
              onClick={() => liveRoom.setQueueAutoplay(!queueAutoplayEnabled)}
              variant="default"
            >
              <Repeat2 className="h-5 w-5" aria-hidden />
            </IconButton>
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
                setLocalVolume(Number(event.currentTarget.value))
              }
              tone={room.mode === "listen" ? "amber" : "cyan"}
              value={volume}
            />
            <IconButton
              label="Fullscreen"
              onClick={dispatchPlayerFullscreenRequest}
              variant="ghost"
            >
              <Maximize2 className="h-5 w-5" aria-hidden />
            </IconButton>
          </div>
        </div>
      </div>
    </section>
  );
}

function WaveformProgress({
  awaitingMedia,
  canControl,
  currentPosition,
  durationSeconds,
  isPlaying,
  onSeek,
}: {
  awaitingMedia: boolean;
  canControl: boolean;
  currentPosition: number;
  durationSeconds: number;
  isPlaying: boolean;
  onSeek(positionSeconds: number): void;
}) {
  const max = durationSeconds || Math.max(100, Math.ceil(currentPosition));
  const value = awaitingMedia
    ? 0
    : durationSeconds
      ? Math.min(currentPosition, durationSeconds)
      : currentPosition;
  const progress =
    max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const disabled = awaitingMedia || !canControl || !durationSeconds;
  const bars = 72;

  return (
    <label className="relative grid h-9 items-center">
      <span className="sr-only">Playback progress</span>
      <div
        aria-hidden
        className={cx(
          "pointer-events-none absolute inset-x-0 top-1/2 flex h-7 -translate-y-1/2 items-center gap-0.5 overflow-hidden",
          isPlaying && "music-waveform-active",
        )}
      >
        {Array.from({ length: bars }).map((_, index) => {
          const filled = (index / (bars - 1)) * 100 <= progress;
          const height = 18 + ((index * 19) % 70);

          return (
            <span
              className={cx(
                "music-progress-bar block w-full rounded-sm transition-colors duration-200",
                filled
                  ? "bg-secondary-fixed-dim shadow-[0_0_12px_rgb(255_186_32_/_0.34)]"
                  : "bg-white/14",
              )}
              key={index}
              style={{
                animationDelay: `${(index % 12) * 70}ms`,
                height: `${height}%`,
              }}
            />
          );
        })}
      </div>
      <input
        aria-valuetext={
          awaitingMedia ? "Awaiting media" : `${formatSeconds(value)} elapsed`
        }
        className="music-waveform-input relative z-10 h-9 w-full"
        disabled={disabled}
        max={max}
        min={0}
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
        type="range"
        value={value}
      />
    </label>
  );
}

function SkipAmountIcon({
  amount,
  direction,
}: {
  amount: 5 | 10;
  direction: "back" | "forward";
}) {
  const Icon = direction === "back" ? RotateCcw : RotateCw;

  return (
    <span className="relative inline-flex h-5 w-5 items-center justify-center">
      <Icon className="h-5 w-5" aria-hidden />
      <span className="absolute text-[8px] font-bold leading-none text-current">
        {amount}
      </span>
    </span>
  );
}

function buildCanonicalState(
  liveRoom: LiveRoomState,
  mode: "listen" | "watch",
): CanonicalPlaybackState | null {
  const session = liveRoom.snapshot.session;

  if (!session?.sourceUrl || !session.sourceType) {
    return null;
  }

  return {
    activeQueueItemId: session.activeQueueItemId,
    controllerMemberId: null,
    hostMemberId: session.hostMemberId,
    mode,
    playbackRate: 1,
    positionSeconds: session.positionSeconds,
    roomId: session.roomId,
    serverUpdatedAtMs: session.serverUpdatedMs,
    source: {
      kind:
        session.sourceType === "hls" || session.sourceType === "youtube"
          ? session.sourceType
          : "direct",
      title: session.sourceTitle ?? undefined,
      url: session.sourceUrl,
    },
    status: session.status,
  };
}

function formatSeconds(value: number) {
  const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function readStoredVolume() {
  return Math.round(readStoredPlayerVolume() * 100);
}

function formatPreparationStatus(
  status: ReturnType<typeof useNextItemPreparation>["status"],
) {
  if (status === "preparing") {
    return "Preparing next:";
  }

  if (status === "ready") {
    return "Next ready:";
  }

  if (status === "partial") {
    return "Next warming:";
  }

  if (status === "skipped") {
    return "Next queued:";
  }

  return "Next pending:";
}
