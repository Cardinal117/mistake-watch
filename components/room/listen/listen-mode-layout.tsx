"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { dispatchPlayerVolume } from "@/lib/player/local-controls";
import { getYouTubeThumbnailUrl } from "@/lib/player/source";
import { expectedPositionAt } from "@/lib/player";
import { shuffleUpcomingQueue, smartShuffleQueue } from "@/lib/queue/model";
import { deriveQueueState } from "@/lib/queue/derived";
import { cx } from "@/lib/ui";
import { useMediaPreferences } from "@/lib/recommendations/use-media-preferences";
import { useNextItemPreparation } from "@/components/room/use-next-item-preparation";
import {
  type ListenModeLayoutProps,
  DEFAULT_LISTEN_VOLUME,
} from "@/components/room/listen/shared";
import { ListenNowPlayingPanel } from "@/components/room/listen/now-playing/now-playing-panel";
import { ListenTechnicalRoomHeader } from "@/components/room/listen/header/technical-room-header";
import { ListenMobileRoomTools } from "@/components/room/listen/mobile/mobile-room-tools";
import { ListenDiscoveryPanel } from "@/components/room/listen/discovery/discovery-panel";
import { ListenQueueDrawer } from "@/components/room/listen/queue/queue-drawer";
import {
  ListenAmbientBackdrop,
  useArtworkTheme,
  getListenTheme,
} from "@/components/room/listen/theme/listen-theme";
import { ListenVisualization } from "@/components/room/listen/theme/listen-visualization";
import { useListenAmbientPreference } from "@/components/room/listen/theme/use-listen-ambient-preference";
import { useListenVisualizationPreference } from "@/components/room/listen/theme/use-listen-visualization-preference";
import { getListenPresentationVariables } from "@/lib/player/listen-visualization";
import { useRoomRhythmPublication } from "@/lib/audio-companion/use-room-rhythm-publication";
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
  const [clockMs, setClockMs] = useState(0);
  const [mobileToolsTab, setMobileToolsTab] = useState<"members" | "room">(
    "room",
  );
  const [tvMode, setTvMode] = useState(false);
  const [tvSettings, setTvSettings] = usePersistentListenTvSettings();
  const { backgroundDimming, visualIntensity } = useListenAmbientPreference();
  const { mode: visualizationMode } = useListenVisualizationPreference();
  const [volume, setVolume] = useState(DEFAULT_LISTEN_VOLUME);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const mediaPreferences = useMediaPreferences({
    allowUploaded: account.status === "signed-in",
    roomId: room.id,
  });
  const liveQueueItems = useListenQueueItems(liveRoom, room);
  const queueState = useMemo(
    () => deriveQueueState(liveQueueItems),
    [liveQueueItems],
  );
  const session = liveRoom.snapshot.session;
  const currentItem = queueState.currentItem;
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
    ...getListenPresentationVariables(visualIntensity, backgroundDimming),
    "--listen-primary": listenTheme.primary,
    "--listen-secondary": listenTheme.secondary,
    "--listen-shadow": listenTheme.shadow,
    "--listen-wave": listenTheme.wave,
    "--listen-player-rail-width": "clamp(380px, 24vw, 420px)",
    "--listen-room-columns": "var(--listen-player-rail-width) minmax(0,1fr)",
  } as CSSProperties;
  const desktopShell = useDesktopListenShell();
  const controllerMemberId =
    liveRoom.participants.find((participant) => participant.isController)?.id ??
    null;
  const currentPosition = useMemo(() => {
    const canonicalState = buildCanonicalState(liveRoom);

    return canonicalState ? expectedPositionAt(canonicalState, clockMs) : 0;
  }, [clockMs, liveRoom]);
  const durationSeconds =
    currentLiveQueueItem?.durationSeconds ??
    session?.sourceDurationSeconds ??
    0;
  const canControl = liveRoom.canControlPlayback;
  const canManageQueue = liveRoom.canManageQueue;
  const isConnected = liveRoom.connectionStatus === "connected";
  const nextPreparation = useNextItemPreparation(liveRoom);
  const {
    loading: remainingQueueMetadataLoading,
    seconds: remainingQueueSeconds,
  } = useRemainingQueueSeconds(liveRoom, room.id, queueDrawerOpen);
  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 500);

    return () => window.clearInterval(timer);
  }, []);

  useRoomRhythmPublication({
    liveRoom,
    mediaPositionSeconds: currentPosition,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setVolume(readStoredVolume());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    dispatchPlayerVolume(volume / 100);
  }, [volume]);

  function setLocalVolume(nextVolume: number) {
    const safeVolume = Math.min(100, Math.max(0, nextVolume));

    setVolume(safeVolume);
    window.localStorage.setItem("mw_player_volume", String(safeVolume));
    dispatchPlayerVolume(safeVolume / 100);
  }

  function setPlayback(status: "paused" | "playing") {
    liveRoom.setPlaybackState({
      positionSeconds: currentPosition,
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
    const next = queuedItems[0];

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
    const queued = queuedItems.map(toSmartShuffleItem);
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

      if (event.key === "Escape" && tvMode) {
        setTvMode(false);
        return;
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        setTvMode((current) => !current);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tvMode]);

  if (tvMode) {
    return (
      <ListenTvModeLayout
        canControl={canControl}
        currentItem={currentItem}
        currentPosition={currentPosition}
        durationSeconds={durationSeconds}
        liveRoom={liveRoom}
        onExit={() => setTvMode(false)}
        onNext={playNext}
        onPlaybackChange={setPlayback}
        onPrevious={playPrevious}
        onSeek={seekTo}
        onShuffle={() => applyQueueShuffle("shuffle")}
        onVolumeChange={setLocalVolume}
        queueAutoplayEnabled={session?.queueAutoplayEnabled ?? true}
        queuedItems={queuedItems}
        remainingQueueSeconds={remainingQueueSeconds}
        room={room}
        style={listenThemeStyle}
        tvSettings={tvSettings}
        volume={volume}
      />
    );
  }

  return (
    <main
      className={cx(
        "relative min-h-screen overflow-x-hidden bg-background text-on-surface",
        desktopShell && "h-dvh min-h-dvh overflow-hidden",
      )}
      style={listenThemeStyle}
    >
      {desktopShell && visualizationMode !== "off" ? (
        <ListenAmbientBackdrop
          artworkUrl={activeArtworkUrl}
          mode={visualizationMode}
        />
      ) : null}
      {visualizationMode !== "off" ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
          style={{
            background:
              "radial-gradient(circle at 0% 18%, rgb(var(--listen-primary) / 0.3), transparent 44%), radial-gradient(circle at 18% 62%, rgb(var(--listen-secondary) / 0.18), transparent 40%), radial-gradient(circle at 38% 100%, rgb(var(--listen-wave) / 0.1), transparent 46%), linear-gradient(90deg, rgb(var(--listen-primary) / 0.05), rgb(14 14 15 / var(--listen-room-dim-middle,0.64)) 34%, rgb(19 19 20 / var(--listen-room-dim-end,0.97)) 100%)",
          }}
        />
      ) : null}
      {desktopShell ? (
        <ListenVisualization
          active={session?.status === "playing"}
          mode={visualizationMode}
        />
      ) : null}
      <div
        className={cx(
          "relative z-10 grid transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          desktopShell
            ? "h-dvh min-h-0 grid-cols-[var(--listen-room-columns)] gap-0 overflow-hidden px-0 pb-0 pt-0"
            : "gap-4 px-margin-mobile pb-32 pt-4 md:px-margin-desktop",
        )}
      >
        <ListenNowPlayingPanel
          canControl={canControl}
          currentItem={currentItem}
          currentPosition={currentPosition}
          desktopShell={desktopShell}
          durationSeconds={durationSeconds}
          liveRoom={liveRoom}
          mediaPreferences={mediaPreferences}
          mobileTools={
            <ListenMobileRoomTools
              activeTab={mobileToolsTab}
              account={account}
              accountNotice={accountNotice}
              artworkUrl={activeArtworkUrl}
              canAddQueue={liveRoom.canAddQueue}
              canLoadSource={liveRoom.canManageAuthority}
              connectionStatus={liveRoom.connectionStatus}
              controllerMemberId={controllerMemberId}
              currentMemberId={room.currentMember?.id}
              items={liveQueueItems}
              liveRoom={liveRoom}
              onAddQueueItem={liveRoom.addQueueItem}
              onLoadSource={liveRoom.loadMediaSource}
              onTabChange={setMobileToolsTab}
              roomErrors={liveRoom.snapshot.errors}
              room={room}
            />
          }
          nextPreparation={nextPreparation}
          onNext={playNext}
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

        <section
          className={cx(
            "relative grid min-w-0 overflow-visible border-white/10",
            desktopShell &&
              "min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-x",
          )}
          style={{
            background:
              "radial-gradient(circle at 0% 20%, rgb(var(--listen-primary) / 0.085), transparent 34rem), radial-gradient(circle at 20% 54%, rgb(var(--listen-secondary) / 0.055), transparent 42rem), linear-gradient(90deg,rgb(14 14 15 / var(--listen-panel-dim-start,0.88)),rgb(14 14 15 / var(--listen-panel-dim-middle,0.78)) 44%,rgb(19 19 20 / var(--listen-panel-dim-end,0.9)))",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(255_255_255_/_0.035)_1px,transparent_1px),linear-gradient(180deg,rgb(255_255_255_/_0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20"
          />
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
            onAddQueueItem={liveRoom.addQueueItem}
            onEnterTvMode={() => setTvMode(true)}
            onLoadSource={liveRoom.loadMediaSource}
            queueItems={liveQueueItems}
            queueCount={queuedItems.length}
            remainingSeconds={remainingQueueSeconds}
            room={room}
            tvSettings={tvSettings}
            onTvSettingsChange={setTvSettings}
          />
          <div
            className={cx(
              "relative z-10 grid gap-4 px-4 py-4 [scrollbar-color:rgb(var(--listen-primary)_/_0.42)_transparent] [scrollbar-width:thin] sm:px-6",
              desktopShell &&
                "min-h-0 overflow-y-auto px-6 py-5 min-[1200px]:px-10",
            )}
          >
            <ListenDiscoveryPanel
              canAddQueue={liveRoom.canAddQueue && isConnected}
              canLoadSource={liveRoom.canManageAuthority && isConnected}
              canPlay={canControl && isConnected}
              currentItem={currentItem}
              items={liveQueueItems}
              mediaPreferences={mediaPreferences}
              onAddQueueItem={liveRoom.addQueueItem}
              onLoadSource={liveRoom.loadMediaSource}
              onPlayQueueItem={liveRoom.playQueueItemNow}
              room={room}
            />
          </div>
        </section>
      </div>
      <ListenQueueDrawer
        canAddQueue={liveRoom.canAddQueue}
        canManageQueue={canManageQueue}
        isConnected={isConnected}
        nextPreparation={nextPreparation}
        onOpenChange={setQueueDrawerOpen}
        onAddQueueItem={liveRoom.addQueueItem}
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
    </main>
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
