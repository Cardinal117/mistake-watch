"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Play } from "lucide-react";
import {
  chooseSyncCorrection,
  type CanonicalPlaybackState,
  type PlaybackMode,
  type PlaybackStatus,
} from "@/lib/player";
import {
  PLAYER_VOLUME_EVENT,
  readStoredPlayerVolume,
  type PlayerVolumeEvent,
} from "@/lib/player/local-controls";
import { parseYouTubeVideoId } from "@/lib/player/source";
import type { LiveRoomState } from "@/lib/spacetime";

type YoutubeMediaPlayerProps = {
  className?: string;
  liveRoom: LiveRoomState;
  mode: PlaybackMode;
};

type YoutubePlayer = {
  destroy(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  getPlayerState(): number;
  getVideoData(): {
    title?: string;
  };
  mute(): void;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  unMute(): void;
};

type YoutubePlayerEvent = {
  data: number;
  target: YoutubePlayer;
};

type YoutubePlayerConstructor = new (
  elementId: string,
  options: {
    events: {
      onAutoplayBlocked?: () => void;
      onError?: () => void;
      onReady?: () => void;
      onStateChange?: (event: YoutubePlayerEvent) => void;
    };
    height: string;
    playerVars: Record<string, number | string>;
    videoId: string;
    width: string;
  },
) => YoutubePlayer;

type YoutubeNamespace = {
  Player: YoutubePlayerConstructor;
  PlayerState: {
    BUFFERING: number;
    ENDED: number;
    PAUSED: number;
    PLAYING: number;
  };
};

declare global {
  interface Window {
    YT?: YoutubeNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let youtubeApiPromise: Promise<YoutubeNamespace> | null = null;

export function YoutubeMediaPlayer({
  className,
  liveRoom,
  mode,
}: YoutubeMediaPlayerProps) {
  const elementId = useId().replaceAll(":", "");
  const playerRef = useRef<YoutubePlayer | null>(null);
  const applyingRemoteState = useRef(false);
  const advanceToNextQueueItemRef = useRef(liveRoom.advanceToNextQueueItem);
  const canControlPlaybackRef = useRef(liveRoom.canControlPlayback);
  const setPlaybackStateRef = useRef(liveRoom.setPlaybackState);
  const updateMediaTitleRef = useRef(liveRoom.updateMediaTitle);
  const activeSourceUrlRef = useRef(liveRoom.snapshot.session?.sourceUrl);
  const playerSourceUrlRef = useRef<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const canonicalState = useMemo(
    () => buildCanonicalPlaybackState(liveRoom, mode),
    [liveRoom, mode],
  );
  const source = canonicalState?.source;
  const sourceUrl = source?.url ?? null;
  const videoId = sourceUrl ? parseYouTubeVideoId(sourceUrl) : null;

  useLayoutEffect(() => {
    advanceToNextQueueItemRef.current = liveRoom.advanceToNextQueueItem;
    canControlPlaybackRef.current = liveRoom.canControlPlayback;
    setPlaybackStateRef.current = liveRoom.setPlaybackState;
    updateMediaTitleRef.current = liveRoom.updateMediaTitle;
    activeSourceUrlRef.current = liveRoom.snapshot.session?.sourceUrl;
  }, [
    liveRoom.advanceToNextQueueItem,
    liveRoom.canControlPlayback,
    liveRoom.setPlaybackState,
    liveRoom.snapshot.session?.sourceUrl,
    liveRoom.updateMediaTitle,
  ]);

  const publishPlaybackState = useCallback((status: PlaybackStatus) => {
    const player = playerRef.current;

    if (
      !player ||
      !playerSourceUrlRef.current ||
      activeSourceUrlRef.current !== playerSourceUrlRef.current ||
      !canControlPlaybackRef.current ||
      applyingRemoteState.current
    ) {
      return;
    }

    setPlaybackStateRef.current({
      playbackRate: 1,
      positionSeconds: safeNumber(player.getCurrentTime()) ?? 0,
      status,
    });
  }, []);

  const handlePlayerStateChange = useCallback(
    (yt: YoutubeNamespace, event: YoutubePlayerEvent) => {
      if (applyingRemoteState.current) {
        return;
      }

      if (event.data === yt.PlayerState.PLAYING) {
        setAutoplayBlocked(false);
        publishPlaybackState("playing");
        return;
      }

      if (event.data === yt.PlayerState.PAUSED) {
        publishPlaybackState("paused");
        return;
      }

      if (event.data === yt.PlayerState.BUFFERING) {
        publishPlaybackState("buffering");
        return;
      }

      if (event.data === yt.PlayerState.ENDED) {
        publishPlaybackState("ended");
        advanceToNextQueueItemRef.current({ autoplay: true });
      }
    },
    [publishPlaybackState],
  );

  useEffect(() => {
    if (!videoId) {
      return;
    }

    let cancelled = false;

    loadYouTubeApi()
      .then((yt) => {
        if (cancelled) {
          return;
        }

        playerRef.current?.destroy();
        playerSourceUrlRef.current = sourceUrl;
        playerRef.current = new yt.Player(elementId, {
          events: {
            onAutoplayBlocked: () => {
              setAutoplayBlocked(true);
            },
            onError: () => {
              setLocalError("YouTube could not play this video here.");
              publishPlaybackState("error");
            },
            onReady: () => {
              setLocalError(null);
              const startupVolume = Math.round(readStoredPlayerVolume() * 100);
              playerRef.current?.setVolume(startupVolume);
              playerRef.current?.unMute();
              const title = playerRef.current?.getVideoData().title?.trim();
              const durationSeconds = safeDurationSeconds(
                playerRef.current?.getDuration(),
              );

              if (
                title &&
                playerSourceUrlRef.current &&
                playerSourceUrlRef.current === activeSourceUrlRef.current
              ) {
                updateMediaTitleRef.current(title, durationSeconds);
              }
            },
            onStateChange: (event) => {
              handlePlayerStateChange(yt, event);
            },
          },
          height: "100%",
          playerVars: {
            autoplay: 0,
            controls: 1,
            enablejsapi: 1,
            origin: window.location.origin,
            playsinline: 1,
            rel: 0,
          },
          videoId,
          width: "100%",
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLocalError("The YouTube player API could not be loaded.");
        }
      });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      if (playerSourceUrlRef.current === sourceUrl) {
        playerSourceUrlRef.current = null;
      }
    };
  }, [
    elementId,
    handlePlayerStateChange,
    publishPlaybackState,
    sourceUrl,
    videoId,
  ]);

  useEffect(() => {
    function handleVolume(event: Event) {
      const player = playerRef.current;

      if (!player) {
        return;
      }

      const volume = Math.round(
        (event as PlayerVolumeEvent).detail.volume * 100,
      );

      player.setVolume(volume);

      if (volume > 0) {
        player.unMute();
      } else {
        player.mute();
      }
    }

    window.addEventListener(PLAYER_VOLUME_EVENT, handleVolume);

    return () => window.removeEventListener(PLAYER_VOLUME_EVENT, handleVolume);
  }, []);

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      const player = playerRef.current;

      if (!player || !canonicalState || !source || source.kind !== "youtube") {
        return;
      }

      const localState = player.getPlayerState();
      const localPositionSeconds = safeNumber(player.getCurrentTime()) ?? 0;
      const expectedPositionSeconds = expectedYouTubePositionAt(
        canonicalState,
        Date.now(),
      );

      if (
        !canControlPlaybackRef.current &&
        shouldForceUnauthorizedCorrection({
          expectedPositionSeconds,
          localIsPlaying: isYouTubePlaying(localState),
          localPositionSeconds,
          state: canonicalState,
        })
      ) {
        applyingRemoteState.current = true;
        player.seekTo(expectedPositionSeconds, true);

        if (canonicalState.status === "playing") {
          player.playVideo();
        } else {
          player.pauseVideo();
        }

        window.setTimeout(() => {
          applyingRemoteState.current = false;
        }, 80);
        return;
      }

      const correction = chooseSyncCorrection({
        clientNowMs: Date.now(),
        local: {
          autoplayBlocked,
          durationSeconds: safeNumber(player.getDuration()),
          paused: !isYouTubePlaying(localState),
          playbackRate: safeNumber(player.getPlaybackRate()) ?? 1,
          positionSeconds: localPositionSeconds,
        },
        state: canonicalState,
      });

      applyingRemoteState.current = true;

      switch (correction.kind) {
        case "hard-seek":
        case "seek":
          player.seekTo(correction.targetPositionSeconds, true);
          if (correction.shouldPlay) {
            player.playVideo();
          }
          break;
        case "pause-and-seek":
          player.pauseVideo();
          player.seekTo(correction.targetPositionSeconds, true);
          break;
        case "play":
          player.setPlaybackRate(correction.playbackRate);
          player.playVideo();
          break;
        case "set-playback-rate":
          player.setPlaybackRate(correction.playbackRate);
          break;
        case "user-interaction-required":
          setAutoplayBlocked(true);
          break;
        case "none":
        case "wait":
          break;
      }

      window.setTimeout(() => {
        applyingRemoteState.current = false;
      }, 80);
    }, 750);

    return () => window.clearInterval(syncTimer);
  }, [autoplayBlocked, canonicalState, source]);

  return (
    <>
      <div className={className}>
        {videoId ? (
          <div className="h-full w-full" id={elementId} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black text-primary-fixed-dim">
            <Play className="h-12 w-12" aria-hidden />
          </div>
        )}
      </div>
      {autoplayBlocked ? (
        <button
          className="absolute inset-x-4 bottom-28 z-20 mx-auto max-w-sm rounded-md border border-primary-fixed-dim/35 bg-surface/90 px-4 py-3 text-body-md font-semibold text-primary-fixed-dim backdrop-blur-xl"
          onClick={() => {
            playerRef.current?.playVideo();
            setAutoplayBlocked(false);
          }}
          type="button"
        >
          Click to start YouTube playback
        </button>
      ) : null}
      {localError ? (
        <p
          className="absolute inset-x-4 bottom-28 z-20 mx-auto max-w-md rounded-md border border-error/35 bg-surface/90 px-4 py-3 text-body-md text-error backdrop-blur-xl"
          role="alert"
        >
          {localError}
        </p>
      ) : null}
    </>
  );
}

function buildCanonicalPlaybackState(
  liveRoom: LiveRoomState,
  mode: PlaybackMode,
): CanonicalPlaybackState | null {
  const session = liveRoom.snapshot.session;

  if (!session || !session.sourceUrl || !session.sourceType) {
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

function loadYouTubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  youtubeApiPromise ??= new Promise<YoutubeNamespace>((resolve, reject) => {
    const existingReady = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      existingReady?.();

      if (window.YT?.Player) {
        resolve(window.YT);
      } else {
        reject(new Error("YouTube API loaded without a player."));
      }
    };

    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
    ) {
      const script = document.createElement("script");
      script.async = true;
      script.onerror = () => reject(new Error("YouTube API failed to load."));
      script.src = "https://www.youtube.com/iframe_api";
      document.head.append(script);
    }
  });

  return youtubeApiPromise;
}

function isYouTubePlaying(state: number) {
  return state === window.YT?.PlayerState.PLAYING;
}

function safeNumber(value: number) {
  return Number.isFinite(value) ? value : undefined;
}

function safeDurationSeconds(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : undefined;
}

function expectedYouTubePositionAt(
  state: CanonicalPlaybackState,
  clientNowMs: number,
) {
  if (state.status !== "playing") {
    return Math.max(0, state.positionSeconds);
  }

  const elapsedSeconds = Math.max(
    0,
    (clientNowMs - state.serverUpdatedAtMs) / 1000,
  );

  return Math.max(
    0,
    state.positionSeconds + elapsedSeconds * state.playbackRate,
  );
}

function shouldForceUnauthorizedCorrection({
  expectedPositionSeconds,
  localIsPlaying,
  localPositionSeconds,
  state,
}: {
  expectedPositionSeconds: number;
  localIsPlaying: boolean;
  localPositionSeconds: number;
  state: CanonicalPlaybackState;
}) {
  const driftSeconds = Math.abs(localPositionSeconds - expectedPositionSeconds);

  if (state.status === "playing") {
    return !localIsPlaying || driftSeconds > 0.25;
  }

  if (state.status === "paused" || state.status === "ended") {
    return localIsPlaying || driftSeconds > 0.15;
  }

  return driftSeconds > 0.75;
}
