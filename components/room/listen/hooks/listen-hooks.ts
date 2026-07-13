"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { readStoredPlayerVolume } from "@/lib/player/local-controls";
import {
  getSourceDisplayTitle,
  getYouTubeThumbnailUrl,
  parseYouTubeVideoId,
} from "@/lib/player/source";
import { type CanonicalPlaybackState } from "@/lib/player";
import { type SmartShuffleItem } from "@/lib/queue/model";
import {
  getQueueMetadataPriority,
  INITIAL_QUEUE_METADATA_COUNT,
} from "@/lib/queue/metadata-priority";
import { isMetadataScheduleAbort } from "@/lib/queue/metadata-scheduler";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import type { LiveQueueItem, LiveRoomState } from "@/lib/spacetime";
import { scheduleQueueYouTubeMetadata } from "@/lib/youtube/queue-metadata-scheduler";
import {
  type ListenTvSettings,
  MIN_LISTEN_DRAWER_HEIGHT,
  MAX_LISTEN_DRAWER_HEIGHT,
  DEFAULT_LISTEN_TV_SETTINGS,
  DEFAULT_LISTEN_DRAWER_HEIGHT,
} from "@/components/room/listen/shared";
import { clampNumber, formatSeconds } from "@/components/room/listen/helpers";

export function useListenQueueItems(
  liveRoom: LiveRoomState,
  room: RoomSnapshot,
) {
  const participantsById = useMemo(
    () =>
      new Map(
        liveRoom.participants.map((participant) => [
          participant.id,
          participant,
        ]),
      ),
    [liveRoom.participants],
  );

  return useMemo(() => {
    if (liveRoom.connectionStatus !== "connected") {
      return room.queue;
    }

    return liveRoom.snapshot.queue.map((item) => ({
      addedBy:
        participantsById.get(item.addedByMemberId)?.name ??
        (item.addedByMemberId ? "Guest" : "Room"),
      artist: item.artist ?? undefined,
      channelName: item.channelName ?? undefined,
      duration:
        typeof item.durationSeconds === "number"
          ? formatSeconds(item.durationSeconds)
          : "-",
      durationSeconds:
        typeof item.durationSeconds === "number"
          ? item.durationSeconds
          : undefined,
      failureCode: item.failureCode ?? undefined,
      failureCount: item.failureCount || undefined,
      failureCreatedMs: item.failureCreatedMs ?? undefined,
      failureReason: item.failureReason ?? undefined,
      id: item.queueItemId,
      isPinned: item.isPinned,
      isPlayNext: item.isPlayNext,
      isUnavailable: item.isUnavailable,
      playedSequence: item.playedSequence,
      playlistId: item.playlistId ?? undefined,
      playlistTitle: item.playlistTitle ?? undefined,
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      status:
        item.status === "playing"
          ? ("now" as const)
          : item.status === "played"
            ? ("played" as const)
            : ("queued" as const),
      thumbnailUrl:
        item.thumbnailUrl ??
        (item.sourceType === "youtube"
          ? (getYouTubeThumbnailUrl(item.sourceUrl) ?? undefined)
          : undefined),
      title: getSourceDisplayTitle({
        sourceType: item.sourceType,
        sourceUrl: item.sourceUrl,
        title: item.title,
      }),
      videoId:
        item.sourceType === "youtube"
          ? (parseYouTubeVideoId(item.sourceUrl) ?? undefined)
          : undefined,
    }));
  }, [
    liveRoom.connectionStatus,
    liveRoom.snapshot.queue,
    participantsById,
    room.queue,
  ]);
}
export function useDesktopListenShell() {
  const [desktopShell, setDesktopShell] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(min-width: 900px) and (pointer: fine)",
    );

    function updateDesktopShell() {
      setDesktopShell(mediaQuery.matches);
    }

    updateDesktopShell();
    mediaQuery.addEventListener("change", updateDesktopShell);

    return () => {
      mediaQuery.removeEventListener("change", updateDesktopShell);
    };
  }, []);

  return desktopShell;
}
export function useDenseListenQueueRows() {
  const [denseQueueRows, setDenseQueueRows] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1280px)");

    function updateDenseQueueRows() {
      setDenseQueueRows(mediaQuery.matches);
    }

    updateDenseQueueRows();
    mediaQuery.addEventListener("change", updateDenseQueueRows);

    return () => {
      mediaQuery.removeEventListener("change", updateDenseQueueRows);
    };
  }, []);

  return denseQueueRows;
}
export function useRemainingQueueSeconds(
  liveRoom: LiveRoomState,
  roomId: string,
  drawerOpen: boolean,
) {
  const generationRef = useRef(0);
  const [metadataState, setMetadataState] = useState<{
    durations: Record<string, number | null>;
    roomId: string;
  }>(() => ({ durations: {}, roomId }));
  const metadataDurations = useMemo(
    () => (metadataState.roomId === roomId ? metadataState.durations : {}),
    [metadataState, roomId],
  );
  const missingDurationItems = useMemo(() => {
    const missingItems: Array<{
      item: LiveQueueItem;
      queuedIndex: number;
    }> = [];
    let queuedIndex = 0;

    for (const item of liveRoom.snapshot.queue) {
      if (item.status !== "queued") {
        continue;
      }

      const itemQueuedIndex = queuedIndex;

      queuedIndex += 1;

      if (
        item.sourceType === "youtube" &&
        typeof item.durationSeconds !== "number" &&
        Boolean(item.sourceUrl) &&
        metadataDurations[item.queueItemId] === undefined
      ) {
        missingItems.push({ item, queuedIndex: itemQueuedIndex });
      }
    }

    return missingItems;
  }, [liveRoom.snapshot.queue, metadataDurations]);
  const missingDurationKey = useMemo(
    () =>
      missingDurationItems
        .map(
          ({ item, queuedIndex }) =>
            `${item.queueItemId}:${item.sourceUrl}:${queuedIndex}`,
        )
        .join("|"),
    [missingDurationItems],
  );

  useEffect(() => {
    if (
      liveRoom.connectionStatus !== "connected" ||
      missingDurationItems.length === 0
    ) {
      return;
    }

    const controller = new AbortController();
    const generation = generationRef.current + 1;
    const itemsToResolve = drawerOpen
      ? missingDurationItems
      : missingDurationItems.filter(
          ({ queuedIndex }) => queuedIndex < INITIAL_QUEUE_METADATA_COUNT,
        );

    generationRef.current = generation;

    async function resolveDurations() {
      for (
        let batchStart = 0;
        batchStart < itemsToResolve.length;
        batchStart += INITIAL_QUEUE_METADATA_COUNT
      ) {
        if (controller.signal.aborted) {
          return;
        }

        const batch = itemsToResolve.slice(
          batchStart,
          batchStart + INITIAL_QUEUE_METADATA_COUNT,
        );
        const results = await Promise.allSettled(
          batch.map(({ item, queuedIndex }) =>
            scheduleQueueYouTubeMetadata(item.sourceUrl, {
              priority: getQueueMetadataPriority({
                itemIndex: queuedIndex,
                queuedIndex,
              }),
              signal: controller.signal,
            }),
          ),
        );

        if (controller.signal.aborted || generationRef.current !== generation) {
          return;
        }

        setMetadataState((current) => {
          const durations =
            current.roomId === roomId ? { ...current.durations } : {};

          results.forEach((result, index) => {
            if (
              result.status === "rejected" &&
              isMetadataScheduleAbort(result.reason)
            ) {
              return;
            }

            const queueItemId = batch[index]?.item.queueItemId;

            if (!queueItemId) {
              return;
            }

            const durationSeconds =
              result.status === "fulfilled"
                ? result.value.metadata?.durationSeconds
                : null;

            durations[queueItemId] =
              typeof durationSeconds === "number" && durationSeconds > 0
                ? durationSeconds
                : null;
          });

          return { durations, roomId };
        });
      }
    }

    void resolveDurations();

    return () => {
      controller.abort();
    };
  }, [
    drawerOpen,
    liveRoom.connectionStatus,
    missingDurationItems,
    missingDurationKey,
    roomId,
  ]);

  const seconds = useMemo(
    () => getRemainingQueueSeconds(liveRoom.snapshot.queue, metadataDurations),
    [liveRoom.snapshot.queue, metadataDurations],
  );

  return {
    loading: missingDurationItems.length > 0,
    seconds,
  };
}
export function toSmartShuffleItem(item: RoomQueueItem, index = 0) {
  return {
    artist: item.artist,
    channelName: item.channelName,
    isPinned: item.isPinned,
    isPlayNext: item.isPlayNext,
    playlistId: item.playlistId,
    playlistTitle: item.playlistTitle,
    position: item.status === "queued" ? index : 0,
    queueItemId: item.id,
    sourceUrl: item.sourceUrl,
    status:
      item.status === "now"
        ? ("playing" as const)
        : item.status === "played"
          ? ("played" as const)
          : ("queued" as const),
    title: item.title,
    videoId: item.videoId,
  } satisfies SmartShuffleItem;
}
export function buildCanonicalState(
  liveRoom: LiveRoomState,
): CanonicalPlaybackState | null {
  const session = liveRoom.snapshot.session;

  if (!session?.sourceUrl || !session.sourceType) {
    return null;
  }

  return {
    activeQueueItemId: session.activeQueueItemId,
    controllerMemberId: null,
    hostMemberId: session.hostMemberId,
    mode: "listen",
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
export function getRemainingQueueSeconds(
  queueItems: LiveQueueItem[],
  metadataDurations: Record<string, number | null>,
) {
  const remainingSeconds = queueItems.reduce((total, item) => {
    if (item.status !== "queued") {
      return total;
    }

    const durationSeconds =
      typeof item.durationSeconds === "number"
        ? item.durationSeconds
        : metadataDurations[item.queueItemId];

    if (typeof durationSeconds !== "number" || durationSeconds <= 0) {
      return total;
    }

    return total + durationSeconds;
  }, 0);

  return remainingSeconds > 0 ? remainingSeconds : null;
}
export function usePersistentListenTvSettings() {
  const [settings, setSettings] = useState<ListenTvSettings>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_LISTEN_TV_SETTINGS;
    }

    try {
      const stored = window.localStorage.getItem("mw_listen_tv_settings");

      if (!stored) {
        return DEFAULT_LISTEN_TV_SETTINGS;
      }

      const parsed = JSON.parse(stored) as Partial<ListenTvSettings>;

      return {
        dimness: clampNumber(
          typeof parsed.dimness === "number"
            ? parsed.dimness
            : DEFAULT_LISTEN_TV_SETTINGS.dimness,
          0,
          80,
        ),
        hideUiOnIdle:
          typeof parsed.hideUiOnIdle === "boolean"
            ? parsed.hideUiOnIdle
            : DEFAULT_LISTEN_TV_SETTINGS.hideUiOnIdle,
        uiBrightness: clampNumber(
          typeof parsed.uiBrightness === "number"
            ? parsed.uiBrightness
            : DEFAULT_LISTEN_TV_SETTINGS.uiBrightness,
          45,
          120,
        ),
      };
    } catch {
      return DEFAULT_LISTEN_TV_SETTINGS;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(
      "mw_listen_tv_settings",
      JSON.stringify(settings),
    );
  }, [settings]);

  return [settings, setSettings] as const;
}
export function readStoredVolume() {
  return Math.round(readStoredPlayerVolume() * 100);
}
export function readStoredDrawerHeight() {
  if (typeof window === "undefined") {
    return DEFAULT_LISTEN_DRAWER_HEIGHT;
  }

  const stored = window.localStorage.getItem("mw_listen_queue_drawer_height");

  if (stored === null) {
    return DEFAULT_LISTEN_DRAWER_HEIGHT;
  }

  const numericHeight = Number(stored);

  return Number.isFinite(numericHeight)
    ? clampNumber(
        Math.round(numericHeight),
        MIN_LISTEN_DRAWER_HEIGHT,
        MAX_LISTEN_DRAWER_HEIGHT,
      )
    : DEFAULT_LISTEN_DRAWER_HEIGHT;
}
