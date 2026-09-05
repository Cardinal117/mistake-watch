"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import { boundDirectPlaybackState } from "@/lib/player/direct-media-sync";
import type { LiveRoomState } from "@/lib/spacetime";
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
import {
  parseUploadedAssetReference,
  parseUploadedSessionReference,
} from "@/lib/media/uploaded-playback-reference";

type DirectMediaPlayerProps = {
  className?: string;
  liveRoom: LiveRoomState;
  mode: PlaybackMode;
};

const AUTOPLAY_ADVANCE_IN_FLIGHT_TIMEOUT_MS = 6_000;

export function DirectMediaPlayer({
  className,
  liveRoom,
  mode,
}: DirectMediaPlayerProps) {
  const canonicalState = useMemo(
    () => buildCanonicalPlaybackState(liveRoom, mode),
    [liveRoom, mode],
  );
  const source = canonicalState?.source;
  const playerKey = `${source?.kind ?? "empty"}:${source?.url ?? "none"}`;

  return (
    <DirectMediaPlayerCore
      key={playerKey}
      canonicalState={canonicalState}
      className={className}
      liveRoom={liveRoom}
      mode={mode}
    />
  );
}

type DirectMediaPlayerCoreProps = DirectMediaPlayerProps & {
  canonicalState: CanonicalPlaybackState | null;
};

function DirectMediaPlayerCore({
  canonicalState,
  className,
  liveRoom,
  mode,
}: DirectMediaPlayerCoreProps) {
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const applyingRemoteState = useRef(false);
  const handleEndedRef = useRef<() => void>(() => {});
  const advanceToNextQueueItemRef = useRef(liveRoom.advanceToNextQueueItem);
  const autoplayAdvanceInFlightKeyRef = useRef<string | null>(null);
  const autoplayAdvanceInFlightAtMsRef = useRef(0);
  const canControlPlaybackRef = useRef(liveRoom.canControlPlayback);
  const canonicalStateRef = useRef<CanonicalPlaybackState | null>(
    canonicalState,
  );
  const hasNextQueueItemRef = useRef(false);
  const queueAutoplayEnabledRef = useRef(
    liveRoom.snapshot.session?.queueAutoplayEnabled ?? true,
  );
  const setPlaybackStateRef = useRef(liveRoom.setPlaybackState);
  const updateMediaTitleRef = useRef(liveRoom.updateMediaTitle);
  const activeSourceUrlRef = useRef(liveRoom.snapshot.session?.sourceUrl);
  const mediaSourceUrlRef = useRef<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [fullscreenControlsActive, setFullscreenControlsActive] =
    useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const source = canonicalState?.source;
  const sourceKind = source?.kind ?? null;
  const sourceUrl = source?.url ?? null;
  const roomId = canonicalState?.roomId ?? null;

  useLayoutEffect(() => {
    handleEndedRef.current = handleEnded;
  });

  useLayoutEffect(() => {
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
    canonicalState,
    liveRoom.snapshot.queue,
    liveRoom.snapshot.session?.queueAutoplayEnabled,
    liveRoom.snapshot.session?.queueMode,
    liveRoom.setPlaybackState,
    liveRoom.snapshot.session?.sourceUrl,
    liveRoom.updateMediaTitle,
  ]);

  function requestAutoplayAdvance() {
    const activeKey = getActivePlaybackKey(canonicalStateRef.current);
    const inFlightKey = autoplayAdvanceInFlightKeyRef.current;
    const inFlightExpired =
      inFlightKey === activeKey &&
      Date.now() - autoplayAdvanceInFlightAtMsRef.current >
        AUTOPLAY_ADVANCE_IN_FLIGHT_TIMEOUT_MS;

    if (
      !activeKey ||
      (inFlightKey === activeKey && !inFlightExpired) ||
      !canControlPlaybackRef.current ||
      !queueAutoplayEnabledRef.current ||
      !hasNextQueueItemRef.current
    ) {
      return false;
    }

    autoplayAdvanceInFlightKeyRef.current = activeKey;
    autoplayAdvanceInFlightAtMsRef.current = Date.now();
    advanceToNextQueueItemRef.current({ autoplay: true });
    return true;
  }

  useEffect(() => {
    const media = mediaRef.current;

    if (!media) {
      return;
    }

    hlsRef.current?.destroy();
    hlsRef.current = null;
    mediaSourceUrlRef.current = null;
    media.removeAttribute("src");
    media.load();

    if (!sourceUrl || !sourceKind) {
      return;
    }

    let disposed = false;

    media.volume = readStoredPlayerVolume();
    media.muted = false;

    const resetStateTimer = window.setTimeout(() => {
      setAutoplayBlocked(false);
      setLocalError(null);
    }, 0);
    const cleanup = () => {
      window.clearTimeout(resetStateTimer);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      if (mediaSourceUrlRef.current === sourceUrl) {
        mediaSourceUrlRef.current = null;
      }
    };

    if (sourceKind === "hls") {
      if (media.canPlayType("application/vnd.apple.mpegurl")) {
        mediaSourceUrlRef.current = sourceUrl;
        media.src = sourceUrl;
        media.load();
        return cleanup;
      }

      void import("hls.js")
        .then(({ default: Hls }) => {
          if (disposed || !mediaRef.current || mediaRef.current !== media) {
            return;
          }

          if (!Hls.isSupported()) {
            setLocalError("This browser cannot play HLS streams.");
            return;
          }

          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
          });

          mediaSourceUrlRef.current = sourceUrl;
          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (
              data.fatal &&
              mediaSourceUrlRef.current &&
              mediaSourceUrlRef.current === activeSourceUrlRef.current
            ) {
              setLocalError("The HLS stream failed to load.");
              setPlaybackStateRef.current({
                playbackRate: 1,
                positionSeconds: media.currentTime,
                status: "error",
              });
            }
          });
          hls.loadSource(sourceUrl);
          hls.attachMedia(media);
          hlsRef.current = hls;
        })
        .catch(() => {
          if (!disposed) {
            setLocalError("The HLS player could not be loaded.");
          }
        });

      return () => {
        disposed = true;
        cleanup();
      };
    }

    const uploadedSessionId = parseUploadedSessionReference(sourceUrl);

    if (uploadedSessionId) {
      if (!roomId) {
        window.setTimeout(() => {
          if (!disposed) {
            setLocalError("Uploaded media room context is missing.");
          }
        }, 0);
        return cleanup;
      }

      void resolveUploadedPlaybackUrl({
        roomId,
        sessionId: uploadedSessionId,
      })
        .then((playbackUrl) => {
          if (disposed || !mediaRef.current || mediaRef.current !== media) {
            return;
          }

          mediaSourceUrlRef.current = sourceUrl;
          media.src = playbackUrl;
          media.load();
        })
        .catch(() => {
          if (!disposed) {
            setLocalError("Uploaded media access expired or is not allowed.");
            setPlaybackStateRef.current({
              playbackRate: 1,
              positionSeconds: media.currentTime,
              status: "error",
            });
          }
        });

      return () => {
        disposed = true;
        cleanup();
      };
    }

    if (parseUploadedAssetReference(sourceUrl)) {
      window.setTimeout(() => {
        if (!disposed) {
          setLocalError(
            "Uploaded media must be started through a room session.",
          );
        }
      }, 0);
      setPlaybackStateRef.current({
        playbackRate: 1,
        positionSeconds: media.currentTime,
        status: "error",
      });
      return cleanup;
    }

    mediaSourceUrlRef.current = sourceUrl;
    media.src = sourceUrl;
    media.load();

    return cleanup;
  }, [roomId, sourceKind, sourceUrl]);

  useEffect(() => {
    function handleVolume(event: Event) {
      const media = mediaRef.current;

      if (!media) {
        return;
      }

      const volume = (event as PlayerVolumeEvent).detail.volume;
      media.volume = volume;
      media.muted = volume <= 0;
    }

    window.addEventListener(PLAYER_VOLUME_EVENT, handleVolume);

    return () => window.removeEventListener(PLAYER_VOLUME_EVENT, handleVolume);
  }, []);

  useEffect(() => {
    function handleFullscreenChange() {
      const media = mediaRef.current;
      const fullscreenElement = document.fullscreenElement;

      setFullscreenControlsActive(
        mode === "watch" &&
          Boolean(
            media &&
            fullscreenElement &&
            (fullscreenElement === media || fullscreenElement.contains(media)),
          ),
      );
    }

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [mode]);

  useEffect(() => {
    const media = mediaRef.current;

    if (!media || !canonicalState || !source) {
      return;
    }

    const syncTimer = window.setInterval(() => {
      const correction = chooseSyncCorrection({
        clientNowMs: Date.now(),
        local: {
          autoplayBlocked,
          durationSeconds: Number.isFinite(media.duration)
            ? media.duration
            : undefined,
          paused: media.paused,
          playbackRate: media.playbackRate,
          positionSeconds: media.currentTime,
        },
        state: boundDirectPlaybackState(
          canonicalState,
          media.duration,
          Date.now(),
        ),
      });

      applyingRemoteState.current = true;

      switch (correction.kind) {
        case "hard-seek":
        case "seek":
          media.currentTime = correction.targetPositionSeconds;
          if (correction.shouldPlay) {
            void playMedia(media, setAutoplayBlocked);
          }
          break;
        case "pause-and-seek":
          media.pause();
          media.currentTime = correction.targetPositionSeconds;
          break;
        case "play":
          media.playbackRate = correction.playbackRate;
          void playMedia(media, setAutoplayBlocked);
          break;
        case "set-playback-rate":
          media.playbackRate = correction.playbackRate;
          break;
        case "user-interaction-required":
          setAutoplayBlocked(true);
          break;
        case "none":
        case "wait":
          break;
      }

      // Seeking to the end can consume the native ended event. Reconcile the
      // actual terminal element as well, using the same authority/queue guards.
      if (media.ended) {
        handleEndedRef.current();
      }

      window.setTimeout(() => {
        applyingRemoteState.current = false;
      }, 50);
    }, 750);

    return () => window.clearInterval(syncTimer);
  }, [autoplayBlocked, canonicalState, source]);

  function publishMediaState(status: PlaybackStatus) {
    const media = mediaRef.current;
    const activePlaybackKey = getActivePlaybackKey(canonicalStateRef.current);

    if (
      activePlaybackKey &&
      autoplayAdvanceInFlightKeyRef.current === activePlaybackKey
    ) {
      return;
    }

    if (
      !media ||
      !mediaSourceUrlRef.current ||
      activeSourceUrlRef.current !== mediaSourceUrlRef.current ||
      !canControlPlaybackRef.current ||
      (applyingRemoteState.current && status !== "ended")
    ) {
      return;
    }

    setPlaybackStateRef.current({
      playbackRate: 1,
      positionSeconds: media.currentTime,
      status,
    });
  }

  function publishMediaMetadata() {
    const media = mediaRef.current;

    if (
      !media ||
      !mediaSourceUrlRef.current ||
      activeSourceUrlRef.current !== mediaSourceUrlRef.current ||
      !canControlPlaybackRef.current
    ) {
      return;
    }

    const durationSeconds = safeDurationSeconds(media.duration);
    const title = source?.title?.trim() || sourceUrl?.split("/").at(-1);

    if (title || durationSeconds) {
      updateMediaTitleRef.current(title || "Media", durationSeconds);
    }
  }

  function handleEnded() {
    // A queued native event may arrive after the host has already rewound.
    // A real end is not an echo of play/pause and must survive sync correction.
    if (
      !mediaRef.current?.ended ||
      canonicalStateRef.current?.status !== "playing"
    ) {
      return;
    }

    if (requestAutoplayAdvance()) {
      return;
    }

    publishMediaState("ended");
  }

  const Element = mode === "listen" ? "audio" : "video";

  return (
    <>
      <Element
        aria-label={
          mode === "listen" ? "Synced audio player" : "Synced video player"
        }
        className={className}
        controls={fullscreenControlsActive}
        onCanPlay={() => {
          if (canonicalState?.status === "buffering" && mediaRef.current) {
            void playMedia(mediaRef.current, setAutoplayBlocked);
          }
        }}
        onEnded={handleEnded}
        onError={() => {
          setLocalError("The browser could not load this media source.");
          publishMediaState("error");
        }}
        onLoadedMetadata={publishMediaMetadata}
        playsInline
        ref={(element) => {
          mediaRef.current = element;
        }}
      />
      {autoplayBlocked ? (
        <button
          className="absolute inset-x-4 bottom-28 z-20 mx-auto max-w-sm rounded-md border border-primary-fixed-dim/35 bg-surface/90 px-4 py-3 text-body-md font-semibold text-primary-fixed-dim backdrop-blur-xl"
          onClick={() => {
            const media = mediaRef.current;

            if (media) {
              void playMedia(media, setAutoplayBlocked);
            }
          }}
          type="button"
        >
          Click to start synced playback
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

function getActivePlaybackKey(state: CanonicalPlaybackState | null) {
  if (!state?.source?.url) {
    return null;
  }

  return `${state.activeQueueItemId ?? "source"}:${state.source.url}`;
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

async function playMedia(
  media: HTMLMediaElement,
  setAutoplayBlocked: (blocked: boolean) => void,
) {
  try {
    await media.play();
    setAutoplayBlocked(false);
  } catch (error) {
    // pause(), seeking and load() can interrupt a pending play promise. The
    // next sync tick may retry; this is not a browser permission denial.
    if (
      error &&
      typeof error === "object" &&
      "name" in error &&
      error.name === "AbortError"
    ) {
      return;
    }
    setAutoplayBlocked(true);
  }
}

async function resolveUploadedPlaybackUrl(input: {
  roomId: string;
  sessionId: string;
}) {
  const response = await fetch(
    `/api/media/room-sessions/${encodeURIComponent(
      input.sessionId,
    )}/playback?roomId=${encodeURIComponent(input.roomId)}`,
    { method: "GET" },
  );
  const payload = (await response.json()) as {
    error?: string;
    playbackUrl?: string;
  };

  if (!response.ok || !payload.playbackUrl) {
    throw new Error(payload.error ?? "Uploaded media playback URL failed.");
  }

  return payload.playbackUrl;
}

function safeDurationSeconds(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}
