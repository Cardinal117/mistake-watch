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
  useYouTubePlayerStartupRecovery,
  YouTubePlayerAlerts,
} from "@/components/room/youtube-player-startup-recovery";
import {
  chooseSyncCorrection,
  type CanonicalPlaybackState,
  type PlaybackStatus,
} from "@/lib/player";
import {
  PLAYER_VOLUME_EVENT,
  readStoredPlayerVolume,
  type PlayerVolumeEvent,
} from "@/lib/player/local-controls";
import { reserveRuntimeErrorAutoSkip as reserveRuntimeErrorAutoSkipSlot } from "@/lib/player/media-failure-circuit";
import { parseYouTubeVideoId } from "@/lib/player/source";
import {
  isNearYouTubeEnd,
  shouldFallbackAdvanceYouTubeQueue,
} from "@/lib/player/youtube-autoplay-continuity";
import type { YoutubeMediaPlayerProps } from "./youtube-player-contracts";
import {
  loadYouTubeIframeApi,
  type YoutubeNamespace,
  type YoutubePlayer,
  type YoutubePlayerEvent,
} from "@/lib/youtube/iframe-api";
import {
  destroyYouTubePlayer,
  isUsableYouTubePlayer,
  safeNumber,
  safeDurationSeconds,
} from "@/lib/youtube/player-instance";
import { classifyYouTubeIframeError } from "@/lib/youtube/availability";
import {
  releaseYouTubePlayerLifecycleSafely,
  youtubePlayerLifecycle,
  type YouTubePlayerLifecycleLease,
  YouTubePlayerStartupGuard,
} from "@/lib/youtube/player-lifecycle";
import {
  buildYouTubeCanonicalPlaybackState,
  expectedYouTubePositionAt,
} from "@/lib/youtube/canonical-state";
import {
  isYouTubePlaying,
  shouldAutoSkipYouTubeRuntimeError,
  getActivePlaybackKey,
  isAbortError,
} from "@/lib/youtube/player-state-helpers";
import { YouTubeCorrectionGate } from "@/lib/youtube/correction-gate";

const AUTOPLAY_ADVANCE_IN_FLIGHT_TIMEOUT_MS = 6_000;

export function YoutubeMediaPlayer({
  className,
  liveRoom,
  mode,
  showNativeControls = true,
}: YoutubeMediaPlayerProps) {
  const elementId = useId().replaceAll(":", "");
  const playerRef = useRef<YoutubePlayer | null>(null);
  const preparation = useRef(liveRoom.youtubeAutoplayPreparation);
  const preparedSession = useRef(liveRoom.snapshot.session);
  const correctionGate = useRef(new YouTubeCorrectionGate());
  const applyingRemoteState = useRef(false);
  const advanceToNextQueueItemRef = useRef(liveRoom.advanceToNextQueueItem);
  const autoplayAdvanceInFlightKeyRef = useRef<string | null>(null);
  const autoplayAdvanceInFlightAtMsRef = useRef(0);
  const canControlPlaybackRef = useRef(liveRoom.canControlPlayback);
  const canonicalStateRef = useRef<CanonicalPlaybackState | null>(null);
  const fallbackAdvancedKeyRef = useRef<string | null>(null);
  const hasNextQueueItemRef = useRef(false);
  const hydratedAtMsRef = useRef(0);
  const hydratedPlaybackKeyRef = useRef<string | null>(null);
  const metadataRefreshTimerRef = useRef<number | null>(null);
  const runtimeErrorAutoSkipTimestampsRef = useRef<number[]>([]);
  const reportMediaFailureRef = useRef(liveRoom.reportMediaFailure);
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
  const clearPlayerError = useCallback(() => {
    setAutoplayBlocked(false);
    setLocalError(null);
  }, []);
  const getStartupRecoveryKey = useCallback(
    () =>
      getActivePlaybackKey(canonicalStateRef.current) ??
      activeSourceUrlRef.current ??
      null,
    [],
  );
  const {
    armStartupGuard,
    markStartupReady,
    playerGeneration,
    reloadYouTubePlayer,
    startupFailed,
  } = useYouTubePlayerStartupRecovery({
    clearPlayerError,
    getRecoveryKey: getStartupRecoveryKey,
  });
  const canonicalState = useMemo(
    () => buildYouTubeCanonicalPlaybackState(liveRoom, mode),
    [liveRoom, mode],
  );
  const source = canonicalState?.source;
  const sourceUrl = source?.url ?? null;
  const videoId = sourceUrl ? parseYouTubeVideoId(sourceUrl) : null;
  const hasVideo = Boolean(videoId);

  useLayoutEffect(() => {
    preparation.current = liveRoom.youtubeAutoplayPreparation;
    preparedSession.current = liveRoom.snapshot.session;
    advanceToNextQueueItemRef.current = liveRoom.advanceToNextQueueItem;
    canControlPlaybackRef.current = liveRoom.canControlPlayback;
    canonicalStateRef.current = canonicalState;
    hasNextQueueItemRef.current = liveRoom.snapshot.queue.some(
      (item) =>
        item.status === "queued" ||
        (liveRoom.snapshot.session?.queueMode === "loop" &&
          item.status === "played"),
    );
    queueAutoplayEnabledRef.current =
      liveRoom.snapshot.session?.queueAutoplayEnabled ?? true;
    reportMediaFailureRef.current = liveRoom.reportMediaFailure;
    setPlaybackStateRef.current = liveRoom.setPlaybackState;
    updateMediaTitleRef.current = liveRoom.updateMediaTitle;
    activeSourceUrlRef.current = liveRoom.snapshot.session?.sourceUrl;

    const activePlaybackKey = getActivePlaybackKey(canonicalState);

    if (
      autoplayAdvanceInFlightKeyRef.current &&
      autoplayAdvanceInFlightKeyRef.current !== activePlaybackKey
    ) {
      autoplayAdvanceInFlightKeyRef.current = null;
      autoplayAdvanceInFlightAtMsRef.current = 0;
    }
  }, [
    liveRoom.advanceToNextQueueItem,
    liveRoom.canControlPlayback,
    liveRoom.reportMediaFailure,
    liveRoom.setPlaybackState,
    canonicalState,
    liveRoom.snapshot.queue,
    liveRoom.snapshot.session,
    liveRoom.youtubeAutoplayPreparation,
    liveRoom.snapshot.session?.queueMode,
    liveRoom.snapshot.session?.sourceUrl,
    liveRoom.snapshot.session?.queueAutoplayEnabled,
    liveRoom.updateMediaTitle,
  ]);

  const requestAutoplayAdvance = useCallback(() => {
    const activeKey = getActivePlaybackKey(canonicalStateRef.current);
    const inFlightKey = autoplayAdvanceInFlightKeyRef.current;
    const inFlightExpired =
      inFlightKey === activeKey &&
      Date.now() - autoplayAdvanceInFlightAtMsRef.current >
        AUTOPLAY_ADVANCE_IN_FLIGHT_TIMEOUT_MS;

    if (
      !activeKey ||
      (fallbackAdvancedKeyRef.current === activeKey && !inFlightExpired)
    ) {
      return;
    }

    if (inFlightKey === activeKey && !inFlightExpired) {
      return;
    }

    fallbackAdvancedKeyRef.current = activeKey;
    autoplayAdvanceInFlightKeyRef.current = activeKey;
    autoplayAdvanceInFlightAtMsRef.current = Date.now();
    advanceToNextQueueItemRef.current({ autoplay: true });
  }, []);

  const reserveRuntimeErrorAutoSkip = useCallback(() => {
    const reservation = reserveRuntimeErrorAutoSkipSlot(
      runtimeErrorAutoSkipTimestampsRef.current,
    );

    runtimeErrorAutoSkipTimestampsRef.current = reservation.timestamps;
    return reservation.allowed;
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

  const markHydratedIfCanonicalAligned = useCallback(
    (player: YoutubePlayer, toleranceSeconds = 2) => {
      const state = canonicalStateRef.current;
      const activeKey = getActivePlaybackKey(state);

      if (!state?.source || state.source.kind !== "youtube" || !activeKey) {
        hydratedAtMsRef.current = 0;
        hydratedPlaybackKeyRef.current = null;
        return false;
      }

      const expectedPositionSeconds = expectedYouTubePositionAt(
        state,
        Date.now(),
      );
      const localPositionSeconds = safeNumber(player.getCurrentTime()) ?? 0;
      const driftSeconds = Math.abs(
        localPositionSeconds - expectedPositionSeconds,
      );

      if (driftSeconds > toleranceSeconds) {
        hydratedAtMsRef.current = 0;
        hydratedPlaybackKeyRef.current = null;
        return false;
      }

      hydratedAtMsRef.current = Date.now();
      hydratedPlaybackKeyRef.current = activeKey;
      return true;
    },
    [],
  );

  const applyCanonicalVideoToPlayer = useCallback(
    (player: YoutubePlayer) => {
      const state = canonicalStateRef.current;
      const currentSourceUrl = state?.source?.url ?? null;
      const currentVideoId = currentSourceUrl
        ? parseYouTubeVideoId(currentSourceUrl)
        : null;

      if (
        !state?.source ||
        state.source.kind !== "youtube" ||
        !currentVideoId
      ) {
        return;
      }

      if (
        preparedSession.current &&
        preparation.current?.apply(
          player,
          preparedSession.current,
          Date.now(),
          currentVideoId,
        )
      ) {
        playerSourceUrlRef.current = currentSourceUrl;
        playerVideoIdRef.current = currentVideoId;
        return;
      }
      const alreadyLoaded =
        playerSourceUrlRef.current === currentSourceUrl &&
        playerVideoIdRef.current === currentVideoId;

      if (alreadyLoaded) {
        correctionGate.current.applied(state, Date.now());
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
          player.playVideo();
        } else if (state.status === "paused" || state.status === "ended") {
          player.pauseVideo();
        }

        window.setTimeout(() => {
          applyingRemoteState.current = false;
          markHydratedIfCanonicalAligned(player);
          scheduleMetadataRefresh(player);
        }, 180);
        return;
      }

      const startSeconds = expectedYouTubePositionAt(state, Date.now());
      correctionGate.current.applied(state, Date.now());

      applyingRemoteState.current = true;
      setAutoplayBlocked(false);
      setLocalError(null);
      hydratedAtMsRef.current = 0;
      hydratedPlaybackKeyRef.current = null;
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
        markHydratedIfCanonicalAligned(player);
        scheduleMetadataRefresh(player);
      }, 900);
    },
    [markHydratedIfCanonicalAligned, scheduleMetadataRefresh],
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
        markHydratedIfCanonicalAligned(player);
      }, 100);
    },
    [markHydratedIfCanonicalAligned],
  );

  const publishPlaybackState = useCallback(
    (status: PlaybackStatus) => {
      const player = playerRef.current;
      const canonicalState = canonicalStateRef.current;
      const activePlaybackKey = getActivePlaybackKey(canonicalState);

      if (
        activePlaybackKey &&
        autoplayAdvanceInFlightKeyRef.current === activePlaybackKey
      ) {
        return;
      }

      if (
        !isUsableYouTubePlayer(player) ||
        !playerSourceUrlRef.current ||
        activeSourceUrlRef.current !== playerSourceUrlRef.current ||
        !canControlPlaybackRef.current ||
        applyingRemoteState.current ||
        !canonicalState ||
        !activePlaybackKey ||
        hydratedPlaybackKeyRef.current !== activePlaybackKey
      ) {
        if (
          isUsableYouTubePlayer(player) &&
          canonicalState?.source?.kind === "youtube" &&
          activePlaybackKey &&
          hydratedPlaybackKeyRef.current !== activePlaybackKey
        ) {
          applyCanonicalVideoToPlayer(player);
          resyncPlayerToCanonicalState(player, {
            forcePlayAttempt: status === "playing",
          });
        }
        return;
      }

      const localPositionSeconds = safeNumber(player.getCurrentTime()) ?? 0;
      const expectedPositionSeconds = expectedYouTubePositionAt(
        canonicalState,
        Date.now(),
      );
      const hydrationAgeMs = Date.now() - hydratedAtMsRef.current;

      if (
        expectedPositionSeconds > 2 &&
        Math.abs(localPositionSeconds - expectedPositionSeconds) > 2 &&
        (localPositionSeconds < 1 || hydrationAgeMs < 2500)
      ) {
        resyncPlayerToCanonicalState(player, {
          forcePlayAttempt: status === "playing",
        });
        return;
      }

      setPlaybackStateRef.current({
        playbackRate: 1,
        positionSeconds: localPositionSeconds,
        status,
      });
    },
    [applyCanonicalVideoToPlayer, resyncPlayerToCanonicalState],
  );

  const handlePlayerStateChange = useCallback(
    (yt: YoutubeNamespace, event: YoutubePlayerEvent) => {
      if (event.data === yt.PlayerState.PLAYING)
        preparation.current?.ready(event.target);
      if (applyingRemoteState.current) {
        return;
      }

      if (event.data === yt.PlayerState.PLAYING) {
        setAutoplayBlocked(false);
        if (isUsableYouTubePlayer(event.target)) {
          scheduleMetadataRefresh(event.target);
        }
        return;
      }

      if (event.data === yt.PlayerState.PAUSED) {
        return;
      }

      if (event.data === yt.PlayerState.BUFFERING) {
        if (isUsableYouTubePlayer(event.target)) {
          scheduleMetadataRefresh(event.target);
        }
        return;
      }

      if (event.data === yt.PlayerState.ENDED) {
        if (
          queueAutoplayEnabledRef.current &&
          hasNextQueueItemRef.current &&
          canControlPlaybackRef.current
        ) {
          requestAutoplayAdvance();
          return;
        }

        publishPlaybackState("ended");
      }
    },
    [publishPlaybackState, requestAutoplayAdvance, scheduleMetadataRefresh],
  );

  useEffect(() => {
    const initialSourceUrl = activeSourceUrlRef.current ?? null;
    const initialVideoId = parseYouTubeVideoId(initialSourceUrl ?? "");

    if (!initialVideoId || playerRef.current) {
      return;
    }

    let cancelled = false;
    let lifecycleLease: YouTubePlayerLifecycleLease | null = null;
    let startupGuard: YouTubePlayerStartupGuard | null = null;
    const lifecycleController = new AbortController();
    const recoveryKey =
      getActivePlaybackKey(canonicalStateRef.current) ?? initialSourceUrl;

    youtubePlayerLifecycle
      .acquire({ signal: lifecycleController.signal })
      .then(async (lease) => {
        lifecycleLease = lease;
        const yt = await loadYouTubeIframeApi();

        if (cancelled) {
          return;
        }

        playerSourceUrlRef.current = initialSourceUrl;
        playerVideoIdRef.current = initialVideoId;
        startupGuard = armStartupGuard(recoveryKey);
        playerRef.current = new yt.Player(elementId, {
          events: {
            onAutoplayBlocked: () => {
              preparation.current?.cancel();
              setAutoplayBlocked(true);
            },
            onError: (event: YoutubePlayerEvent) => {
              startupGuard?.markReady();
              markStartupReady();
              const availability = classifyYouTubeIframeError(event.data);
              const canAutoSkip =
                shouldAutoSkipYouTubeRuntimeError(availability) &&
                queueAutoplayEnabledRef.current &&
                hasNextQueueItemRef.current &&
                canControlPlaybackRef.current &&
                reserveRuntimeErrorAutoSkip();

              setLocalError(availability.reason);

              if (canAutoSkip) {
                const activeKey = getActivePlaybackKey(
                  canonicalStateRef.current,
                );

                window.setTimeout(() => {
                  if (
                    activeKey &&
                    activeKey ===
                      getActivePlaybackKey(canonicalStateRef.current)
                  ) {
                    reportMediaFailureRef.current({
                      allowAutoplayAdvance: true,
                      failureCode: availability.status,
                    });
                  }
                }, 900);
              } else {
                reportMediaFailureRef.current({
                  allowAutoplayAdvance: false,
                  failureCode: availability.status,
                });
              }
            },
            onReady: () => {
              startupGuard?.markReady();
              markStartupReady();
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
            controls: showNativeControls ? 1 : 0,
            enablejsapi: 1,
            origin: window.location.origin,
            playsinline: 1,
            rel: 0,
          },
          videoId: initialVideoId,
          width: "100%",
        });
      })
      .catch((error: unknown) => {
        startupGuard?.dispose();
        lifecycleLease?.release();
        lifecycleLease = null;

        if (!cancelled && !isAbortError(error)) {
          setLocalError("The YouTube player API could not be loaded.");
        }
      });

    return () => {
      cancelled = true;
      lifecycleController.abort();
      startupGuard?.dispose();
      releaseYouTubePlayerLifecycleSafely({
        destroy: () => destroyYouTubePlayer(playerRef.current),
        release: () => {
          lifecycleLease?.release();
          lifecycleLease = null;
        },
      });
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
    armStartupGuard,
    elementId,
    hasVideo,
    handlePlayerStateChange,
    markStartupReady,
    playerGeneration,
    publishPlaybackState,
    publishCurrentMetadata,
    requestAutoplayAdvance,
    reserveRuntimeErrorAutoSkip,
    scheduleMetadataRefresh,
    showNativeControls,
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

      const activeKey = getActivePlaybackKey(canonicalStateRef.current);

      if (activeKey && autoplayAdvanceInFlightKeyRef.current === activeKey) {
        return;
      }

      applyCanonicalVideoToPlayer(player);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [applyCanonicalVideoToPlayer]);

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      const player = playerRef.current;
      // Room/presence updates must not restart the correction deadline. Read
      // the latest committed playback state on the existing timer instead.
      const canonicalState = canonicalStateRef.current;
      const source = canonicalState?.source;

      if (
        !isUsableYouTubePlayer(player) ||
        !canonicalState ||
        !source ||
        source.kind !== "youtube"
      ) {
        return;
      }

      if (
        preparedSession.current &&
        preparation.current?.apply(player, preparedSession.current)
      )
        return;
      const localState = player.getPlayerState();
      const localPositionSeconds = safeNumber(player.getCurrentTime()) ?? 0;
      const durationSeconds = safeNumber(player.getDuration());
      const expectedPositionSeconds = expectedYouTubePositionAt(
        canonicalState,
        Date.now(),
      );
      const activeKey = getActivePlaybackKey(canonicalState);

      if (activeKey && autoplayAdvanceInFlightKeyRef.current === activeKey) {
        return;
      }

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

      if (
        !correctionGate.current.allow({
          state: canonicalState,
          correction,
          buffering: localState === window.YT?.PlayerState.BUFFERING,
          now: Date.now(),
        })
      )
        return;

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
  }, [autoplayBlocked, requestAutoplayAdvance]);

  const resumeBlockedPlayback = useCallback(() => {
    const player = playerRef.current;

    if (isUsableYouTubePlayer(player)) {
      applyCanonicalVideoToPlayer(player);
    }
    setAutoplayBlocked(false);
  }, [applyCanonicalVideoToPlayer]);

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
      <YouTubePlayerAlerts
        autoplayBlocked={autoplayBlocked}
        localError={localError}
        onReload={reloadYouTubePlayer}
        onResume={resumeBlockedPlayback}
        startupFailed={startupFailed}
      />
    </>
  );
}
