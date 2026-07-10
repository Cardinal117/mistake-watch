"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Film,
  Maximize2,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { IconButton, Slider } from "@/components/ui";
import {
  expectedPositionAt,
  resolveWaveformSource,
  type CanonicalPlaybackState,
  type WaveformSourcePlan,
} from "@/lib/player";
import {
  dispatchPlayerFullscreenRequest,
  dispatchPlayerVolume,
  readStoredPlayerVolume,
} from "@/lib/player/local-controls";
import {
  getSourceDisplayTitle,
  getYouTubeThumbnailUrl,
} from "@/lib/player/source";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { useWaveformEnvironment } from "./use-waveform-environment";
import { useRoomMediaSession } from "./use-room-media-session";
import { YouTubeMetadataLine } from "./youtube-metadata-line";

type TransportControlsProps = {
  liveRoom: LiveRoomState;
  presentation?: "cinematic" | "standard";
  room: RoomSnapshot;
};

const DEFAULT_TRANSPORT_VOLUME = 72;

export function TransportControls({
  liveRoom,
  presentation = "standard",
  room,
}: TransportControlsProps) {
  const [clockMs, setClockMs] = useState(0);
  const [volume, setVolume] = useState(DEFAULT_TRANSPORT_VOLUME);
  const waveformEnvironment = useWaveformEnvironment();
  const session = liveRoom.snapshot.session;
  const awaitingMedia = !session?.sourceUrl;
  const canControl = liveRoom.canControlPlayback;
  const queueAutoplayEnabled = session?.queueAutoplayEnabled ?? true;
  const currentPosition = useMemo(() => {
    const canonicalState = buildCanonicalState(liveRoom, room.mode);

    return canonicalState ? expectedPositionAt(canonicalState, clockMs) : 0;
  }, [clockMs, liveRoom, room.mode]);
  const currentQueueItem = session?.activeQueueItemId
    ? liveRoom.snapshot.queue.find(
        (item) => item.queueItemId === session.activeQueueItemId,
      ) ?? null
    : null;
  const title = session?.sourceTitle ?? room.nowPlaying.title;
  const durationSeconds =
    currentQueueItem?.durationSeconds ?? session?.sourceDurationSeconds ?? 0;
  const nextQueueItem = liveRoom.snapshot.queue
    .filter((item) => item.status === "queued")
    .sort((left, right) => left.position - right.position)[0] ?? null;
  const previousQueueItem = liveRoom.snapshot.queue
    .filter((item) => item.status === "played")
    .sort(
      (left, right) =>
        (left.playedSequence ?? 0) - (right.playedSequence ?? 0),
    )
    .at(-1) ?? null;
  const nextTitle = nextQueueItem
    ? getSourceDisplayTitle({
        sourceType: nextQueueItem.sourceType,
        sourceUrl: nextQueueItem.sourceUrl,
        title: nextQueueItem.title,
      })
    : null;
  const nextThumbnailUrl =
    nextQueueItem?.thumbnailUrl ??
    (nextQueueItem?.sourceType === "youtube"
      ? getYouTubeThumbnailUrl(nextQueueItem.sourceUrl)
      : null);
  const nextSubtitle =
    nextQueueItem?.artist ??
    nextQueueItem?.channelName ??
    (nextQueueItem?.durationSeconds
      ? formatSeconds(nextQueueItem.durationSeconds)
      : "Queue preview");
  const progressClass =
    awaitingMedia ? "opacity-55" : undefined;
  const cinematic = presentation === "cinematic" && room.mode === "watch";
  const waveformPlan = useMemo(
    () =>
      resolveWaveformSource(
        {
          sourceType: session?.sourceType,
          sourceUrl: session?.sourceUrl,
        },
        waveformEnvironment,
      ),
    [session?.sourceType, session?.sourceUrl, waveformEnvironment],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setVolume(readStoredVolume());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    dispatchPlayerVolume(volume / 100);
  }, [volume]);

  const setPlayback = useCallback(
    (status: "paused" | "playing") => {
      liveRoom.setPlaybackState({
        positionSeconds: currentPosition,
        status,
      });
    },
    [currentPosition, liveRoom],
  );

  const seekRelative = useCallback(
    (deltaSeconds: number) => {
      liveRoom.setPlaybackState({
        positionSeconds: Math.max(0, currentPosition + deltaSeconds),
        status: session?.status === "playing" ? "playing" : "paused",
      });
    },
    [currentPosition, liveRoom, session?.status],
  );

  const seekTo = useCallback(
    (positionSeconds: number) => {
      liveRoom.setPlaybackState({
        positionSeconds: Math.max(0, positionSeconds),
        status: session?.status === "playing" ? "playing" : "paused",
      });
    },
    [liveRoom, session?.status],
  );

  const playPreviousQueueItem = useCallback(() => {
    if (previousQueueItem) {
      liveRoom.playQueueItemNow(previousQueueItem.queueItemId);
    }
  }, [liveRoom, previousQueueItem]);

  const playNextQueueItem = useCallback(() => {
    if (nextQueueItem) {
      liveRoom.playQueueItemNow(nextQueueItem.queueItemId);
    }
  }, [liveRoom, nextQueueItem]);

  useRoomMediaSession({
    canControlPlayback: canControl,
    currentPositionSeconds: currentPosition,
    currentQueueItem,
    durationSeconds,
    nextQueueItem,
    onNextTrack: playNextQueueItem,
    onPause: () => setPlayback("paused"),
    onPlay: () => setPlayback("playing"),
    onPreviousTrack: playPreviousQueueItem,
    onSeekRelative: seekRelative,
    onSeekTo: seekTo,
    previousQueueItem,
    room,
    session,
  });

  function setLocalVolume(nextVolume: number) {
    const safeVolume = Math.min(100, Math.max(0, nextVolume));
    setVolume(safeVolume);
    window.localStorage.setItem("mw_player_volume", String(safeVolume));
    dispatchPlayerVolume(safeVolume / 100);
  }

  if (cinematic) {
    return (
      <section
        aria-label="Playback controls"
        className="fixed bottom-2 left-4 right-4 z-40 rounded-lg border border-white/10 bg-background/52 shadow-[0_-10px_34px_rgb(0_0_0_/_0.34),inset_0_0_22px_rgb(0_219_233_/_0.035)] backdrop-blur-xl md:left-10 md:right-10"
      >
        <div className="grid gap-2 px-3 py-2">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center">
            <div className="min-w-0">
              <p className="truncate text-label-sm font-semibold text-on-surface">
                {awaitingMedia ? "Awaiting media" : title}
              </p>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
                {room.nowPlaying.artist ? (
                  <span className="truncate text-label-sm text-on-surface-variant">
                    {room.nowPlaying.artist}
                  </span>
                ) : null}
                {session?.sourceType === "youtube" ? (
                  <YouTubeMetadataLine
                    sourceUrl={session.sourceUrl}
                    tone="cyan"
                  />
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-center gap-1">
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
                disabled={!canControl || !previousQueueItem}
                label="Previous queue item"
                onClick={playPreviousQueueItem}
                variant="ghost"
              >
                <SkipBack className="h-5 w-5" aria-hidden />
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
                disabled={!canControl || !nextQueueItem}
                label="Next queue item"
                onClick={playNextQueueItem}
                variant="ghost"
              >
                <SkipForward className="h-5 w-5" aria-hidden />
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

            <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(12rem,19rem)_minmax(12rem,18rem)] lg:items-center lg:justify-end">
              <div className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-center gap-2 rounded-md border border-white/10 bg-background/22 p-1.5">
                <div className="grid h-10 w-12 place-items-center overflow-hidden rounded-sm border border-white/10 bg-surface-container-lowest">
                  {nextThumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Queue thumbnails come from provider metadata and are decorative in this compact preview.
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={nextThumbnailUrl}
                    />
                  ) : (
                    <Film
                      className="h-4 w-4 text-on-surface-variant"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="technical-label text-primary-fixed-dim">Next</p>
                  <p className="truncate text-label-sm font-semibold text-on-surface">
                    {nextTitle ?? "Queue is waiting"}
                  </p>
                  {nextTitle ? (
                    <p className="truncate text-[11px] text-on-surface-variant">
                      {nextSubtitle}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 lg:hidden">
                <IconButton
                  label="Fullscreen"
                  onClick={dispatchPlayerFullscreenRequest}
                  variant="ghost"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden />
                </IconButton>
              </div>

              <div className="hidden min-w-0 items-center justify-end gap-2 lg:flex">
                <IconButton
                  className={cx(
                    queueAutoplayEnabled &&
                      "border-primary-fixed-dim/45 bg-primary-fixed-dim/10 text-primary-fixed-dim",
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
                {volume <= 0 ? (
                  <VolumeX
                    className="h-4 w-4 text-on-surface-variant"
                    aria-hidden
                  />
                ) : (
                  <Volume2
                    className="h-4 w-4 text-on-surface-variant"
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
                  tone="cyan"
                  value={volume}
                />
                <IconButton
                  label="Fullscreen"
                  onClick={dispatchPlayerFullscreenRequest}
                  variant="ghost"
                >
                  <Maximize2 className="h-4 w-4" aria-hidden />
                </IconButton>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-label-sm text-on-surface-variant">
            <span>{formatSeconds(currentPosition)}</span>
            <Slider
              aria-valuetext={
                awaitingMedia
                  ? "Awaiting media"
                  : `${formatSeconds(currentPosition)} elapsed`
              }
              className={progressClass}
              label="Playback progress"
              max={durationSeconds || Math.max(100, Math.ceil(currentPosition))}
              min={0}
              onChange={(event) =>
                liveRoom.setPlaybackState({
                  positionSeconds: Number(event.currentTarget.value),
                  status: session?.status === "playing" ? "playing" : "paused",
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
            <span>{durationSeconds ? formatSeconds(durationSeconds) : "--:--"}</span>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Playback controls"
      className={cx(
        "fixed inset-x-0 bottom-0 z-40 border-t border-white/10 backdrop-blur-xl",
        cinematic
          ? "bg-background/88 shadow-[0_-18px_44px_rgb(0_0_0_/_0.45)]"
          : "bg-surface/92",
      )}
    >
      <div
        className={cx(
          "grid gap-2 px-margin-mobile py-3 md:px-margin-desktop",
          cinematic ? "w-full" : "lg:px-0",
        )}
      >
        <div
          className={cx(
            "min-w-0",
            cinematic
              ? "grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)] md:items-end"
              : "lg:pl-4 lg:pr-[380px]",
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-body-md font-semibold text-on-surface">
              {awaitingMedia ? "Awaiting media" : title}
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
          </div>
          {cinematic ? (
            <div className="grid min-w-0 grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 rounded-md border border-white/10 bg-background/28 p-2 shadow-[inset_0_0_18px_rgb(0_219_233_/_0.035)] backdrop-blur-md">
              <div className="grid h-12 w-14 place-items-center overflow-hidden rounded-sm border border-white/10 bg-surface-container-lowest">
                {nextThumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Queue thumbnails come from provider metadata and are decorative in this compact preview.
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={nextThumbnailUrl}
                  />
                ) : (
                  <Film
                    className="h-5 w-5 text-on-surface-variant"
                    aria-hidden
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="technical-label text-primary-fixed-dim">Next</p>
                <p className="truncate text-label-sm font-semibold text-on-surface">
                  {nextTitle ?? "Queue is waiting"}
                </p>
                {nextTitle ? (
                  <p className="truncate text-label-sm text-on-surface-variant">
                    {nextSubtitle}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={cx(
            "grid gap-3 lg:items-center lg:gap-4",
            cinematic
              ? "lg:grid-cols-[minmax(0,1fr)_auto]"
              : "lg:grid-cols-[280px_minmax(0,1fr)_380px]",
          )}
        >
          {cinematic ? null : <div className="hidden lg:block" aria-hidden />}
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
                disabled={!canControl || !previousQueueItem}
                label="Previous queue item"
                onClick={playPreviousQueueItem}
                variant="ghost"
              >
                <SkipBack className="h-5 w-5" aria-hidden />
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
                disabled={!canControl || !nextQueueItem}
                label="Next queue item"
                onClick={playNextQueueItem}
                variant="ghost"
              >
                <SkipForward className="h-5 w-5" aria-hidden />
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
                  plan={waveformPlan}
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

          <div
            className={cx(
              "hidden min-w-0 items-center justify-end gap-2 lg:flex",
              !cinematic && "lg:pr-4",
            )}
          >
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
  plan,
}: {
  awaitingMedia: boolean;
  canControl: boolean;
  currentPosition: number;
  durationSeconds: number;
  isPlaying: boolean;
  onSeek(positionSeconds: number): void;
  plan: WaveformSourcePlan;
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
  const animated =
    isPlaying &&
    !awaitingMedia &&
    plan.analysisMode !== "static" &&
    plan.analysisMode !== "precomputed_peaks";
  const waveformLabel =
    plan.analysisMode === "browser_analyser"
      ? "Audio-reactive waveform progress"
      : plan.analysisMode === "precomputed_peaks"
        ? "Precomputed waveform progress"
        : plan.analysisMode === "static"
          ? "Static waveform progress"
          : "Generated progress waveform";

  return (
    <label
      className="relative grid h-9 items-center"
      data-waveform-mode={plan.analysisMode}
      data-waveform-source={plan.kind}
      title={plan.reason}
    >
      <span className="sr-only">{waveformLabel}</span>
      <div
        aria-hidden
        className={cx(
          "pointer-events-none absolute inset-x-0 top-1/2 flex h-7 -translate-y-1/2 items-center gap-0.5 overflow-hidden",
          animated && "music-waveform-active",
          plan.analysisMode === "static" && "music-waveform-static",
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
