"use client";

import { artistLabel } from "@/lib/ui/artist-label";
import {
  OptimisticQueueContext,
  useOptimisticAdds,
} from "../queue/use-optimistic-adds";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { dispatchPlayerVolume } from "@/lib/player/local-controls";
import {
  getYouTubeThumbnailUrl,
  parseYouTubeVideoId,
} from "@/lib/player/source";
import { expectedPositionAt } from "@/lib/player";
import { shuffleUpcomingQueue, smartShuffleQueue } from "@/lib/queue/model";
import { deriveQueueState } from "@/lib/queue/derived";
import { useMediaPreferences } from "@/lib/recommendations/use-media-preferences";
import { activeMediaPreferenceItem } from "@/lib/recommendations/room-client";
import { useNextItemPreparation } from "@/components/room/use-next-item-preparation";
import {
  type ListenModeLayoutProps,
  DEFAULT_LISTEN_VOLUME,
} from "@/components/room/listen/shared";
import { ListenNowPlayingPanel } from "@/components/room/listen/now-playing/now-playing-panel";
import { ListenTechnicalRoomHeader } from "@/components/room/listen/header/technical-room-header";
import { ListenMobileLayout } from "./mobile/listen-mobile-layout";
import { ListenQueueDrawer } from "@/components/room/listen/queue/queue-drawer";
import { ListenContentStage } from "@/components/room/listen/stage/listen-content-stage";
import {
  ListenAmbientBackdrop,
  useArtworkTheme,
  getListenTheme,
} from "@/components/room/listen/theme/listen-theme";
import { useListenAmbientPreference } from "@/components/room/listen/theme/use-listen-ambient-preference";
import { useListenVisualizationPreference } from "@/components/room/listen/theme/use-listen-visualization-preference";
import { getListenPresentationVariables } from "@/lib/player/listen-visualization";
import { resolveListenVisualizationCapability } from "@/lib/player/listen-visualizer-input";
import {
  isUsableRoomRhythmProfile,
  ROOM_RHYTHM_ALGORITHM_VERSION,
} from "@/lib/audio-companion/room-rhythm";
import { useRoomRhythmPublication } from "@/lib/audio-companion/use-room-rhythm-publication";
import { useAudioCompanion } from "@/lib/audio-companion/use-audio-companion";
import {
  useListenQueueItems,
  useDesktopListenShell,
  useRemainingQueueSeconds,
  toSmartShuffleItem,
  buildCanonicalState,
  usePersistentListenTvSettings,
  readStoredVolume,
} from "@/components/room/listen/hooks/listen-hooks";

const ListenTvModeLayout = dynamic(
  () =>
    import("@/components/room/listen/tv/tv-mode-layout").then(
      (module) => module.ListenTvModeLayout,
    ),
  { loading: ListenTvModeLoadingBoundary },
);

export function ListenModeLayout({
  account,
  accountNotice,
  liveRoom,
  room,
}: ListenModeLayoutProps) {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [tvMode, setTvMode] = useState(false);
  const [tvSettingsOpen, setTvSettingsOpen] = useState(false);
  const [tvSettings, setTvSettings] = usePersistentListenTvSettings();
  const {
    ambientFallbackEnabled,
    backgroundDimming,
    backgroundVibrancy,
    visualIntensity,
    visualizerArtworkEnabled,
  } = useListenAmbientPreference();
  const { mode: visualizationMode } = useListenVisualizationPreference();
  const audioCompanion = useAudioCompanion();
  const [volume, setVolume] = useState(DEFAULT_LISTEN_VOLUME);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const mediaPreferences = useMediaPreferences({
    allowUploaded: account.status === "signed-in",
    identityKey: `${account.status === "signed-in" ? account.id : "guest"}:${room.currentMember?.id ?? "none"}`,
    roomId: room.id,
  });
  const canonicalQueueItems = useListenQueueItems(liveRoom, room);
  const optimisticAdds = useOptimisticAdds(
    `${room.id}:${room.currentMember?.id ?? "none"}:${account.status === "signed-in" ? account.id : "guest"}`,
    canonicalQueueItems,
    liveRoom.canAddQueue && liveRoom.connectionStatus === "connected",
    liveRoom.addQueueItem,
  );
  const liveQueueItems = optimisticAdds.items;
  const queueState = useMemo(
    () => deriveQueueState(liveQueueItems),
    [liveQueueItems],
  );
  const session = liveRoom.snapshot.session;
  const currentItem = queueState.currentItem;
  const activePreferenceItem = useMemo(
    () =>
      activeMediaPreferenceItem({
        currentItem,
        sourceTitle: session?.sourceTitle ?? null,
        sourceType: session?.sourceType ?? null,
        sourceUrl: session?.sourceUrl ?? null,
      }),
    [
      currentItem,
      session?.sourceTitle,
      session?.sourceType,
      session?.sourceUrl,
    ],
  );
  const currentLiveQueueItem = session?.activeQueueItemId
    ? liveRoom.snapshot.queue.find(
        (item) => item.queueItemId === session.activeQueueItemId,
      )
    : null;
  const queuedItems = queueState.queuedItems;
  const previousItems = queueState.playedItemsBySequence;
  const activeArtworkUrl =
    currentItem?.thumbnailUrl ??
    (session?.sourceType === "youtube" && session.sourceUrl
      ? getYouTubeThumbnailUrl(session.sourceUrl)
      : null);
  const fallbackListenTheme = useMemo(
    () => getListenTheme(session?.sourceUrl ?? currentItem?.sourceUrl ?? null),
    [currentItem?.sourceUrl, session?.sourceUrl],
  );
  const listenTheme = useArtworkTheme(activeArtworkUrl, fallbackListenTheme);
  const listenThemeStyle = {
    ...getListenPresentationVariables(
      visualIntensity,
      backgroundDimming,
      backgroundVibrancy,
    ),
    "--listen-background-primary": listenTheme.backgroundPrimary,
    "--listen-background-secondary": listenTheme.backgroundSecondary,
    "--listen-primary": listenTheme.primary,
    "--listen-secondary": listenTheme.secondary,
    "--listen-shadow": listenTheme.shadow,
    "--listen-wave": listenTheme.wave,
    "--listen-player-rail-width": "clamp(380px, 22.5vw, 420px)",
    "--listen-shell-gap": "1rem",
    "--listen-shell-inset": "0.75rem",
    "--listen-workspace-inset": "clamp(0.75rem, 1vw, 1rem)",
    "--listen-workspace-left":
      "calc(var(--listen-shell-inset) + var(--listen-player-rail-width) + var(--listen-shell-gap))",
    "--listen-room-columns": "var(--listen-player-rail-width) minmax(0,1fr)",
    "--listen-collapsed-queue-height":
      queuedItems.length > 0 ? "4.5rem" : "3rem",
  } as CSSProperties;
  const desktopShell = useDesktopListenShell();
  const currentPosition = useMemo(() => {
    const canonicalState = buildCanonicalState(liveRoom);

    return canonicalState ? expectedPositionAt(canonicalState, clockMs) : 0;
  }, [clockMs, liveRoom]);
  const durationSeconds =
    currentLiveQueueItem?.durationSeconds ??
    session?.sourceDurationSeconds ??
    0;
  const activeTitle =
    session?.sourceTitle ?? currentItem?.title ?? room.nowPlaying.title;
  const activeArtist = artistLabel(
    currentItem?.artist ??
      currentItem?.channelName ??
      room.nowPlaying.artist ??
      "Room source",
  );
  const activeMediaId = parseYouTubeVideoId(session?.sourceUrl ?? "");
  const hasSharedRhythm = Boolean(
    activeMediaId &&
    session?.playbackOccurrenceId &&
    isUsableRoomRhythmProfile(liveRoom.snapshot.roomRhythmProfile, {
      algorithmVersion: ROOM_RHYTHM_ALGORITHM_VERSION,
      mediaId: activeMediaId,
      nowMs: clockMs,
      playbackOccurrenceId: session.playbackOccurrenceId,
    }),
  );
  const effectiveVisualizationMode = resolveListenVisualizationCapability(
    visualizationMode,
    {
      hasLocalDetail: audioCompanion.snapshot.hasVisualDetail,
      hasSharedRhythm,
      preview: false,
    },
  ).effectiveMode;
  const canControl = liveRoom.canControlPlayback;
  const canManageQueue = liveRoom.canManageQueue;
  const isConnected = liveRoom.connectionStatus === "connected";
  const nextPreparation = useNextItemPreparation(liveRoom);
  const {
    loading: remainingQueueMetadataLoading,
    seconds: remainingQueueSeconds,
  } = useRemainingQueueSeconds(liveRoom, room.id, queueDrawerOpen);
  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 250);

    return () => window.clearInterval(timer);
  }, []);

  useRoomRhythmPublication({
    companion: audioCompanion.snapshot,
    liveRoom,
    mediaPositionSeconds: currentPosition,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setVolume(readStoredVolume());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function setLocalVolume(nextVolume: number) {
    const safeVolume = Math.min(100, Math.max(0, nextVolume));

    setVolume(safeVolume);
    window.localStorage.setItem("mw_player_volume", String(safeVolume));
    dispatchPlayerVolume(safeVolume / 100);
  }

  function setPlayback(status: "paused" | "playing") {
    const state = buildCanonicalState(liveRoom);
    liveRoom.setPlaybackState({
      positionSeconds: state ? expectedPositionAt(state, Date.now()) : 0,
      status,
    });
  }

  function seekTo(positionSeconds: number) {
    liveRoom.setPlaybackState({
      positionSeconds,
      status: session?.status === "playing" ? "playing" : "paused",
    });
  }

  function playPrevious() {
    const previous = previousItems.at(-1);

    if (previous) {
      liveRoom.playQueueItemNow(previous.id);
    }
  }

  function playNext() {
    const next = queuedItems.find((item) => !item.pendingAdd);

    if (next) {
      liveRoom.playQueueItemNow(next.id);
    }
  }

  function applyQueueShuffle(strategy: "pinned" | "shuffle" | "smart") {
    if (!canManageQueue || !isConnected) {
      return;
    }

    const history = [
      ...previousItems,
      ...(currentItem ? [currentItem] : []),
    ].map(toSmartShuffleItem);
    const queued = queuedItems
      .filter((item) => !item.pendingAdd)
      .map(toSmartShuffleItem);
    const originalPositions = new Map(
      queued.map((item) => [item.queueItemId, item.position]),
    );
    const nextOrder =
      strategy === "smart"
        ? smartShuffleQueue(queued, history)
        : strategy === "pinned"
          ? [...queued].sort((first, second) => {
              const firstPinned = first.isPinned || first.isPlayNext ? 0 : 1;
              const secondPinned = second.isPinned || second.isPlayNext ? 0 : 1;

              return (
                firstPinned - secondPinned || first.position - second.position
              );
            })
          : shuffleUpcomingQueue(queued);

    const clientActionId = crypto.randomUUID();

    nextOrder.forEach((item, index) => {
      if (originalPositions.get(item.queueItemId) !== index) {
        liveRoom.moveQueueItem(item.queueItemId, index, clientActionId);
      }
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));

      if (isTypingTarget) {
        return;
      }

      if (tvSettingsOpen) {
        return;
      }

      if (event.key === "Escape" && tvMode) {
        setTvSettingsOpen(false);
        setTvMode(false);
        return;
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setTvSettingsOpen(false);
        setTvMode((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tvMode, tvSettingsOpen]);

  const nowPlaying = (
    <ListenNowPlayingPanel
      canControl={canControl && isConnected}
      currentItem={activePreferenceItem}
      currentPosition={currentPosition}
      desktopShell={desktopShell}
      durationSeconds={durationSeconds}
      liveRoom={liveRoom}
      mediaPreferences={mediaPreferences}
      nextPreparation={nextPreparation}
      onNext={playNext}
      onOpenQueue={() => setQueueDrawerOpen(true)}
      onPlaybackChange={setPlayback}
      onPrevious={playPrevious}
      onSeek={seekTo}
      onShuffle={() => applyQueueShuffle("shuffle")}
      onVolumeChange={setLocalVolume}
      queueAutoplayEnabled={session?.queueAutoplayEnabled ?? true}
      queuedItems={queuedItems}
      remainingQueueSeconds={remainingQueueSeconds}
      room={room}
      volume={volume}
    />
  );
  const header = (
    <ListenTechnicalRoomHeader
      account={account}
      accountNotice={accountNotice}
      artworkUrl={activeArtworkUrl}
      canAddQueue={liveRoom.canAddQueue}
      canLoadSource={liveRoom.canManageAuthority}
      connectionStatus={liveRoom.connectionStatus}
      desktopShell={desktopShell}
      historyCount={previousItems.length}
      liveRoom={liveRoom}
      onAddQueueItem={optimisticAdds.add}
      onEnterTvMode={() => setTvMode(true)}
      onLoadSource={liveRoom.loadMediaSource}
      queueItems={liveQueueItems}
      queueCount={queuedItems.length}
      remainingSeconds={remainingQueueSeconds}
      room={room}
      tvSettings={tvSettings}
      onTvSettingsChange={setTvSettings}
    />
  );
  const discovery = (
    <ListenContentStage
      active={session?.status === "playing"}
      activeArtworkUrl={activeArtworkUrl}
      activeMediaId={activeMediaId}
      ambientFallbackEnabled={ambientFallbackEnabled}
      artist={activeArtist}
      canAddQueue={liveRoom.canAddQueue && isConnected}
      canLoadSource={liveRoom.canManageAuthority && isConnected}
      canPlay={canControl && isConnected}
      companion={audioCompanion}
      currentItem={currentItem}
      currentPosition={currentPosition}
      durationSeconds={durationSeconds}
      intensity={visualIntensity}
      items={liveQueueItems}
      mediaPreferences={mediaPreferences}
      nowMs={clockMs}
      onAddQueueItem={optimisticAdds.add}
      onLoadSource={liveRoom.loadMediaSource}
      onPlayQueueItem={liveRoom.playQueueItemNow}
      playbackOccurrenceId={session?.playbackOccurrenceId}
      preferenceItem={activePreferenceItem}
      room={room}
      roomRhythmProfile={liveRoom.snapshot.roomRhythmProfile}
      theme={listenTheme}
      title={activeTitle}
      visualizationMode={visualizationMode}
      visualizerArtworkEnabled={visualizerArtworkEnabled}
    />
  );

  if (tvMode) {
    return (
      <ListenTvModeLayout
        canControl={canControl && isConnected}
        currentItem={currentItem}
        currentPosition={currentPosition}
        durationSeconds={durationSeconds}
        liveRoom={liveRoom}
        mediaPreferences={mediaPreferences}
        preferenceItem={activePreferenceItem}
        onExit={() => {
          setTvSettingsOpen(false);
          setTvMode(false);
        }}
        onNext={playNext}
        onPlaybackChange={setPlayback}
        onPrevious={playPrevious}
        onSeek={seekTo}
        onSettingsOpenChange={setTvSettingsOpen}
        onShuffle={() => applyQueueShuffle("shuffle")}
        onTvSettingsChange={setTvSettings}
        onVolumeChange={setLocalVolume}
        queueAutoplayEnabled={session?.queueAutoplayEnabled ?? true}
        queuedItems={queuedItems}
        remainingQueueSeconds={remainingQueueSeconds}
        room={room}
        settingsOpen={tvSettingsOpen}
        style={listenThemeStyle}
        tvSettings={tvSettings}
        volume={volume}
      />
    );
  }

  return (
    <OptimisticQueueContext.Provider value={optimisticAdds.actions}>
      <ListenMobileLayout
        account={account}
        accountNotice={accountNotice}
        room={room}
        liveRoom={liveRoom}
        items={liveQueueItems}
        header={header}
        player={nowPlaying}
        discovery={discovery}
        style={listenThemeStyle}
        title={activeTitle}
        artist={activeArtist}
        onPlaybackChange={setPlayback}
        onNext={playNext}
        onEnterTv={() => setTvMode(true)}
        desktopShell={desktopShell}
        desktopQueue={
          <ListenQueueDrawer
            canAddQueue={liveRoom.canAddQueue}
            canManageQueue={canManageQueue}
            isConnected={isConnected}
            nextPreparation={nextPreparation}
            onOpenChange={setQueueDrawerOpen}
            onAddQueueItem={optimisticAdds.add}
            onClearQueue={liveRoom.clearQueue}
            onMoveQueueItem={liveRoom.moveQueueItem}
            onPinnedFirst={() => applyQueueShuffle("pinned")}
            onPlayQueueItem={liveRoom.playQueueItemNow}
            onQueueItemPriorityChange={liveRoom.setQueueItemPriority}
            onRemoveQueueItem={liveRoom.removeQueueItem}
            onShuffle={() => applyQueueShuffle("shuffle")}
            onSmartShuffle={() => applyQueueShuffle("smart")}
            queueState={queueState}
            queueMode={session?.queueMode ?? "normal"}
            open={queueDrawerOpen}
            remainingLoading={remainingQueueMetadataLoading}
            remainingSeconds={remainingQueueSeconds}
            desktopShell={desktopShell}
          />
        }
        backdrop={
          <>
            {desktopShell && effectiveVisualizationMode !== "off" ? (
              <ListenAmbientBackdrop mode={effectiveVisualizationMode} />
            ) : null}
            {effectiveVisualizationMode !== "off" ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
                style={{
                  background:
                    "radial-gradient(circle at 0% 18%, rgb(var(--listen-primary) / 0.3), transparent 44%), radial-gradient(circle at 18% 62%, rgb(var(--listen-secondary) / 0.18), transparent 40%), radial-gradient(circle at 38% 100%, rgb(var(--listen-wave) / 0.1), transparent 46%), linear-gradient(90deg, rgb(var(--listen-primary) / 0.05), rgb(14 14 15 / var(--listen-room-dim-middle,0.64)) 34%, rgb(19 19 20 / var(--listen-room-dim-end,0.97)) 100%)",
                }}
              />
            ) : null}
          </>
        }
      />
    </OptimisticQueueContext.Provider>
  );
}

function ListenTvModeLoadingBoundary() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading TV mode"
      className="grid h-dvh min-h-0 animate-pulse bg-black"
    />
  );
}
