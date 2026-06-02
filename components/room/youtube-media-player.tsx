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
import {
  isNearYouTubeEnd,
  shouldFallbackAdvanceYouTubeQueue,
} from "@/lib/player/youtube-autoplay-continuity";
import type { LiveRoomState } from "@/lib/spacetime";
import {
  loadYouTubeIframeApi,
  type YoutubeNamespace,
  type YoutubePlayer,
  type YoutubePlayerEvent,
} from "@/lib/youtube/iframe-api";

type YoutubeMediaPlayerProps = {
  className?: string;
  liveRoom: LiveRoomState;
  mode: PlaybackMode;
};

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
  const canonicalStateRef = useRef<CanonicalPlaybackState | null>(null);
  const fallbackAdvancedKeyRef = useRef<string | null>(null);
  const hasNextQueueItemRef = useRef(false);
  const metadataRefreshTimerRef = useRef<number | null>(null);
  const setPlaybackStateRef = useRef(liveRoom.setPlaybackState);
  const updateMediaTitleRef = useRef(liveRoom.updateMediaTitle);
  const activeSourceUrlRef = useRef(liveRoom.snapshot.session?.sourceUrl);
  const playerSourceUrlRef = useRef<string | null>(null);
  const playerVideoIdRef = useRef<string | null>(null);
  const queueAutoplayEnabledRef = useRef(
    liveRoom.snapshot.session?.queueAutoplayEnabled ?? true,
  );
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const canonicalState = useMemo(
    () => buildCanonicalPlaybackState(liveRoom, mode),
    [liveRoom, mode],
  );
  const source = canonicalState?.source;
  const sourceUrl = source?.url ?? null;
  const videoId = sourceUrl ? parseYouTubeVideoId(sourceUrl) : null;
  const hasVideo = Boolean(videoId);

  useLayoutEffect(() => {
    advanceToNextQueueItemRef.current = liveRoom.advanceToNextQueueItem;
    canControlPlaybackRef.current = liveRoom.canControlPlayback;
    canonicalStateRef.current = canonicalState;
    hasNextQueueItemRef.current = liveRoom.snapshot.queue.some(
      (item) => item.status === "queued",
    );
    queueAutoplayEnabledRef.current =
      liveRoom.snapshot.session?.queueAutoplayEnabled ?? true;
    setPlaybackStateRef.current = liveRoom.setPlaybackState;
    updateMediaTitleRef.current = liveRoom.updateMediaTitle;
    activeSourceUrlRef.current = liveRoom.snapshot.session?.sourceUrl;
  }, [
    liveRoom.advanceToNextQueueItem,
    liveRoom.canControlPlayback,
    liveRoom.setPlaybackState,
    canonicalState,
    liveRoom.snapshot.queue,
    liveRoom.snapshot.session?.sourceUrl,
    liveRoom.snapshot.session?.queueAutoplayEnabled,
    liveRoom.updateMediaTitle,
  ]);

  const requestAutoplayAdvance = useCallback(() => {
    const activeKey = getActivePlaybackKey(canonicalStateRef.current);

    if (!activeKey || fallbackAdvancedKeyRef.current === activeKey) {
      return;
    }

    fallbackAdvancedKeyRef.current = activeKey;
    advanceToNextQueueItemRef.current({ autoplay: true });
  }, []);

  const publishCurrentMetadata = useCallback((player: YoutubePlayer) => {
    const title = player.getVideoData().title?.trim();
    const durationSeconds = safeDurationSeconds(player.getDuration());

    if (
      title &&
      playerSourceUrlRef.current &&
      playerSourceUrlRef.current === activeSourceUrlRef.current
    ) {
      updateMediaTitleRef.current(title, durationSeconds);
    }
  }, []);

  const scheduleMetadataRefresh = useCallback(
    (player: YoutubePlayer, attempts = 8) => {
      if (metadataRefreshTimerRef.current) {
        window.clearTimeout(metadataRefreshTimerRef.current);
      }

      function run(nextAttempts: number) {
        metadataRefreshTimerRef.current = window.setTimeout(() => {
          metadataRefreshTimerRef.current = null;

          if (!isUsableYouTubePlayer(player)) {
            return;
          }

          publishCurrentMetadata(player);

          if (
            nextAttempts > 0 &&
            !safeDurationSeconds(player.getDuration()) &&
            playerSourceUrlRef.current === activeSourceUrlRef.current
          ) {
            run(nextAttempts - 1);
          }
        }, 500);
      }

      run(attempts);
    },
    [publishCurrentMetadata],
  );

  const applyCanonicalVideoToPlayer = useCallback(
    (player: YoutubePlayer) => {
      const state = canonicalStateRef.current;
      const currentSourceUrl = state?.source?.url ?? null;
      const currentVideoId = currentSourceUrl
        ? parseYouTubeVideoId(currentSourceUrl)
        : null;

      if (!state?.source || state.source.kind !== "youtube" || !currentVideoId) {
        return;
      }

      const alreadyLoaded =
        playerSourceUrlRef.current === currentSourceUrl &&
        playerVideoIdRef.current === currentVideoId;

      if (alreadyLoaded) {
        if (state.status === "playing") {
          const expectedPositionSeconds = expectedYouTubePositionAt(
            state,
            Date.now(),
          );
          const localPositionSeconds =
            safeNumber(player.getCurrentTime()) ?? 0;

          if (Math.abs(localPositionSeconds - expectedPositionSeconds) > 0.75) {
            player.seekTo(expectedPositionSeconds, true);
          }

          player.playVideo();
        }
        return;
      }

      const startSeconds = expectedYouTubePositionAt(state, Date.now());

      applyingRemoteState.current = true;
      setAutoplayBlocked(false);
      setLocalError(null);
      playerSourceUrlRef.current = currentSourceUrl;
      playerVideoIdRef.current = currentVideoId;
      fallbackAdvancedKeyRef.current = null;

      if (state.status === "playing" || state.status === "buffering") {
        player.loadVideoById(currentVideoId, startSeconds);
        if (state.status === "playing") {
          player.playVideo();
        }
      } else {
        player.cueVideoById(currentVideoId, startSeconds);
      }

      window.setTimeout(() => {
        applyingRemoteState.current = false;
        scheduleMetadataRefresh(player);
      }, 900);
    },
    [scheduleMetadataRefresh],
  );

  const resyncPlayerToCanonicalState = useCallback(
    (
      player: YoutubePlayer,
      { forcePlayAttempt = false }: { forcePlayAttempt?: boolean } = {},
    ) => {
      const state = canonicalStateRef.current;

      if (!state?.source || state.source.kind !== "youtube") {
        return;
      }

      const expectedPositionSeconds = expectedYouTubePositionAt(
        state,
        Date.now(),
      );
      const localPositionSeconds = safeNumber(player.getCurrentTime()) ?? 0;
      const driftSeconds = Math.abs(
        localPositionSeconds - expectedPositionSeconds,
      );

      applyingRemoteState.current = true;

      if (driftSeconds > 0.75) {
        player.seekTo(expectedPositionSeconds, true);
      }

      if (state.status === "playing") {
        if (forcePlayAttempt || !isYouTubePlaying(player.getPlayerState())) {
          player.playVideo();
        }
      } else if (state.status === "paused" || state.status === "ended") {
        player.pauseVideo();
      }

      window.setTimeout(() => {
        applyingRemoteState.current = false;
      }, 100);
    },
    [],
  );

  const publishPlaybackState = useCallback((status: PlaybackStatus) => {
    const player = playerRef.current;

    if (
      !isUsableYouTubePlayer(player) ||
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
        if (isUsableYouTubePlayer(event.target)) {
          scheduleMetadataRefresh(event.target);
        }
        publishPlaybackState("playing");
        return;
      }

      if (event.data === yt.PlayerState.PAUSED) {
        publishPlaybackState("paused");
        return;
      }

      if (event.data === yt.PlayerState.BUFFERING) {
        if (isUsableYouTubePlayer(event.target)) {
          scheduleMetadataRefresh(event.target);
        }
        publishPlaybackState("buffering");
        return;
      }

      if (event.data === yt.PlayerState.ENDED) {
        publishPlaybackState("ended");
        requestAutoplayAdvance();
      }
    },
    [publishPlaybackState, requestAutoplayAdvance, scheduleMetadataRefresh],
  );

  useEffect(() => {
    const initialVideoId = activeSourceUrlRef.current
      ? parseYouTubeVideoId(activeSourceUrlRef.current)
      : null;

    if (!initialVideoId || playerRef.current) {
      return;
    }

    let cancelled = false;

    loadYouTubeIframeApi()
      .then((yt) => {
        if (cancelled) {
          return;
        }

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
              const player = playerRef.current;

              if (!isUsableYouTubePlayer(player)) {
                return;
              }

              const startupVolume = Math.round(readStoredPlayerVolume() * 100);
              player.setVolume(startupVolume);
              player.unMute();
              applyCanonicalVideoToPlayer(player);
              scheduleMetadataRefresh(player);
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
          videoId: initialVideoId,
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
      destroyYouTubePlayer(playerRef.current);
      if (metadataRefreshTimerRef.current) {
        window.clearTimeout(metadataRefreshTimerRef.current);
        metadataRefreshTimerRef.current = null;
      }
      playerRef.current = null;
      playerSourceUrlRef.current = null;
      playerVideoIdRef.current = null;
    };
  }, [
    applyCanonicalVideoToPlayer,
    elementId,
    hasVideo,
    handlePlayerStateChange,
    publishPlaybackState,
    publishCurrentMetadata,
    scheduleMetadataRefresh,
  ]);

  useEffect(() => {
    const player = playerRef.current;

    if (!isUsableYouTubePlayer(player)) {
      return;
    }

    applyCanonicalVideoToPlayer(player);
  }, [applyCanonicalVideoToPlayer, canonicalState?.status, sourceUrl, videoId]);

  useEffect(() => {
    function handleVolume(event: Event) {
      const player = playerRef.current;

      if (!isUsableYouTubePlayer(player)) {
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
    function handleVisibilityChange() {
      if (document.hidden) {
        return;
      }

      const player = playerRef.current;

      if (!isUsableYouTubePlayer(player)) {
        return;
      }

      applyCanonicalVideoToPlayer(player);
      resyncPlayerToCanonicalState(player, { forcePlayAttempt: true });
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [applyCanonicalVideoToPlayer, resyncPlayerToCanonicalState]);

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      const player = playerRef.current;

      if (
        !isUsableYouTubePlayer(player) ||
        !canonicalState ||
        !source ||
        source.kind !== "youtube"
      ) {
        return;
      }

      const localState = player.getPlayerState();
      const localPositionSeconds = safeNumber(player.getCurrentTime()) ?? 0;
      const durationSeconds = safeNumber(player.getDuration());
      const expectedPositionSeconds = expectedYouTubePositionAt(
        canonicalState,
        Date.now(),
      );
      const activeKey = getActivePlaybackKey(canonicalState);

      if (
        !isNearYouTubeEnd({
          durationSeconds,
          expectedPositionSeconds,
        }) &&
        activeKey &&
        fallbackAdvancedKeyRef.current === activeKey
      ) {
        fallbackAdvancedKeyRef.current = null;
      }

      if (
        shouldFallbackAdvanceYouTubeQueue({
          activeKey,
          alreadyAdvancedKey: fallbackAdvancedKeyRef.current,
          canAdvance: canControlPlaybackRef.current,
          durationSeconds,
          expectedPositionSeconds,
          hasNextItem: hasNextQueueItemRef.current,
          isPlaying: canonicalState.status === "playing",
          queueAutoplayEnabled: queueAutoplayEnabledRef.current,
        })
      ) {
        requestAutoplayAdvance();
        return;
      }

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
          durationSeconds,
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
  }, [autoplayBlocked, canonicalState, requestAutoplayAdvance, source]);

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
          className="absolute inset-x-4 bottom-28 z-20 mx-auto max-w-sm rounded-sm border border-primary-fixed-dim/35 bg-surface/92 px-4 py-3 text-body-md font-semibold text-primary-fixed-dim backdrop-blur-xl"
          onClick={() => {
            const player = playerRef.current;

            if (isUsableYouTubePlayer(player)) {
              applyCanonicalVideoToPlayer(player);
              resyncPlayerToCanonicalState(player, { forcePlayAttempt: true });
            }
            setAutoplayBlocked(false);
          }}
          type="button"
        >
          Resume playback
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

function isYouTubePlaying(state: number) {
  return state === window.YT?.PlayerState.PLAYING;
}

function getActivePlaybackKey(state: CanonicalPlaybackState | null) {
  if (!state?.source?.url) {
    return null;
  }

  return state.activeQueueItemId ?? state.source.url;
}

function isUsableYouTubePlayer(
  player: Partial<YoutubePlayer> | null,
): player is YoutubePlayer {
  return Boolean(
    player &&
      typeof player.getCurrentTime === "function" &&
      typeof player.getDuration === "function" &&
      typeof player.getPlaybackRate === "function" &&
      typeof player.getPlayerState === "function" &&
      typeof player.getVideoData === "function" &&
      typeof player.cueVideoById === "function" &&
      typeof player.loadVideoById === "function" &&
      typeof player.mute === "function" &&
      typeof player.pauseVideo === "function" &&
      typeof player.playVideo === "function" &&
      typeof player.seekTo === "function" &&
      typeof player.setPlaybackRate === "function" &&
      typeof player.setVolume === "function" &&
      typeof player.unMute === "function",
  );
}

function destroyYouTubePlayer(player: Partial<YoutubePlayer> | null) {
  if (player && typeof player.destroy === "function") {
    player.destroy();
  }
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
