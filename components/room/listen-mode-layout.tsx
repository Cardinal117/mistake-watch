"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronUp,
  ChevronsUp,
  Disc3,
  GripVertical,
  Headphones,
  ListMusic,
  ListPlus,
  Loader2,
  Maximize2,
  MoreVertical,
  Pause,
  Pin,
  Play,
  Plus,
  Repeat2,
  Search,
  Shuffle,
  SlidersHorizontal,
  SkipBack,
  SkipForward,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { SignalApertureLockup } from "@/components/brand";
import {
  Avatar,
  Badge,
  Button,
  IconButton,
  PendingLink,
  Slider,
} from "@/components/ui";
import { setRoomSavedAction } from "@/lib/rooms/actions";
import {
  dispatchPlayerFullscreenRequest,
  dispatchPlayerVolume,
  readStoredPlayerVolume,
} from "@/lib/player/local-controls";
import {
  detectUrlType,
  getSourceDisplayTitle,
  getYouTubeThumbnailUrl,
  parseYouTubePlaylist,
  parseYouTubeVideoId,
  validateMediaSourceForMode,
} from "@/lib/player/source";
import { expectedPositionAt, type CanonicalPlaybackState } from "@/lib/player";
import {
  shuffleUpcomingQueue,
  smartShuffleQueue,
  type QueueMode,
  type SmartShuffleItem,
} from "@/lib/queue/model";
import {
  buildListenDiscoveryResult,
  buildListenSessionInsights,
  type ListenDiscoveryTab,
} from "@/lib/recommendations/listen-discovery";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import type { LiveQueueItem, LiveRoomError, LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { fetchPlaylistPreview } from "@/lib/youtube/playlist-client";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata-client";
import { fetchYouTubeRecommendations } from "@/lib/youtube/recommendations-client";
import type {
  YouTubePlaylistItem,
  YouTubePlaylistPreviewResponse,
} from "@/lib/youtube/playlist";
import type { YouTubeRecommendationResponse } from "@/lib/youtube/recommendations";
import type { YouTubeVideoMetadata } from "@/lib/youtube/metadata";
import { getYouTubeAvailabilityLabel } from "@/lib/youtube/availability";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";
import { DirectMediaPlayer } from "./direct-media-player";
import { InviteActions } from "./invite-actions";
import { MembersPanel } from "./members-panel";
import { ModeSwitcher } from "./mode-switcher";
import { useNextItemPreparation } from "./use-next-item-preparation";
import { YoutubeMediaPlayer } from "./youtube-media-player";
import { YouTubeMetadataLine } from "./youtube-metadata-line";

type ListenModeLayoutProps = {
  liveRoom: LiveRoomState;
  room: RoomSnapshot;
};

type SourceLoadInput = {
  sourceTitle: string;
  sourceType: "direct" | "hls" | "youtube";
  sourceUrl: string;
};

type QueueAddInput = SourceLoadInput & {
  artist?: string;
  channelName?: string;
  durationSeconds?: number;
  isPinned?: boolean;
  isPlayNext?: boolean;
  isUnavailable?: boolean;
  allowDuplicate?: boolean;
  playlistId?: string;
  playlistTitle?: string;
  thumbnailUrl?: string;
};

type PlaylistPreview = YouTubePlaylistPreviewResponse;
type PlaylistPreviewItem = YouTubePlaylistItem;
type ListenNotification = {
  id: string;
  message: string;
  tone: "error" | "info" | "success" | "warning";
};
type ListenTheme = {
  primary: string;
  secondary: string;
  shadow: string;
  wave: string;
};

const MIN_LISTEN_DRAWER_HEIGHT = 34;
const MAX_LISTEN_DRAWER_HEIGHT = 88;
const roomErrorToneBySeverity = {
  error: "error",
  info: "info",
  warning: "warning",
} satisfies Record<LiveRoomError["severity"], ListenNotification["tone"]>;

function playlistItemKey(item: PlaylistPreviewItem) {
  return `${item.videoId}:${item.position}`;
}
const DEFAULT_LISTEN_DRAWER_HEIGHT = 56;
const DEFAULT_LISTEN_VOLUME = 100;
const DEFAULT_RIGHT_SIDEBAR_COLLAPSED = false;

export function ListenModeLayout({ liveRoom, room }: ListenModeLayoutProps) {
  const [clockMs, setClockMs] = useState(0);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(
    DEFAULT_RIGHT_SIDEBAR_COLLAPSED,
  );
  const [mobileToolsTab, setMobileToolsTab] = useState<"members" | "room">(
    "room",
  );
  const [volume, setVolume] = useState(DEFAULT_LISTEN_VOLUME);
  const liveQueueItems = useListenQueueItems(liveRoom, room);
  const session = liveRoom.snapshot.session;
  const currentItem =
    liveQueueItems.find((item) => item.status === "now") ?? null;
  const currentLiveQueueItem = session?.activeQueueItemId
    ? liveRoom.snapshot.queue.find(
        (item) => item.queueItemId === session.activeQueueItemId,
      )
    : null;
  const queuedItems = liveQueueItems.filter((item) => item.status === "queued");
  const previousItems = liveQueueItems
    .filter((item) => item.status === "played")
    .sort((a, b) => (a.playedSequence ?? 0) - (b.playedSequence ?? 0));
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
    "--listen-primary": listenTheme.primary,
    "--listen-secondary": listenTheme.secondary,
    "--listen-shadow": listenTheme.shadow,
    "--listen-wave": listenTheme.wave,
  } as CSSProperties;
  const desktopShell = useDesktopListenShell();
  const aiDjRailPlacement = useListenAiDjRailPlacement();
  const listenGridStyle = {
    "--listen-room-columns": rightSidebarCollapsed
      ? "400px minmax(0,1fr) 56px"
      : "320px minmax(0,1fr) 320px",
  } as CSSProperties;
  const controllerMemberId =
    liveRoom.participants.find((participant) => participant.isController)?.id ??
    null;
  const currentPosition = useMemo(() => {
    const canonicalState = buildCanonicalState(liveRoom);

    return canonicalState ? expectedPositionAt(canonicalState, clockMs) : 0;
  }, [clockMs, liveRoom]);
  const durationSeconds =
    currentLiveQueueItem?.durationSeconds ?? session?.sourceDurationSeconds ?? 0;
  const canControl = liveRoom.canControlPlayback;
  const canManageQueue = liveRoom.canManageQueue;
  const isConnected = liveRoom.connectionStatus === "connected";
  const nextPreparation = useNextItemPreparation(liveRoom);
  const remainingQueueSeconds = useRemainingQueueSeconds(liveRoom);
  const sessionInsights = useMemo(
    () => buildListenSessionInsights(liveQueueItems),
    [liveQueueItems],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 500);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setVolume(readStoredVolume());
      setRightSidebarCollapsed(readStoredRightSidebarCollapsed());
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

  function setSidebarCollapsed(collapsed: boolean) {
    setRightSidebarCollapsed(collapsed);
    window.localStorage.setItem(
      "mw_listen_right_sidebar_collapsed",
      collapsed ? "1" : "0",
    );
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
    const previous = [...previousItems]
      .sort((a, b) => (a.playedSequence ?? 0) - (b.playedSequence ?? 0))
      .at(-1);

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

              return firstPinned - secondPinned || first.position - second.position;
            })
          : shuffleUpcomingQueue(queued);

    nextOrder.forEach((item, index) => {
      if (originalPositions.get(item.queueItemId) !== index) {
        liveRoom.moveQueueItem(item.queueItemId, index);
      }
    });
  }

  return (
    <main
      className={cx(
        "relative min-h-screen overflow-x-hidden bg-background text-on-surface",
        desktopShell && "h-dvh min-h-dvh overflow-hidden",
      )}
      style={listenThemeStyle}
    >
      {desktopShell ? (
        <ListenAmbientBackdrop artworkUrl={activeArtworkUrl} />
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          background:
            "radial-gradient(circle at 0% 18%, rgb(var(--listen-primary) / 0.3), transparent 44%), radial-gradient(circle at 18% 62%, rgb(var(--listen-secondary) / 0.18), transparent 40%), radial-gradient(circle at 38% 100%, rgb(var(--listen-wave) / 0.1), transparent 46%), linear-gradient(90deg, rgb(var(--listen-primary) / 0.05), rgb(14 14 15 / 0.64) 34%, rgb(19 19 20 / 0.97) 100%)",
        }}
      />
      <div
        className={cx(
          "relative z-10 grid transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          desktopShell
            ? "h-dvh min-h-0 grid-cols-[var(--listen-room-columns)] gap-0 overflow-hidden px-0 pb-0 pt-0"
            : "gap-4 px-margin-mobile pb-32 pt-4 md:px-margin-desktop",
        )}
        style={listenGridStyle}
      >
        <ListenNowPlayingPanel
          canControl={canControl}
          currentItem={currentItem}
          currentPosition={currentPosition}
          desktopShell={desktopShell}
          durationSeconds={durationSeconds}
          enableAiDjRail={aiDjRailPlacement}
          liveRoom={liveRoom}
          sessionInsights={sessionInsights}
          mobileTools={
            <ListenMobileRoomTools
              activeTab={mobileToolsTab}
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
              "radial-gradient(circle at 0% 20%, rgb(var(--listen-primary) / 0.075), transparent 34rem), radial-gradient(circle at 20% 54%, rgb(var(--listen-secondary) / 0.045), transparent 42rem), linear-gradient(90deg,rgb(14 14 15 / 0.985),rgb(14 14 15 / 0.96) 44%,rgb(19 19 20 / 0.985))",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(255_255_255_/_0.035)_1px,transparent_1px),linear-gradient(180deg,rgb(255_255_255_/_0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20"
          />
          {desktopShell ? (
            <ListenCenterWaveform
              active={session?.status === "playing"}
              artworkUrl={activeArtworkUrl}
            />
          ) : null}
          <ListenTechnicalRoomHeader
            canAddQueue={liveRoom.canAddQueue}
            canLoadSource={liveRoom.canManageAuthority}
            connectionStatus={liveRoom.connectionStatus}
            desktopShell={desktopShell}
            historyCount={previousItems.length}
            liveRoom={liveRoom}
            onAddQueueItem={liveRoom.addQueueItem}
            onLoadSource={liveRoom.loadMediaSource}
            queueItems={liveQueueItems}
            queueCount={queuedItems.length}
            remainingSeconds={remainingQueueSeconds}
            room={room}
          />
          <div
            className={cx(
              "relative z-10 grid gap-4 px-4 py-4 [scrollbar-color:rgb(255_186_32_/_0.42)_transparent] [scrollbar-width:thin] sm:px-6",
              desktopShell &&
                "min-h-0 overflow-y-auto px-6 py-5 min-[1200px]:px-10",
            )}
          >
            <ListenDiscoveryPanel
              canAddQueue={liveRoom.canAddQueue && isConnected}
              canLoadSource={liveRoom.canManageAuthority && isConnected}
              canPlay={canControl && isConnected}
              currentItem={currentItem}
              hideAiDjHome={aiDjRailPlacement}
              items={liveQueueItems}
              onAddQueueItem={liveRoom.addQueueItem}
              onLoadSource={liveRoom.loadMediaSource}
              onPlayQueueItem={liveRoom.playQueueItemNow}
              room={room}
            />
          </div>
        </section>

        <div className={cx("min-h-0", desktopShell ? "block" : "hidden")}>
          <ListenRoomSidebar
            collapsed={rightSidebarCollapsed}
            currentMemberId={room.currentMember?.id}
            liveRoom={liveRoom}
            onCollapsedChange={setSidebarCollapsed}
          />
        </div>
      </div>
      <ListenQueueDrawer
        canAddQueue={liveRoom.canAddQueue}
        canManageQueue={canManageQueue}
        currentItem={currentItem}
        isConnected={isConnected}
        items={liveQueueItems}
        nextPreparation={nextPreparation}
        onAddQueueItem={liveRoom.addQueueItem}
        onClearQueue={liveRoom.clearQueue}
        onMoveQueueItem={liveRoom.moveQueueItem}
        onPinnedFirst={() => applyQueueShuffle("pinned")}
        onPlayQueueItem={liveRoom.playQueueItemNow}
        onQueueItemPriorityChange={liveRoom.setQueueItemPriority}
        onRemoveQueueItem={liveRoom.removeQueueItem}
        onShuffle={() => applyQueueShuffle("shuffle")}
        onSmartShuffle={() => applyQueueShuffle("smart")}
        queueMode={session?.queueMode ?? "normal"}
        queuedItems={queuedItems}
        remainingSeconds={remainingQueueSeconds}
        rightSidebarCollapsed={rightSidebarCollapsed}
        desktopShell={desktopShell}
      />
    </main>
  );
}

function ListenNowPlayingPanel({
  canControl,
  currentItem,
  currentPosition,
  desktopShell,
  durationSeconds,
  enableAiDjRail,
  liveRoom,
  mobileTools,
  nextPreparation,
  onNext,
  onPlaybackChange,
  onPrevious,
  onSeek,
  onShuffle,
  onVolumeChange,
  queueAutoplayEnabled,
  room,
  sessionInsights,
  volume,
}: {
  canControl: boolean;
  currentItem: RoomQueueItem | null;
  currentPosition: number;
  desktopShell: boolean;
  durationSeconds: number;
  enableAiDjRail: boolean;
  liveRoom: LiveRoomState;
  mobileTools?: ReactNode;
  nextPreparation: ReturnType<typeof useNextItemPreparation>;
  onNext(): void;
  onPlaybackChange(status: "paused" | "playing"): void;
  onPrevious(): void;
  onSeek(positionSeconds: number): void;
  onShuffle(): void;
  onVolumeChange(volume: number): void;
  queueAutoplayEnabled: boolean;
  room: RoomSnapshot;
  sessionInsights: ReturnType<typeof buildListenSessionInsights>;
  volume: number;
}) {
  const session = liveRoom.snapshot.session;
  const liveSource = session?.sourceUrl ?? null;
  const liveSourceType = session?.sourceType ?? null;
  const youtubeSource = liveSourceType === "youtube" && liveSource;
  const thumbnailUrl =
    currentItem?.thumbnailUrl ??
    (youtubeSource ? getYouTubeThumbnailUrl(liveSource) : null);
  const title = session?.sourceTitle ?? currentItem?.title ?? room.nowPlaying.title;
  const artist =
    currentItem?.artist ??
    currentItem?.channelName ??
    room.nowPlaying.artist ??
    "Room source";
  const isPlaying = session?.status === "playing";
  const awaitingMedia = !liveSource;
  const progressMax = durationSeconds || Math.max(100, Math.ceil(currentPosition));

  return (
    <aside
      className={cx(
        "relative grid min-h-0 content-start gap-4 overflow-visible border-white/10 bg-transparent p-0 pb-2",
        desktopShell &&
          "h-dvh overflow-hidden border-r bg-surface/94 p-5 pb-6 backdrop-blur-xl",
      )}
    >
      <div className="grid gap-3">
        <PendingLink
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-sm border border-white/10 px-3 text-label-sm font-semibold text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
          href="/"
          loadingDetail="Returning you to the dashboard."
          loadingLabel="Leaving room"
          tone="amber"
        >
          <X className="h-4 w-4" aria-hidden />
          Leave Room
        </PendingLink>
        <div className="flex items-center justify-between gap-3">
          <SignalApertureLockup className="min-w-0" compact />
          <Badge tone="amber">Listen Mode</Badge>
        </div>
      </div>

      <div
        className={cx(
          "relative grid gap-0 overflow-hidden transition-colors duration-1000",
          desktopShell
            ? "max-h-[calc(100dvh-7rem)] rounded-md border border-white/10 shadow-amber-glow"
            : "rounded-none border-0 bg-transparent shadow-none",
        )}
        style={
          desktopShell
            ? {
                background:
                  "radial-gradient(circle at 30% 4%, rgb(var(--listen-primary) / 0.16), transparent 40%), radial-gradient(circle at 88% 48%, rgb(var(--listen-secondary) / 0.11), transparent 38%), linear-gradient(180deg, rgb(var(--listen-primary) / 0.08), rgb(19 19 20 / 0.92))",
                boxShadow: "0 0 34px rgb(var(--listen-shadow) / 0.14)",
              }
            : undefined
        }
      >
        {desktopShell && thumbnailUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external media artwork. */}
            <img
              alt=""
              className="absolute inset-0 h-full w-full scale-125 object-cover opacity-32 blur-3xl saturate-150"
              fetchPriority="high"
              loading="eager"
              src={thumbnailUrl}
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(180deg,rgb(14_14_15_/_0.16),rgb(14_14_15_/_0.82))]"
            />
          </>
        ) : null}
        <div className={cx("relative z-10 grid gap-4 py-1", desktopShell && "p-4")}>
          <div className="relative aspect-square min-h-[13.75rem] overflow-hidden rounded-md border border-white/10 bg-black shadow-[inset_0_0_0_1px_rgb(255_255_255_/_0.04)] xl:max-h-none">
            {thumbnailUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external media artwork. */}
                <img
                  alt=""
                  className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-2xl transition-opacity duration-1000"
                  fetchPriority="high"
                  loading="eager"
                  src={thumbnailUrl}
                />
              </>
            ) : null}

            {youtubeSource ? (
              <YoutubeMediaPlayer
                className="absolute inset-0 h-full w-full bg-black"
                liveRoom={liveRoom}
                mode="listen"
              />
            ) : thumbnailUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external media artwork. */}
                <img
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain"
                  fetchPriority="high"
                  loading="eager"
                  src={thumbnailUrl}
                />
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgb(255_186_32_/_0.28),transparent_34%),linear-gradient(145deg,rgb(42_42_43),rgb(14_14_15))] text-secondary-fixed-dim">
                <Disc3 className="h-20 w-20" aria-hidden />
              </div>
            )}
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-12 bg-[linear-gradient(to_top,rgb(14_14_15_/_0.58),transparent)]"
            />
          </div>

          {!youtubeSource && liveSource ? (
            <DirectMediaPlayer
              className="sr-only"
              liveRoom={liveRoom}
              mode="listen"
            />
          ) : null}

          <div className="grid gap-2">
            <span className="technical-label text-secondary-fixed-dim">
              {awaitingMedia ? "Awaiting media" : "Now Playing"}
            </span>
            <h1 className="text-headline-md font-semibold leading-tight text-on-surface [overflow-wrap:anywhere]">
              {title}
            </h1>
            <p className="truncate text-body-md text-on-surface-variant">
              {artist}
            </p>
            {youtubeSource ? (
              <YouTubeMetadataLine
                showChannel={false}
                sourceUrl={liveSource}
                tone="amber"
              />
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-label-sm text-on-surface-variant">
              <span>{formatSeconds(currentPosition)}</span>
              <Slider
                label="Listen progress"
                max={progressMax}
                min={0}
                onChange={(event) => onSeek(Number(event.currentTarget.value))}
                readOnly={awaitingMedia || !canControl || !durationSeconds}
                tone="amber"
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

            <div className="flex items-center justify-center gap-2">
              <IconButton
                disabled={!canControl}
                label="Shuffle queue"
                onClick={onShuffle}
                variant="ghost"
              >
                <Shuffle className="h-5 w-5" aria-hidden />
              </IconButton>
              <IconButton
                disabled={!canControl}
                label="Previous song"
                onClick={onPrevious}
                variant="ghost"
              >
                <SkipBack className="h-5 w-5" aria-hidden />
              </IconButton>
              <IconButton
                disabled={awaitingMedia || !canControl}
                label={isPlaying ? "Pause" : "Play"}
                onClick={() =>
                  onPlaybackChange(isPlaying ? "paused" : "playing")
                }
                variant="primary"
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" aria-hidden />
                ) : (
                  <Play className="h-5 w-5" aria-hidden />
                )}
              </IconButton>
              <IconButton
                disabled={!canControl}
                label="Next song"
                onClick={onNext}
                variant="ghost"
              >
                <SkipForward className="h-5 w-5" aria-hidden />
              </IconButton>
              <IconButton
                className={cx(
                  queueAutoplayEnabled &&
                    "border-secondary-fixed-dim/45 bg-secondary-fixed-dim/10 text-secondary-fixed-dim",
                )}
                disabled={!canControl}
                label={
                  queueAutoplayEnabled
                    ? "Disable queue autoplay"
                    : "Enable queue autoplay"
                }
                onClick={() => liveRoom.setQueueAutoplay(!queueAutoplayEnabled)}
                variant="ghost"
              >
                <Repeat2 className="h-5 w-5" aria-hidden />
              </IconButton>
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
                  onVolumeChange(Number(event.currentTarget.value))
                }
                tone="amber"
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

        {desktopShell &&
        nextPreparation.status !== "idle" &&
        nextPreparation.target ? (
          <ListenPreparingNextStrip nextPreparation={nextPreparation} />
        ) : null}
      </div>

      {enableAiDjRail ? (
        <div className="min-h-0 overflow-y-auto [scrollbar-color:rgb(255_186_32_/_0.34)_transparent] [scrollbar-width:thin]">
          <ListenAiDjHome compact insights={sessionInsights} placement="rail" />
        </div>
      ) : null}

      {mobileTools && !desktopShell ? <div>{mobileTools}</div> : null}
    </aside>
  );
}

function ListenTechnicalRoomHeader({
  canAddQueue,
  canLoadSource,
  connectionStatus,
  desktopShell,
  historyCount,
  liveRoom,
  onAddQueueItem,
  onLoadSource,
  queueItems,
  queueCount,
  remainingSeconds,
  room,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  connectionStatus: string;
  desktopShell: boolean;
  historyCount: number;
  liveRoom: LiveRoomState;
  onAddQueueItem(input: QueueAddInput): void;
  onLoadSource(input: SourceLoadInput): void;
  queueItems: RoomQueueItem[];
  queueCount: number;
  remainingSeconds: number | null;
  room: RoomSnapshot;
}) {
  const onlineCount = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  ).length;
  const roomName = liveRoom.snapshot.session?.roomName ?? room.name;
  const canRename =
    liveRoom.canManageAuthority && liveRoom.connectionStatus === "connected";
  const [editingName, setEditingName] = useState(roomName);
  const [roomNameDirty, setRoomNameDirty] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const visibleRoomName = roomNameDirty ? editingName : roomName;

  async function commitRoomName() {
    const nextName = visibleRoomName.trim().replace(/\s+/g, " ");

    if (!canRename || !nextName || nextName === roomName || renaming) {
      setEditingName(roomName);
      setRoomNameDirty(false);
      return;
    }

    setRenaming(true);

    try {
      await liveRoom.renameRoom(nextName);
      setRoomNameDirty(false);
    } finally {
      setRenaming(false);
    }
  }

  const stats = [
    `${room.code}`,
    `${onlineCount} connected`,
    "Listen mode",
    `${queueCount} upcoming`,
    remainingSeconds
      ? `${formatQueueRemainingDuration(remainingSeconds)} remaining`
      : null,
    `${historyCount} played`,
  ].filter((stat): stat is string => Boolean(stat));
  const mobileStats = [
    { label: "Code", value: room.code },
    { label: "Online", value: String(onlineCount) },
    { label: "Mode", value: "Listen" },
    { label: "Upcoming", value: String(queueCount) },
    remainingSeconds
      ? {
          label: "Remaining",
          value: formatQueueRemainingDuration(remainingSeconds),
        }
      : null,
    { label: "Played", value: String(historyCount) },
  ].filter(
    (
      stat,
    ): stat is {
      label: string;
      value: string;
    } => Boolean(stat),
  );

  return (
    <section className="relative z-20 border-b border-white/6 bg-surface/72 backdrop-blur-xl">
      <div
        className={cx(
          "grid gap-2 px-4 py-2.5 sm:px-6",
          desktopShell && "px-6 min-[1200px]:px-10",
        )}
      >
        <div
          className={cx(
            "grid gap-3",
            desktopShell &&
              "items-start min-[1200px]:grid-cols-[minmax(0,1fr)_auto] min-[1200px]:items-center",
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="technical-label border-0 p-0 text-secondary-fixed-dim">
                Signal Room
              </span>
              <span className="technical-label border-0 p-0 text-primary-fixed-dim">
                {connectionStatus}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <input
                aria-label="Room name"
                className="min-w-[7rem] max-w-full bg-transparent text-title-md font-semibold leading-tight text-on-surface outline-none transition placeholder:text-on-surface-variant/50 focus:border-b focus:border-secondary-fixed-dim disabled:cursor-default"
                disabled={!canRename || renaming}
                onBlur={commitRoomName}
                onChange={(event) => {
                  setEditingName(event.currentTarget.value);
                  setRoomNameDirty(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }

                  if (event.key === "Escape") {
                    setEditingName(roomName);
                    setRoomNameDirty(false);
                    event.currentTarget.blur();
                  }
                }}
                size={Math.min(Math.max(visibleRoomName.length, 7), 28)}
                value={visibleRoomName}
              />
              {renaming ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-secondary-fixed-dim"
                  aria-hidden
                />
              ) : null}
            </div>
            <p
              aria-live="polite"
              className={cx(
                "mt-1 flex-wrap items-center gap-x-2 gap-y-1 text-label-sm text-on-surface-variant",
                desktopShell ? "flex" : "hidden",
              )}
            >
              {stats.map((stat, index) => (
                <span
                  className="inline-flex items-center gap-1.5 whitespace-nowrap"
                  key={stat}
                >
                  {index > 0 ? <span className="opacity-55">/</span> : null}
                  <span className="transition-colors duration-300">{stat}</span>
                </span>
              ))}
            </p>
            {!desktopShell ? (
              <div className="mt-3 grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3">
              {mobileStats.map((stat) => (
                <div
                  className="rounded-sm border border-white/10 bg-background/38 px-2 py-1.5"
                  key={stat.label}
                >
                  <p className="technical-label border-0 p-0 text-on-surface-variant">
                    {stat.label}
                  </p>
                  <p className="mt-0.5 truncate text-label-sm font-semibold text-on-surface">
                    {stat.value}
                  </p>
                </div>
              ))}
              </div>
            ) : null}
          </div>
          <div
            className={cx(
              "flex-wrap items-center gap-2",
              desktopShell
                ? "flex justify-start min-[1200px]:justify-end"
                : "hidden",
            )}
          >
            <ListenAddMediaPopover
              canAddQueue={canAddQueue}
              canLoadSource={canLoadSource}
              connectionStatus={connectionStatus}
              items={queueItems}
              onAddQueueItem={onAddQueueItem}
              onLoadSource={onLoadSource}
              roomErrors={liveRoom.snapshot.errors}
              roomId={room.id}
            />
            <ListenSavedRoomToggle
              canSave={liveRoom.canManageAuthority}
              compact
              initialSaved={room.isSaved}
              roomId={room.id}
            />
            <InviteActions
              compact
              inviteUrl={room.inviteUrl}
              roomCode={room.code}
            />
          </div>
        </div>
        {desktopShell ? (
          <div>
          <ModeSwitcher
            canSwitch={
              liveRoom.canManageAuthority &&
              liveRoom.connectionStatus === "connected"
            }
            compact
            mode="listen"
            onSwitchMode={liveRoom.switchMode}
          />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ListenPreparingNextStrip({
  nextPreparation,
}: {
  nextPreparation: ReturnType<typeof useNextItemPreparation>;
}) {
  const target = nextPreparation.target;

  if (!target) {
    return null;
  }

  return (
    <div className="relative z-10 grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 border-t border-secondary-fixed-dim/22 bg-secondary-fixed-dim/8 px-4 py-3">
      <QueueArtwork
        className="h-12 w-12 rounded-sm"
        thumbnailUrl={target.thumbnailUrl}
        title={target.title}
      />
      <div className="min-w-0">
        <p className="technical-label border-0 p-0 text-secondary-fixed-dim">
          {formatListenPreparationStatus(nextPreparation.status)}
        </p>
        <p className="mt-1 truncate text-label-sm font-semibold text-on-surface">
          {target.title}
        </p>
      </div>
    </div>
  );
}

function ListenMobileRoomTools({
  activeTab,
  canAddQueue,
  canLoadSource,
  connectionStatus,
  controllerMemberId,
  currentMemberId,
  items,
  liveRoom,
  onAddQueueItem,
  onLoadSource,
  onTabChange,
  roomErrors,
  room,
}: {
  activeTab: "members" | "room";
  canAddQueue: boolean;
  canLoadSource: boolean;
  connectionStatus: string;
  controllerMemberId: string | null;
  currentMemberId?: string | null;
  items: RoomQueueItem[];
  liveRoom: LiveRoomState;
  onAddQueueItem(input: QueueAddInput): void;
  onLoadSource(input: SourceLoadInput): void;
  onTabChange(tab: "members" | "room"): void;
  roomErrors: LiveRoomError[];
  room: RoomSnapshot;
}) {
  const onlineCount = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  ).length;

  return (
    <section className="relative z-20 overflow-hidden rounded-md border border-white/10 bg-surface/82 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)] backdrop-blur-xl xl:hidden">
      <div className="grid grid-cols-2 gap-1 border-b border-white/10 bg-surface-container-lowest/80 p-1">
        {[
          ["room", "Room", room.code],
          ["members", "Members", onlineCount],
        ].map(([tab, label, meta]) => {
          const active = activeTab === tab;

          return (
            <button
              aria-selected={active}
              className={cx(
                "inline-flex h-9 items-center justify-center gap-2 rounded-sm px-3 text-label-sm font-semibold transition",
                active
                  ? "bg-secondary-fixed-dim/12 text-secondary-fixed-dim"
                  : "text-on-surface-variant hover:bg-surface-variant/25 hover:text-on-surface",
              )}
              key={tab}
              onClick={() => onTabChange(tab as "members" | "room")}
              role="tab"
              type="button"
            >
              {label}
              <span className="rounded-sm border border-white/10 bg-surface-container px-1.5 text-[11px] text-on-surface-variant">
                {meta}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "room" ? (
        <div className="grid gap-3 p-3">
          <div className="grid gap-2">
            <ListenAddMediaPopover
              canAddQueue={canAddQueue}
              canLoadSource={canLoadSource}
              connectionStatus={connectionStatus}
              items={items}
              onAddQueueItem={onAddQueueItem}
              onLoadSource={onLoadSource}
              roomErrors={roomErrors}
              roomId={room.id}
            />
            <div className="grid gap-2">
              <ListenSavedRoomToggle
                canSave={liveRoom.canManageAuthority}
                compact
                initialSaved={room.isSaved}
                roomId={room.id}
              />
              <InviteActions
                compact
                inviteUrl={room.inviteUrl}
                roomCode={room.code}
              />
            </div>
          </div>
          <ModeSwitcher
            canSwitch={
              liveRoom.canManageAuthority &&
              liveRoom.connectionStatus === "connected"
            }
            compact
            mode="listen"
            onSwitchMode={liveRoom.switchMode}
          />
        </div>
      ) : (
        <div className="max-h-[min(28rem,60vh)] overflow-y-auto p-3 [scrollbar-color:rgb(255_186_32_/_0.42)_transparent] [scrollbar-width:thin]">
          <MembersPanel
            canManageAuthority={liveRoom.canManageAuthority}
            connectionStatus={liveRoom.connectionStatus}
            controllerMemberId={controllerMemberId}
            currentMemberId={currentMemberId}
            errorMessage={liveRoom.errorMessage}
            grantControl={liveRoom.grantControl}
            kickMember={liveRoom.kickMember}
            onPermissionChange={liveRoom.setPermission}
            participants={liveRoom.participants}
            removeIdleMember={liveRoom.removeIdleMember}
            revokeControl={liveRoom.revokeControl}
          />
        </div>
      )}
    </section>
  );
}

function ListenDiscoveryPanel({
  canAddQueue,
  canLoadSource,
  canPlay,
  currentItem,
  hideAiDjHome,
  items,
  onAddQueueItem,
  onLoadSource,
  onPlayQueueItem,
  room,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  canPlay: boolean;
  currentItem: RoomQueueItem | null;
  hideAiDjHome: boolean;
  items: RoomQueueItem[];
  onAddQueueItem(input: QueueAddInput): void;
  onLoadSource(input: SourceLoadInput): void;
  onPlayQueueItem(queueItemId: string): void;
  room: RoomSnapshot;
}) {
  const [activeFilter, setActiveFilter] =
    useState<ListenDiscoveryTab>("for-you");
  const [providerRecommendations, setProviderRecommendations] =
    useState<{
      key: string;
      response: YouTubeRecommendationResponse;
  } | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const picksRailRef = useRef<HTMLDivElement | null>(null);
  const providerQuery = useMemo(
    () => buildProviderRecommendationQuery(currentItem),
    [currentItem],
  );
  const providerRequestKey = `${activeFilter}:${providerQuery ?? ""}`;
  const providerItems = useMemo(
    () =>
      providerRecommendations?.key === providerRequestKey
        ? providerRecommendations.response.items.map((item) =>
        youtubeMetadataToQueueItem(item, room.currentMember?.name ?? "Provider"),
          )
        : [],
    [providerRecommendations, providerRequestKey, room.currentMember?.name],
  );
  const discovery = useMemo(
    () =>
      buildListenDiscoveryResult({
        activeTab: activeFilter,
        currentItem,
        items,
        providerItems,
        providerUnavailable:
          providerRecommendations?.key === providerRequestKey &&
          (providerRecommendations.response.status === "not-configured" ||
            providerRecommendations.response.status === "unavailable"),
      }),
    [
      activeFilter,
      currentItem,
      items,
      providerItems,
      providerRecommendations,
      providerRequestKey,
    ],
  );
  const sessionInsights = useMemo(
    () => buildListenSessionInsights(items),
    [items],
  );
  const recentlyAdded = useMemo(
    () =>
      items
        .filter((item) => item.status === "queued")
        .slice(-4)
        .reverse(),
    [items],
  );
  const showProviderState =
    activeFilter === "recommended";

  function updatePicksScrollState() {
    const rail = picksRailRef.current;

    if (!rail) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(rail.scrollLeft > 4);
    setCanScrollRight(
      rail.scrollLeft + rail.clientWidth < rail.scrollWidth - 4,
    );
  }

  useEffect(() => {
    let cancelled = false;

    if (activeFilter !== "recommended") {
      return;
    }

    void fetchYouTubeRecommendations({
      kind: activeFilter,
      query: providerQuery,
      roomId: room.id,
    })
      .then((payload) => {
        if (!cancelled) {
          setProviderRecommendations({
            key: providerRequestKey,
            response: payload,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeFilter, providerQuery, providerRequestKey, room.id]);

  useEffect(() => {
    updatePicksScrollState();
  }, [discovery.items.length, activeFilter]);

  function scrollPicks(direction: "left" | "right") {
    const rail = picksRailRef.current;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -rail.clientWidth : rail.clientWidth,
    });
  }

  function handleAddRecommendation(item: RoomQueueItem, isPlayNext = false) {
    onAddQueueItem(queueItemToQueueAddInput(item, { isPlayNext }));
  }

  function handleLoadRecommendation(item: RoomQueueItem) {
    if (item.id.startsWith("provider:")) {
      onLoadSource(queueItemToSourceLoadInput(item));
      return;
    }

    onPlayQueueItem(item.id);
  }

  return (
    <div className="grid auto-rows-max content-start gap-5">
      <section className="overflow-hidden rounded-md border border-white/10 bg-surface-container-lowest/58 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)]">
        <div className="grid gap-3 border-b border-white/10 bg-surface-container-lowest/42 px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-title-md font-semibold text-on-surface">
              Room picks
            </h3>
            <span className="technical-label border-0 p-0 text-on-surface-variant">
              {showProviderState &&
              providerRecommendations?.key !== providerRequestKey
                ? "Checking provider"
                : discovery.sourceLabel}
            </span>
          </div>
          <div className="max-w-full overflow-x-auto">
            <div className="inline-grid min-w-max grid-flow-col overflow-hidden rounded-sm border border-white/10 bg-background/70">
              {[
                ["for-you", "For you"],
                ["recommended", "Recommended"],
                ["top-listened", "Most listened"],
                ["playlist", "From your playlist"],
              ].map(([id, label], index) => (
                <button
                  className={cx(
                    "h-9 shrink-0 border-l border-white/8 px-4 text-label-sm font-semibold transition first:border-l-0",
                    activeFilter === id
                      ? "bg-secondary-fixed-dim/16 text-secondary-fixed-dim shadow-[inset_0_0_0_1px_rgb(255_186_32_/_0.3)]"
                      : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
                    index === 0 && "border-l-0",
                  )}
                  key={id}
                  onClick={() => setActiveFilter(id as ListenDiscoveryTab)}
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {discovery.items.length > 0 ? (
          <div className="relative px-3 py-4 sm:px-4">
            <div
              className="grid snap-x snap-mandatory auto-cols-[100%] grid-flow-col gap-3 overflow-x-auto pb-1 [scrollbar-color:rgb(255_186_32_/_0.42)_transparent] [scrollbar-width:thin] lg:snap-none xl:auto-cols-[minmax(15rem,18rem)] xl:pr-10"
              onScroll={updatePicksScrollState}
              ref={picksRailRef}
            >
              {discovery.items.map((item) => (
                <RecommendationCard
                  canAddQueue={canAddQueue}
                  canLoadSource={canLoadSource}
                  canPlay={canPlay}
                  current={item.id === currentItem?.id}
                  inQueue={!item.id.startsWith("provider:")}
                  item={item}
                  key={item.id}
                  onAddQueue={() => handleAddRecommendation(item)}
                  onLoadNow={() => handleLoadRecommendation(item)}
                  onPlayNext={() => handleAddRecommendation(item, true)}
                />
              ))}
            </div>
            {canScrollLeft ? (
              <div className="pointer-events-none absolute inset-y-0 left-3 flex w-14 items-center justify-start bg-[linear-gradient(270deg,transparent,rgb(14_14_15_/_0.76)_62%,rgb(14_14_15_/_0.94))] sm:left-4">
                <button
                  aria-label="Scroll room picks left"
                  className="pointer-events-auto ml-2 inline-flex h-9 w-8 items-center justify-center rounded-sm border border-secondary-fixed-dim/25 bg-background/85 text-secondary-fixed-dim shadow-[0_0_16px_rgb(255_186_32_/_0.08)] transition hover:bg-secondary-fixed-dim/12"
                  onClick={() => scrollPicks("left")}
                  type="button"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}
            {canScrollRight ? (
              <div className="pointer-events-none absolute inset-y-0 right-3 flex w-14 items-center justify-end bg-[linear-gradient(90deg,transparent,rgb(14_14_15_/_0.76)_62%,rgb(14_14_15_/_0.94))] sm:right-4">
                <button
                  aria-label="Scroll room picks right"
                  className="pointer-events-auto mr-2 inline-flex h-9 w-8 items-center justify-center rounded-sm border border-secondary-fixed-dim/25 bg-background/85 text-secondary-fixed-dim shadow-[0_0_16px_rgb(255_186_32_/_0.08)] transition hover:bg-secondary-fixed-dim/12"
                  onClick={() => scrollPicks("right")}
                  type="button"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="p-3 sm:p-4">
            <EmptyListenPanel>{discovery.emptyMessage}</EmptyListenPanel>
          </div>
        )}
        {showProviderState &&
        providerRecommendations?.key === providerRequestKey &&
        providerRecommendations.response.reason &&
        providerRecommendations.response.source === "unavailable" ? (
          <p className="border-t border-white/10 px-4 py-3 text-label-sm text-on-surface-variant">
            {providerRecommendations.response.reason}
          </p>
        ) : null}
      </section>

      {!hideAiDjHome ? <ListenAiDjHome insights={sessionInsights} /> : null}

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-title-md font-semibold text-on-surface">
            Recently added
          </h3>
          <span className="text-label-sm text-on-surface-variant">
            {room.code}
          </span>
        </div>
        <div className="overflow-hidden rounded-md border border-white/10 bg-surface/55">
          {recentlyAdded.length > 0 ? (
            recentlyAdded.map((item, index) => (
              <RecentItemRow
                canPlay={canPlay}
                item={item}
                key={item.id}
                minutesAgo={index * 3 + 2}
                onPlay={() => onPlayQueueItem(item.id)}
              />
            ))
          ) : (
            <p className="p-4 text-body-md text-on-surface-variant">
              Newly queued songs will appear here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ListenAddMediaPopover({
  canAddQueue,
  canLoadSource,
  connectionStatus,
  items,
  onAddQueueItem,
  onLoadSource,
  roomErrors,
  roomId,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  connectionStatus: string;
  items: RoomQueueItem[];
  onAddQueueItem(input: QueueAddInput): void;
  onLoadSource(input: SourceLoadInput): void;
  roomErrors: LiveRoomError[];
  roomId: string;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [notifications, setNotifications] = useState<ListenNotification[]>([]);
  const [pendingDuplicateInput, setPendingDuplicateInput] =
    useState<QueueAddInput | null>(null);
  const [pendingDuplicatePlaylist, setPendingDuplicatePlaylist] = useState<{
    items: PlaylistPreviewItem[];
    label: string;
  } | null>(null);
  const [playlistPreview, setPlaylistPreview] =
    useState<PlaylistPreview | null>(null);
  const [playlistReviewOpen, setPlaylistReviewOpen] = useState(false);
  const [singlePreview, setSinglePreview] = useState<QueueAddInput | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    () => new Set(),
  );
  const notifiedRoomErrorIds = useRef<Set<string> | null>(null);
  const [url, setUrl] = useState("");
  const addDisabled = !canAddQueue || connectionStatus !== "connected";
  const loadDisabled = !canLoadSource || connectionStatus !== "connected";
  const duplicateSourceUrls = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.sourceUrl)
          .filter((sourceUrl): sourceUrl is string => Boolean(sourceUrl)),
      ),
    [items],
  );
  const duplicateVideoIds = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.videoId)
          .filter((videoId): videoId is string => Boolean(videoId)),
      ),
    [items],
  );
  const [duplicatePreference, setDuplicatePreference] = useState<
    "allow" | "warn"
  >(() =>
    typeof window !== "undefined" &&
    window.localStorage.getItem("mw_queue_duplicate_preference") === "allow"
      ? "allow"
      : "warn",
  );
  const hasPreviewState = Boolean(url.trim() || singlePreview || playlistPreview);

  useEffect(() => {
    if (notifiedRoomErrorIds.current === null) {
      notifiedRoomErrorIds.current = new Set(
        roomErrors.map((error) => error.errorId),
      );
      return;
    }

    const seen = notifiedRoomErrorIds.current;

    for (const error of roomErrors) {
      if (seen.has(error.errorId)) {
        continue;
      }

      seen.add(error.errorId);
      notify(error.message, roomErrorToneBySeverity[error.severity]);
    }
  }, [roomErrors]);

  function notify(
    message: string,
    tone: ListenNotification["tone"] = "info",
  ) {
    const id = window.crypto.randomUUID();

    setNotifications((current) => [...current.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setNotifications((current) =>
        current.filter((notification) => notification.id !== id),
      );
    }, 4200);
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      const resetTimer = window.setTimeout(() => {
        setSinglePreview(null);
        setPlaylistPreview(null);
        setSelectedPlaylistIds(new Set());
        setPreviewLoading(false);
      }, 0);

      return () => window.clearTimeout(resetTimer);
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setErrorMessage(null);
      setImportSummary(null);
      setPreviewLoading(true);

      if (detectUrlType(trimmedUrl) === "youtube-playlist") {
        setSinglePreview(null);
        void detectPlaylist(trimmedUrl, false).finally(() => {
          if (!cancelled) {
            setPreviewLoading(false);
          }
        });
        return;
      }

      setPlaylistPreview(null);
      setSelectedPlaylistIds(new Set());
      const result = validateMediaSourceForMode(trimmedUrl, "listen");

      if (!result.valid) {
        setSinglePreview(null);
        setErrorMessage(result.message);
        notify(result.message, "error");
        setPreviewLoading(false);
        return;
      }

      void checkYouTubeInput({
        sourceTitle: result.title,
        sourceType: result.kind,
        sourceUrl: result.url,
      })
        .then((checkedInput) => {
          if (!cancelled) {
            setSinglePreview(checkedInput);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSinglePreview(null);
            setErrorMessage("Preview failed. Check the URL and try again.");
            notify("Provider preview failed.", "error");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setPreviewLoading(false);
          }
        });
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, url]);

  function clearAddMediaState() {
    setUrl("");
    setSinglePreview(null);
    setPendingDuplicateInput(null);
    setPendingDuplicatePlaylist(null);
    setErrorMessage(null);
    setImportSummary(null);
    setPlaylistPreview(null);
    setPlaylistReviewOpen(false);
    setSelectedPlaylistIds(new Set());
  }

  async function detectPlaylist(input: string, openReview = false) {
    const parsed = parseYouTubePlaylist(input);

    if (!parsed) {
      setPlaylistPreview(null);
      setSelectedPlaylistIds(new Set());
      return null;
    }

    setErrorMessage(null);
    setImportSummary(null);
    setIsImportingPlaylist(true);

    try {
      const payload = await fetchPlaylistPreview(input, roomId);

      setPlaylistPreview(payload);
      setSelectedPlaylistIds(
        new Set(
          payload.items
            .filter((item) => !item.isUnavailable)
            .map((item) => item.videoId),
        ),
      );

      if (payload.status !== "available") {
        setErrorMessage(
          payload.reason ??
            "Playlist import is unavailable. You can still add a direct video URL.",
        );
      } else if (openReview && payload.items.length > 0) {
        setIsOpen(false);
        setPlaylistReviewOpen(true);
      }

      return payload;
    } catch {
      setErrorMessage("Playlist import failed. Try the playlist again.");
      notify("Playlist preview failed.", "error");
      setPlaylistPreview(null);
      setSelectedPlaylistIds(new Set());
      return null;
    } finally {
      setIsImportingPlaylist(false);
    }
  }

  function parseMediaUrl() {
    setErrorMessage(null);
    setImportSummary(null);

    if (detectUrlType(url) === "youtube-playlist") {
      void detectPlaylist(url, true);
      return null;
    }

    const result = validateMediaSourceForMode(url, "listen");

    if (!result.valid) {
      setErrorMessage(result.message);
      return null;
    }

    return {
      sourceTitle: result.title,
      sourceType: result.kind,
      sourceUrl: result.url,
    } satisfies SourceLoadInput;
  }

  async function checkYouTubeInput(input: SourceLoadInput) {
    if (input.sourceType !== "youtube") {
      return input;
    }

    const metadata = await fetchYouTubeMetadata(input.sourceUrl);

    if (metadata.availability?.playable === false) {
      setErrorMessage(metadata.availability.reason);
      return null;
    }

    return {
      ...input,
      artist: metadata.metadata?.channelTitle ?? undefined,
      channelName: metadata.metadata?.channelTitle ?? undefined,
      durationSeconds: metadata.metadata?.durationSeconds ?? undefined,
      sourceTitle: metadata.metadata?.title ?? input.sourceTitle,
      thumbnailUrl: metadata.metadata?.thumbnailUrl ?? undefined,
    } satisfies QueueAddInput;
  }

  async function addSingle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = singlePreview ?? parseMediaUrl();

    if (!input) {
      return;
    }

    const checkedInput = singlePreview ?? (await checkYouTubeInput(input));

    if (!checkedInput) {
      return;
    }

    if (
      duplicateSourceUrls.has(checkedInput.sourceUrl) &&
      duplicatePreference === "warn"
    ) {
      setPendingDuplicateInput(checkedInput);
      setErrorMessage(
        "Duplicate detected. Add anyway only if you want this source repeated.",
      );
      notify("Duplicate detected. Confirm whether to add it again.", "warning");
      return;
    }

    onAddQueueItem({
      ...checkedInput,
      allowDuplicate: duplicateSourceUrls.has(checkedInput.sourceUrl),
    });
    notify(`Added to queue: ${checkedInput.sourceTitle}`, "success");
    clearAddMediaState();
    setIsOpen(false);
  }

  async function loadSingle() {
    const input = singlePreview ?? parseMediaUrl();

    if (!input) {
      return;
    }

    const checkedInput = singlePreview ?? (await checkYouTubeInput(input));

    if (!checkedInput) {
      return;
    }

    onLoadSource(checkedInput);
    notify(`Loaded source: ${checkedInput.sourceTitle}`, "success");
    clearAddMediaState();
    setIsOpen(false);
  }

  function isDuplicatePlaylistItem(item: PlaylistPreviewItem) {
    return (
      duplicateSourceUrls.has(item.sourceUrl) ||
      duplicateVideoIds.has(item.videoId)
    );
  }

  function importPlaylistItems(
    items: PlaylistPreviewItem[],
    label: string,
    options: { allowDuplicates?: boolean; skipDuplicates?: boolean } = {},
  ) {
    if (!playlistPreview || addDisabled) {
      return;
    }

    const duplicates = items.filter(
      (item) => !item.isUnavailable && isDuplicatePlaylistItem(item),
    );

    if (
      duplicates.length > 0 &&
      duplicatePreference === "warn" &&
      !options.allowDuplicates &&
      !options.skipDuplicates
    ) {
      setPendingDuplicatePlaylist({ items, label });
      setErrorMessage(
        `${duplicates.length} duplicate playlist item${
          duplicates.length === 1 ? "" : "s"
        } detected.`,
      );
      notify(`${duplicates.length} duplicate playlist items detected.`, "warning");
      return;
    }

    const playableItems = items.filter(
      (item) =>
        !item.isUnavailable &&
        (!options.skipDuplicates || !isDuplicatePlaylistItem(item)),
    );
    let added = 0;

    playableItems.forEach((item) => {
      onAddQueueItem({
        allowDuplicate: isDuplicatePlaylistItem(item),
        artist: item.channelTitle ?? undefined,
        channelName: item.channelTitle ?? undefined,
        durationSeconds: item.durationSeconds ?? undefined,
        isUnavailable: item.isUnavailable,
        playlistId: playlistPreview.playlistId ?? undefined,
        playlistTitle: playlistPreview.playlistTitle ?? undefined,
        sourceTitle: item.title,
        sourceType: "youtube",
        sourceUrl: item.sourceUrl,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
      });
      added += 1;
    });

    setImportSummary(
      `Added ${added} ${label} from playlist. Skipped ${
        items.length - playableItems.length
      } unavailable or duplicate.`,
    );
    notify(`Added ${added} ${label} from playlist.`, "success");
    setUrl("");
    setPlaylistPreview(null);
    setPlaylistReviewOpen(false);
    setSelectedPlaylistIds(new Set());
  }

  function importPlaylist() {
    if (!playlistPreview) {
      return;
    }

    importPlaylistItems(playlistPreview.items, "tracks");
  }

  function importSelectedPlaylistItems() {
    if (!playlistPreview) {
      return;
    }

    const selectedItems = playlistPreview.items.filter((item) =>
      selectedPlaylistIds.has(playlistItemKey(item)),
    );

    importPlaylistItems(selectedItems, "selected tracks");
  }

  return (
    <div className="relative w-full sm:w-auto">
      <Button
        className="w-full border border-secondary-fixed-dim/45 bg-secondary-fixed-dim text-on-secondary-fixed shadow-[0_0_28px_rgb(255_186_32_/_0.14)] hover:bg-secondary-fixed sm:w-auto"
        onClick={() => setIsOpen((open) => !open)}
        size="md"
        type="button"
        variant="secondary"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Add Media
      </Button>
      {notifications.length > 0 ? (
        <div
          aria-live="polite"
          className="fixed bottom-4 right-4 z-[130] grid w-[min(22rem,calc(100vw-2rem))] gap-2"
        >
          {notifications.map((notification) => (
            <div
              className={cx(
                "rounded-md border bg-surface/95 p-3 text-label-sm shadow-[0_0_32px_rgb(0_0_0_/_0.38)] backdrop-blur-xl",
                notification.tone === "success" &&
                  "border-primary-fixed-dim/35 text-primary-fixed-dim",
                notification.tone === "warning" &&
                  "border-secondary-fixed-dim/35 text-secondary-fixed-dim",
                notification.tone === "error" && "border-error/40 text-error",
                notification.tone === "info" &&
                  "border-white/10 text-on-surface-variant",
              )}
              key={notification.id}
              role={notification.tone === "error" ? "alert" : "status"}
            >
              {notification.message}
            </div>
          ))}
        </div>
      ) : null}
      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[120] grid place-items-center bg-background/72 p-4 backdrop-blur-xl">
        <div className="grid max-h-[min(42rem,calc(100dvh-2rem))] w-full max-w-2xl gap-3 overflow-y-auto rounded-lg border border-white/10 bg-surface/95 p-4 shadow-[0_0_48px_rgb(0_0_0_/_0.42)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-body-lg font-semibold text-on-surface">
                Add from link
              </h3>
              <p className="text-label-sm text-on-surface-variant">
                YouTube, YouTube Music, direct audio, or HLS.
              </p>
            </div>
            <button
              aria-label="Close add media"
              className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant hover:text-on-surface"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <form className="grid gap-2" onSubmit={addSingle}>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input
                className="h-11 rounded-sm border border-white/10 bg-surface-container-low px-3 text-body-md text-on-surface outline-none transition placeholder:text-on-surface-variant/55 focus:border-secondary-fixed-dim focus:ring-2 focus:ring-secondary-fixed-dim/15"
                disabled={!canAddQueue && !canLoadSource}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setImportSummary(null);
                  setSinglePreview(null);
                  if (detectUrlType(event.target.value) !== "youtube-playlist") {
                    setPlaylistPreview(null);
                    setSelectedPlaylistIds(new Set());
                  }
                }}
                placeholder="YouTube / YouTube Music link"
                value={url}
              />
              {hasPreviewState ? (
                <Button onClick={clearAddMediaState} type="button" variant="ghost">
                  Clear
                </Button>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-label-sm text-on-surface-variant">
                Links preview automatically before changing the queue.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={addDisabled || isImportingPlaylist || !singlePreview}
                  size="sm"
                  type="submit"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add to Queue
                </Button>
                <Button
                  disabled={loadDisabled || isImportingPlaylist || !singlePreview}
                  onClick={() => void loadSingle()}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <Play className="h-4 w-4" aria-hidden />
                  Load Now
                </Button>
              </div>
            </div>
          </form>
          {isImportingPlaylist || previewLoading ? (
            <p className="inline-flex items-center gap-2 text-label-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading preview
            </p>
          ) : null}
          {singlePreview ? (
            <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 rounded-md border border-white/10 bg-surface-container-low p-3">
              <QueueArtwork
                className="h-14 w-14"
                thumbnailUrl={singlePreview.thumbnailUrl}
                title={singlePreview.sourceTitle}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="amber">Single preview</Badge>
                  {duplicateSourceUrls.has(singlePreview.sourceUrl) ? (
                    <Badge tone="amber">Duplicate</Badge>
                  ) : null}
                </div>
                <p className="mt-2 truncate text-body-md font-semibold text-on-surface">
                  {singlePreview.sourceTitle}
                </p>
                <p className="truncate text-label-sm text-on-surface-variant">
                  {singlePreview.channelName ??
                    singlePreview.artist ??
                    singlePreview.sourceType}
                  {singlePreview.durationSeconds
                    ? ` / ${formatDurationSeconds(singlePreview.durationSeconds)}`
                    : ""}
                </p>
              </div>
            </div>
          ) : null}
          {playlistPreview ? (
            <div className="grid gap-3 rounded-md border border-secondary-fixed-dim/25 bg-surface-container-low p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge tone="amber">Playlist detected</Badge>
                  <p className="mt-2 truncate text-body-md font-semibold text-on-surface">
                    {playlistPreview.playlistTitle ?? "YouTube playlist"}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {selectedPlaylistIds.size} selected /{" "}
                    {
                      playlistPreview.items.filter((item) => !item.isUnavailable)
                        .length
                    }{" "}
                    playable
                  </p>
                </div>
                <Button
                  disabled={addDisabled || playlistPreview.items.length === 0}
                  onClick={() => {
                    setIsOpen(false);
                    setPlaylistReviewOpen(true);
                  }}
                  size="sm"
                  type="button"
                >
                  <ListMusic className="h-4 w-4" aria-hidden />
                  Review Playlist
                </Button>
              </div>
            </div>
          ) : null}
          {importSummary ? (
            <p className="text-label-sm text-primary-fixed-dim" role="status">
              {importSummary}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="text-label-sm text-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
          {pendingDuplicateInput ? (
            <div className="grid gap-3 rounded-md border border-secondary-fixed-dim/35 bg-secondary-fixed-dim/10 p-3">
              <p className="text-body-md font-semibold text-on-surface">
                {pendingDuplicateInput.sourceTitle} is already in the queue.
              </p>
              <label className="inline-flex items-center gap-2 text-label-sm text-on-surface-variant">
                <input
                  className="accent-secondary-fixed-dim"
                  onChange={(event) => {
                    if (event.currentTarget.checked) {
                      window.localStorage.setItem(
                        "mw_queue_duplicate_preference",
                        "allow",
                      );
                      setDuplicatePreference("allow");
                    }
                  }}
                  type="checkbox"
                />
                Remember my choice
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setPendingDuplicateInput(null)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    onAddQueueItem({
                      ...pendingDuplicateInput,
                      allowDuplicate: true,
                    });
                    notify(
                      `Duplicate added: ${pendingDuplicateInput.sourceTitle}`,
                      "warning",
                    );
                    setPendingDuplicateInput(null);
                    setErrorMessage(null);
                    setUrl("");
                    setIsOpen(false);
                  }}
                  size="sm"
                  type="button"
                >
                  Add anyway
                </Button>
              </div>
            </div>
          ) : null}
          {pendingDuplicatePlaylist ? (
            <div className="grid gap-3 rounded-md border border-secondary-fixed-dim/35 bg-secondary-fixed-dim/10 p-3">
              <p className="text-body-md font-semibold text-on-surface">
                Duplicate playlist entries detected.
              </p>
              <p className="text-label-sm text-on-surface-variant">
                Add the clean playlist items only, or add duplicates anyway.
              </p>
              <label className="inline-flex items-center gap-2 text-label-sm text-on-surface-variant">
                <input
                  className="accent-secondary-fixed-dim"
                  onChange={(event) => {
                    if (event.currentTarget.checked) {
                      window.localStorage.setItem(
                        "mw_queue_duplicate_preference",
                        "allow",
                      );
                      setDuplicatePreference("allow");
                    }
                  }}
                  type="checkbox"
                />
                Remember my choice
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  onClick={() => setPendingDuplicatePlaylist(null)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    importPlaylistItems(
                      pendingDuplicatePlaylist.items,
                      pendingDuplicatePlaylist.label,
                      { skipDuplicates: true },
                    );
                    setPendingDuplicatePlaylist(null);
                  }}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  Add without duplicates
                </Button>
                <Button
                  onClick={() => {
                    importPlaylistItems(
                      pendingDuplicatePlaylist.items,
                      pendingDuplicatePlaylist.label,
                      { allowDuplicates: true },
                    );
                    notify("Duplicate playlist items added anyway.", "warning");
                    setPendingDuplicatePlaylist(null);
                  }}
                  size="sm"
                  type="button"
                >
                  Add anyway
                </Button>
              </div>
            </div>
          ) : null}
        </div>
            </div>,
            document.body,
          )
        : null}
      {playlistReviewOpen && playlistPreview ? (
        <ListenPlaylistReviewOverlay
          addDisabled={addDisabled}
          duplicateSourceUrls={duplicateSourceUrls}
          duplicateVideoIds={duplicateVideoIds}
          onClose={() => setPlaylistReviewOpen(false)}
          onImportAll={importPlaylist}
          onImportSelected={importSelectedPlaylistItems}
          onSelectionChange={setSelectedPlaylistIds}
          preview={playlistPreview}
          selectedIds={selectedPlaylistIds}
        />
      ) : null}
    </div>
  );
}

function ListenPlaylistReviewOverlay({
  addDisabled,
  duplicateSourceUrls,
  duplicateVideoIds,
  onClose,
  onImportAll,
  onImportSelected,
  onSelectionChange,
  preview,
  selectedIds,
}: {
  addDisabled: boolean;
  duplicateSourceUrls: Set<string>;
  duplicateVideoIds: Set<string>;
  onClose(): void;
  onImportAll(): void;
  onImportSelected(): void;
  onSelectionChange(ids: Set<string>): void;
  preview: PlaylistPreview;
  selectedIds: Set<string>;
}) {
  const [durationFilter, setDurationFilter] = useState("all");
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<
    "duplicate" | "duration" | "original" | "title"
  >("original");
  const portalRoot =
    typeof document === "undefined" ? null : document.body;
  const playableItems = preview.items.filter((item) => !item.isUnavailable);
  const isDuplicateItem = (item: PlaylistPreviewItem) =>
    duplicateSourceUrls.has(item.sourceUrl) ||
    duplicateVideoIds.has(item.videoId);
  const duplicateCount = playableItems.filter(isDuplicateItem).length;
  const visibleItems = playableItems
    .filter((item) => {
      const searchable =
        `${item.title} ${item.channelTitle ?? ""}`.toLowerCase();
      const durationLimit =
        durationFilter === "short"
          ? 180
          : durationFilter === "medium"
            ? 360
            : durationFilter === "long"
              ? 600
              : null;

      return (
        searchable.includes(query.toLowerCase()) &&
        (durationLimit === null ||
          !item.durationSeconds ||
          item.durationSeconds <= durationLimit)
      );
    })
    .sort((first, second) => {
      if (sortMode === "title") {
        return first.title.localeCompare(second.title);
      }

      if (sortMode === "duration") {
        return (first.durationSeconds ?? 0) - (second.durationSeconds ?? 0);
      }

      if (sortMode === "duplicate") {
        return Number(isDuplicateItem(second)) - Number(isDuplicateItem(first));
      }

      return first.position - second.position;
    });
  const allSelected =
    playableItems.length > 0 &&
    playableItems.every((item) => selectedIds.has(playlistItemKey(item)));

  function toggleItem(itemKey: string) {
    const next = new Set(selectedIds);

    if (next.has(itemKey)) {
      next.delete(itemKey);
    } else {
      next.add(itemKey);
    }

    onSelectionChange(next);
  }

  function setAllSelected(selected: boolean) {
    onSelectionChange(
      selected
        ? new Set(playableItems.map((item) => playlistItemKey(item)))
        : new Set(),
    );
  }

  const overlay = (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-background/78 px-4 py-4 backdrop-blur-md"
      role="dialog"
    >
      <div className="grid h-[min(86vh,44rem)] w-full max-w-3xl grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden rounded-md border border-secondary-fixed-dim/25 bg-surface/96 shadow-[0_0_48px_rgb(255_186_32_/_0.12)]">
        <div className="flex min-h-0 flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            <Badge tone="amber">Playlist review</Badge>
            <h3 className="mt-2 truncate text-title-md font-semibold text-on-surface">
              {preview.playlistTitle ?? "YouTube playlist"}
            </h3>
            <p className="text-label-sm text-on-surface-variant">
              {selectedIds.size} selected / {playableItems.length} playable
              {preview.skippedUnavailable
                ? ` / ${preview.skippedUnavailable} unavailable skipped`
                : ""}
              {duplicateCount ? ` / ${duplicateCount} duplicate` : ""}
            </p>
          </div>
          <button
            aria-label="Close playlist review"
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {preview.status !== "available" ? (
          <div className="row-span-2 p-4 text-body-md text-error">
            {preview.reason ?? "Playlist import is unavailable right now."}
          </div>
        ) : (
          <>
            <div className="flex min-h-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-surface-container-lowest/75 p-3">
              <div className="grid min-w-0 flex-1 gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <label className="relative min-w-0">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
                    aria-hidden
                  />
                  <input
                    className="h-9 w-full rounded-sm border border-white/10 bg-surface-container px-9 text-label-sm text-on-surface outline-none placeholder:text-on-surface-variant/55 focus:border-secondary-fixed-dim"
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    placeholder="Search playlist"
                    value={query}
                  />
                </label>
                <select
                  className="h-9 rounded-sm border border-white/10 bg-surface-container px-2 text-label-sm text-on-surface outline-none focus:border-secondary-fixed-dim"
                  onChange={(event) =>
                    setSortMode(event.currentTarget.value as typeof sortMode)
                  }
                  value={sortMode}
                >
                  <option value="original">Original</option>
                  <option value="title">Title</option>
                  <option value="duration">Duration</option>
                  <option value="duplicate">Duplicates</option>
                </select>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-white/10 px-3 text-label-sm font-semibold text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
                  onClick={() => setMoreOptionsOpen((open) => !open)}
                  type="button"
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  More
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-9 items-center gap-2 rounded-sm border border-white/10 px-3 text-label-sm font-semibold text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
                  onClick={() => setAllSelected(!allSelected)}
                  type="button"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  {allSelected ? "Clear selection" : "Select all"}
                </button>
                <Button
                  disabled={addDisabled || playableItems.length === 0}
                  onClick={onImportAll}
                  size="sm"
                  type="button"
                >
                  <ListMusic className="h-4 w-4" aria-hidden />
                  Add All
                </Button>
                <Button
                  disabled={addDisabled || selectedIds.size === 0}
                  onClick={onImportSelected}
                  size="sm"
                  type="button"
                  variant="secondary"
                >
                  <Check className="h-4 w-4" aria-hidden />
                  Add Selected
                </Button>
              </div>
            </div>
            {moreOptionsOpen ? (
              <div className="border-b border-white/10 bg-surface-container p-3 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
                <div className="grid gap-2 rounded-sm border border-secondary-fixed-dim/25 bg-surface-container-low p-3">
                <span className="technical-label text-secondary-fixed-dim">
                  Duration filter
                </span>
                <div className="flex flex-wrap items-center gap-2">
                {[
                  ["all", "Any length"],
                  ["short", "Under 3 min"],
                  ["medium", "Under 6 min"],
                  ["long", "Under 10 min"],
                ].map(([value, label]) => (
                  <button
                    aria-pressed={durationFilter === value}
                    className={cx(
                      "rounded-sm border px-2 py-1 text-label-sm transition",
                      durationFilter === value
                        ? "border-secondary-fixed-dim/40 bg-secondary-fixed-dim/10 text-secondary-fixed-dim"
                        : "border-white/10 text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
                    )}
                    key={value}
                    onClick={() => setDurationFilter(value)}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
                </div>
                </div>
              </div>
            ) : null}
            <div className="min-h-0 overflow-y-auto p-3">
              <div className="grid gap-2">
                {visibleItems.map((item) => {
                  const itemKey = playlistItemKey(item);
                  const selected = selectedIds.has(itemKey);
                  const unavailable = item.isUnavailable;
                  const duplicate = isDuplicateItem(item);

                  return (
                    <label
                      className={cx(
                        "grid min-h-16 grid-cols-[auto_3rem_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border p-2 transition",
                        unavailable
                          ? "cursor-not-allowed border-white/10 bg-surface-container-low opacity-55"
                          : selected
                          ? "border-secondary-fixed-dim/35 bg-secondary-fixed-dim/10"
                          : "border-white/10 bg-surface-container-low hover:border-white/20",
                      )}
                      key={itemKey}
                    >
                      <input
                        checked={selected}
                        className="accent-secondary-fixed-dim"
                        disabled={unavailable}
                        onChange={() => {
                          if (!unavailable) {
                            toggleItem(itemKey);
                          }
                        }}
                        type="checkbox"
                      />
                      <QueueArtwork
                        className="h-12 w-12"
                        thumbnailUrl={item.thumbnailUrl}
                        title={item.title}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-body-md font-semibold text-on-surface">
                          {item.title}
                        </span>
                        <span className="block truncate text-label-sm text-on-surface-variant">
                          {item.channelTitle ?? "YouTube"}
                        </span>
                      </span>
                      <span className="grid justify-items-end gap-1 text-right">
                        <span className="technical-label text-on-surface-variant">
                          {item.position}
                        </span>
                        {unavailable ? (
                          <Badge tone="amber">
                            {getYouTubeAvailabilityLabel(item.availability)}
                          </Badge>
                        ) : duplicate ? (
                          <Badge tone="amber">Duplicate</Badge>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  if (!portalRoot) {
    return null;
  }

  return createPortal(overlay, portalRoot);
}

function ListenRoomSidebar({
  collapsed,
  currentMemberId,
  liveRoom,
  onCollapsedChange,
}: {
  collapsed: boolean;
  currentMemberId?: string | null;
  liveRoom: LiveRoomState;
  onCollapsedChange(collapsed: boolean): void;
}) {
  const panelNamespace = useId();
  const onlineParticipants = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  );
  const controllerMemberId =
    liveRoom.participants.find((participant) => participant.isController)?.id ??
    null;

  if (collapsed) {
    return (
      <aside className="grid h-dvh min-h-0 content-start border-l border-white/10 bg-surface/94 p-2 backdrop-blur-xl transition-[width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
        <button
          aria-label="Open members sidebar"
          className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-sm border border-white/10 text-secondary-fixed-dim transition hover:bg-secondary-fixed-dim/10"
          onClick={() => onCollapsedChange(false)}
          type="button"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <div className="grid justify-items-center gap-2">
          {onlineParticipants.slice(0, 7).map((participant) => (
            <Avatar
              avatarKey={participant.avatarKey}
              className="h-9 w-9"
              crowned={participant.role === "host"}
              key={participant.id}
              name={participant.name}
              seed={participant.id}
              status={participant.status}
              title={participant.name}
            />
          ))}
          {onlineParticipants.length > 7 ? (
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 bg-surface-container text-[11px] font-semibold text-on-surface-variant">
              +{onlineParticipants.length - 7}
            </span>
          ) : null}
        </div>
      </aside>
    );
  }

  return (
    <aside className="grid h-dvh min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden border-l border-white/10 bg-surface/92 p-5 backdrop-blur-xl transition-[width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
      <div className="rounded-md border border-white/10 bg-surface-container-lowest p-1">
        <div className="flex h-9 items-center justify-between gap-2 rounded-sm bg-secondary-fixed-dim/10 px-2 text-label-sm font-semibold text-secondary-fixed-dim">
          <span className="px-1">Members</span>
          <span className="rounded-sm border border-white/10 bg-surface-container px-1.5 text-[11px] text-on-surface">
            {onlineParticipants.length}
          </span>
          <button
            aria-label="Collapse members sidebar"
            className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
            onClick={() => onCollapsedChange(true)}
            type="button"
          >
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div
        className="min-h-0 min-w-0 overflow-y-auto [scrollbar-color:rgb(255_186_32_/_0.32)_transparent] [scrollbar-width:thin]"
        id={`${panelNamespace}-members-panel`}
      >
        <MembersPanel
          canManageAuthority={liveRoom.canManageAuthority}
          connectionStatus={liveRoom.connectionStatus}
          controllerMemberId={controllerMemberId}
          currentMemberId={currentMemberId}
          errorMessage={liveRoom.errorMessage}
          grantControl={liveRoom.grantControl}
          kickMember={liveRoom.kickMember}
          onPermissionChange={liveRoom.setPermission}
          participants={liveRoom.participants}
          removeIdleMember={liveRoom.removeIdleMember}
          revokeControl={liveRoom.revokeControl}
        />
      </div>
    </aside>
  );
}

function ListenQueueDrawer({
  canAddQueue,
  canManageQueue,
  currentItem,
  desktopShell,
  isConnected,
  items,
  nextPreparation,
  onAddQueueItem,
  onClearQueue,
  onMoveQueueItem,
  onPinnedFirst,
  onPlayQueueItem,
  onQueueItemPriorityChange,
  onRemoveQueueItem,
  onShuffle,
  onSmartShuffle,
  queuedItems,
  remainingSeconds,
  rightSidebarCollapsed,
}: {
  canAddQueue: boolean;
  canManageQueue: boolean;
  currentItem: RoomQueueItem | null;
  desktopShell: boolean;
  isConnected: boolean;
  items: RoomQueueItem[];
  nextPreparation: ReturnType<typeof useNextItemPreparation>;
  onAddQueueItem(input: QueueAddInput): void;
  onClearQueue(): void;
  onMoveQueueItem(queueItemId: string, position: number): void;
  onPinnedFirst(): void;
  onPlayQueueItem(queueItemId: string): void;
  onQueueItemPriorityChange(
    queueItemId: string,
    input: { isPinned?: boolean; isPlayNext?: boolean },
  ): void;
  onRemoveQueueItem(queueItemId: string): void;
  onShuffle(): void;
  onSmartShuffle(): void;
  queueMode: QueueMode;
  queuedItems: RoomQueueItem[];
  remainingSeconds: number | null;
  rightSidebarCollapsed: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<"history" | "queue">("queue");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState<number>(
    DEFAULT_LISTEN_DRAWER_HEIGHT,
  );
  const queueViewItems = items.filter(
    (item) => item.status === "now" || item.status === "queued",
  );
  const historyItems = items.filter((item) => item.status === "played");
  const baseVisibleItems =
    drawerView === "history" ? historyItems : queueViewItems;
  const visibleItems = baseVisibleItems.filter((item) => {
    const searchable = `${item.title} ${item.artist ?? ""} ${item.channelName ?? ""}`.toLowerCase();

    return searchable.includes(query.toLowerCase());
  });
  const manageDisabled = !canManageQueue || !isConnected;
  const playDisabled = !canManageQueue || !isConnected;
  const activeIndex = currentItem
    ? queueViewItems.findIndex((item) => item.id === currentItem.id)
    : -1;
  const activeQueueLabel =
    activeIndex >= 0
      ? `${activeIndex + 1} / ${queueViewItems.length}`
      : `0 / ${queueViewItems.length}`;
  const drawerCountLabel =
    drawerView === "history"
      ? `${historyItems.length} played`
      : activeQueueLabel;
  const compactRemainingLabel = remainingSeconds
    ? formatQueueRemainingDuration(remainingSeconds)
    : null;
  const nextPreview =
    nextPreparation.status !== "idle" ? nextPreparation.target : null;
  const collapsedDrawerHeight = nextPreview ? "4.5rem" : "3rem";
  const rowsMaxHeight = `max(12rem, calc(${drawerHeight}vh - 10.5rem))`;
  const drawerStyle = {
    "--listen-drawer-left": rightSidebarCollapsed ? "400px" : "320px",
    "--listen-drawer-right": rightSidebarCollapsed ? "56px" : "320px",
    maxHeight: open ? `${drawerHeight}vh` : collapsedDrawerHeight,
  } as CSSProperties;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setDrawerHeight(readStoredDrawerHeight());
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function setHeight(nextHeight: number) {
    const safeHeight = clampNumber(
      nextHeight,
      MIN_LISTEN_DRAWER_HEIGHT,
      MAX_LISTEN_DRAWER_HEIGHT,
    );

    setDrawerHeight(safeHeight);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        "mw_listen_queue_drawer_height",
        String(safeHeight),
      );
    }
  }

  return (
    <section
      className={cx(
        "fixed bottom-0 z-50 overflow-hidden rounded-t-md border border-b-0 border-white/10 bg-surface/94 shadow-[0_-18px_48px_rgb(0_0_0_/_0.32)] backdrop-blur-xl transition-[max-height,border-color,box-shadow,left,right] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        desktopShell
          ? "left-[var(--listen-drawer-left)] right-[var(--listen-drawer-right)]"
          : "left-3 right-3",
        open
          ? "border-secondary-fixed-dim/25"
          : "max-h-12 border-white/10",
      )}
      style={drawerStyle}
    >
      <button
        aria-expanded={open}
        aria-label={open ? "Collapse queue drawer" : "Open queue drawer"}
        className={cx(
          "group mx-auto grid min-h-11 w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-2 text-secondary-fixed-dim transition hover:bg-secondary-fixed-dim/8 sm:px-4",
          open && "border-b border-white/10",
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
          <span className="grid min-w-0 gap-1 text-left">
          <span className="flex min-w-0 items-center gap-2">
            <span className="technical-label text-on-surface">Queue</span>
            <span className="text-label-sm text-on-surface-variant">
              {drawerCountLabel}
            </span>
          </span>
          {nextPreview && !desktopShell ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="technical-label border-0 p-0 text-secondary-fixed-dim">
                Next
              </span>
              <span className="truncate text-label-sm font-semibold text-on-surface-variant">
                {nextPreview.title}
              </span>
            </span>
          ) : null}
          </span>
        <span className="flex h-7 min-w-16 items-center justify-center gap-2 rounded-sm border border-secondary-fixed-dim/25 bg-surface-container-low/90 px-3 shadow-[0_0_18px_rgb(255_186_32_/_0.1)]">
          <span className="block h-1 w-8 rounded-full bg-secondary-fixed-dim/80" />
          <ChevronUp
            className={cx(
              "h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
        <span className="grid min-w-0 justify-items-end gap-1 text-right text-label-sm text-on-surface-variant">
          {compactRemainingLabel ? (
            <span className="whitespace-nowrap text-secondary-fixed-dim">
              {compactRemainingLabel}
            </span>
          ) : null}
          <span className="hidden min-[440px]:block">
            {open ? "Hide details" : "Open queue"}
          </span>
        </span>
      </button>
      <div
        aria-hidden={!open}
        className={cx(
          "transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        <div className="grid gap-3 border-b border-white/10 p-3 sm:p-4">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-body-lg font-semibold text-on-surface">
                  {drawerView === "history" ? "History" : "Queue"}
                </h3>
                <span className="text-label-sm text-on-surface-variant">
                  {drawerCountLabel}
                </span>
              </div>
              <div className="inline-grid h-9 shrink-0 grid-cols-2 rounded-sm border border-white/10 bg-surface-container-lowest p-1">
                {[
                  ["queue", "Queue", queueViewItems.length],
                  ["history", "History", historyItems.length],
                ].map(([view, label, count]) => (
                  <button
                    className={cx(
                      "rounded-sm px-3 text-label-sm font-semibold transition",
                      drawerView === view
                        ? "bg-secondary-fixed-dim/12 text-secondary-fixed-dim"
                        : "text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface",
                    )}
                    key={view}
                    onClick={() => setDrawerView(view as "history" | "queue")}
                    type="button"
                  >
                    {label}
                    <span className="ml-1 text-[11px] opacity-70">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-[minmax(14rem,1fr)_auto] md:items-center">
              <label className="grid h-10 min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-sm border border-white/10 bg-surface-container-low px-3">
                <Search
                  className="h-4 w-4 text-on-surface-variant"
                  aria-hidden
                />
                <input
                  className="min-w-32 bg-transparent text-label-sm text-on-surface outline-none placeholder:text-on-surface-variant/55"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search in queue"
                  value={query}
                />
              </label>
              <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
              <Button
                disabled={manageDisabled || queuedItems.length < 2}
                onClick={onShuffle}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Shuffle className="h-4 w-4" aria-hidden />
                Shuffle
              </Button>
              <Button
                disabled={manageDisabled || queuedItems.length < 2}
                onClick={onSmartShuffle}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Smart Shuffle
              </Button>
              <Button
                disabled={manageDisabled || queuedItems.length < 2}
                onClick={onPinnedFirst}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Pin className="h-4 w-4" aria-hidden />
                Pinned first
              </Button>
              <Button
                disabled={manageDisabled || queuedItems.length === 0}
                onClick={onClearQueue}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear
              </Button>
              <button
                aria-expanded={settingsOpen}
                aria-label="Queue drawer settings"
                className={cx(
                  "inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface",
                  settingsOpen &&
                    "border-secondary-fixed-dim/35 bg-secondary-fixed-dim/10 text-secondary-fixed-dim",
                )}
                onClick={() => setSettingsOpen((current) => !current)}
                title="Queue drawer settings"
                type="button"
              >
                <MoreVertical className="h-4 w-4" aria-hidden />
              </button>
              </div>
            </div>
            {settingsOpen ? (
              <div className="rounded-sm border border-white/10 bg-surface-container-lowest/70 p-3">
                <label className="grid gap-2 sm:grid-cols-[auto_minmax(10rem,1fr)_auto] sm:items-center">
                  <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    Drawer height
                  </span>
                  <input
                    aria-label="Queue drawer height"
                    className="h-2 min-w-0 accent-secondary-fixed-dim"
                    max={MAX_LISTEN_DRAWER_HEIGHT}
                    min={MIN_LISTEN_DRAWER_HEIGHT}
                    onChange={(event) =>
                      setHeight(Number(event.currentTarget.value))
                    }
                    step={1}
                    type="range"
                    value={drawerHeight}
                  />
                  <span className="text-label-sm font-semibold text-secondary-fixed-dim">
                    {drawerHeight}vh
                  </span>
                </label>
              </div>
            ) : null}
          </div>
          <div
            className="overflow-y-auto"
            style={{ maxHeight: rowsMaxHeight }}
          >
            {visibleItems.length > 0 ? (
              visibleItems.map((item, index) => {
                const queuedIndex = queuedItems.findIndex(
                  (queuedItem) => queuedItem.id === item.id,
                );

                return (
                  <ListenQueueRow
                    canAddQueue={canAddQueue}
                    current={item.id === currentItem?.id}
                    desktopShell={desktopShell}
                    index={index}
                    item={item}
                    key={item.id}
                    manageDisabled={manageDisabled}
                    onAddQueueItem={onAddQueueItem}
                    onMoveQueueItem={onMoveQueueItem}
                    onPlayQueueItem={onPlayQueueItem}
                    playDisabled={playDisabled}
                    onQueueItemPriorityChange={onQueueItemPriorityChange}
                    onRemoveQueueItem={onRemoveQueueItem}
                    queuedIndex={queuedIndex}
                    queuedItemsLength={queuedItems.length}
                  />
                );
              })
            ) : (
              <p className="p-4 text-body-md text-on-surface-variant">
                {drawerView === "history"
                  ? "No history rows match this search."
                  : "No queue rows match this search."}
              </p>
            )}
          </div>
      </div>
    </section>
  );
}

function ListenQueueRow({
  canAddQueue,
  current,
  desktopShell,
  index,
  item,
  manageDisabled,
  onAddQueueItem,
  onMoveQueueItem,
  onPlayQueueItem,
  playDisabled,
  onQueueItemPriorityChange,
  onRemoveQueueItem,
  queuedIndex,
  queuedItemsLength,
}: {
  canAddQueue: boolean;
  current: boolean;
  desktopShell: boolean;
  index: number;
  item: RoomQueueItem;
  manageDisabled: boolean;
  onAddQueueItem(input: QueueAddInput): void;
  onMoveQueueItem(queueItemId: string, position: number): void;
  onPlayQueueItem(queueItemId: string): void;
  playDisabled: boolean;
  onQueueItemPriorityChange(
    queueItemId: string,
    input: { isPinned?: boolean; isPlayNext?: boolean },
  ): void;
  onRemoveQueueItem(queueItemId: string): void;
  queuedIndex: number;
  queuedItemsLength: number;
}) {
  const metadata = useYouTubeMetadata(
    item.sourceType === "youtube" ? item.sourceUrl : null,
  );
  const title = metadata.metadata?.title ?? item.title;
  const channel = metadata.metadata?.channelTitle ?? item.channelName ?? item.artist;
  const thumbnailUrl = metadata.metadata?.thumbnailUrl ?? item.thumbnailUrl;
  const duration =
    metadata.metadata?.durationSeconds !== null &&
    metadata.metadata?.durationSeconds !== undefined
      ? formatSeconds(metadata.metadata.durationSeconds)
      : item.duration;
  const isQueued = item.status === "queued";
  const isBlocked =
    item.isUnavailable || metadata.metadata?.availability?.playable === false;
  const statusLabel = isBlocked
    ? "Unavailable"
    : current
      ? "Now playing"
      : item.isPlayNext
        ? "Play next"
        : item.isPinned
          ? "Pinned"
          : queuedIndex === 0
            ? "Up next"
            : item.status;

  return (
    <div
      className={cx(
        "group grid min-w-0 grid-cols-[1.25rem_1.5rem_3rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-white/10 px-3 py-2.5 text-label-sm transition last:border-b-0 xl:min-w-[48rem] xl:grid-cols-[2rem_2rem_3.25rem_minmax(12rem,1fr)_5rem_9rem_7rem_8.5rem] xl:gap-3 xl:px-4 xl:py-2",
        current
          ? "bg-secondary-fixed-dim/10 text-on-surface"
          : "text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface",
      )}
    >
      <GripVertical className="h-4 w-4 text-on-surface-variant" aria-hidden />
      <span className="text-on-surface-variant">{index + 1}</span>
      <QueueArtwork thumbnailUrl={thumbnailUrl} title={title} />
      <div className="min-w-0">
        <p className="overflow-hidden break-words text-body-md font-semibold leading-5 text-on-surface [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] xl:min-h-12 xl:leading-6">
          {title}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {channel ?? "Room source"}
          {!desktopShell ? <span> · {duration}</span> : null}
        </p>
        <p
          className={cx(
            "mt-1 text-[11px] font-semibold uppercase tracking-[0.08em]",
            desktopShell && "hidden",
            current || item.isPinned || item.isPlayNext
              ? "text-secondary-fixed-dim"
              : "text-on-surface-variant",
          )}
        >
          {statusLabel}
        </p>
      </div>
      <span className="hidden xl:inline">{duration}</span>
      <span className="hidden truncate xl:inline">Added by {item.addedBy}</span>
      <span
        className={cx(
          "hidden text-label-sm font-semibold xl:inline",
          current
            ? "text-secondary-fixed-dim"
            : item.isPinned || item.isPlayNext
              ? "text-secondary-fixed-dim"
              : "text-on-surface-variant",
        )}
      >
        {statusLabel}
      </span>
      <span className="flex max-w-[6.5rem] flex-wrap items-center justify-end gap-1 xl:max-w-none xl:flex-nowrap">
        {current ? (
          <span className="inline-flex h-5 items-end gap-0.5 text-secondary-fixed-dim">
            {[0, 1, 2].map((bar) => (
              <span
                className="w-1 rounded-sm bg-current"
                key={bar}
                style={{ height: `${7 + bar * 4}px` }}
              />
            ))}
          </span>
        ) : isQueued ? (
          <>
            <IconQueueButton
              disabled={manageDisabled || queuedIndex <= 0}
              icon={<ArrowUp className="h-4 w-4" aria-hidden />}
              label={`Move ${title} up`}
              onClick={() => onMoveQueueItem(item.id, queuedIndex - 1)}
            />
            <IconQueueButton
              disabled={
                manageDisabled ||
                queuedIndex < 0 ||
                queuedIndex >= queuedItemsLength - 1
              }
              icon={<ArrowDown className="h-4 w-4" aria-hidden />}
              label={`Move ${title} down`}
              onClick={() => onMoveQueueItem(item.id, queuedIndex + 1)}
            />
          </>
        ) : item.status === "played" ? (
          <IconQueueButton
            disabled={!canAddQueue || isBlocked}
            icon={<Plus className="h-4 w-4" aria-hidden />}
            label={isBlocked ? `${title} is unavailable` : `Requeue ${title}`}
            onClick={() =>
              onAddQueueItem({
                artist: item.artist,
                channelName: item.channelName,
                isUnavailable: item.isUnavailable,
                playlistId: item.playlistId,
                playlistTitle: item.playlistTitle,
                sourceTitle: item.title,
                sourceType: item.sourceType ?? "youtube",
                sourceUrl: item.sourceUrl ?? "",
                thumbnailUrl: item.thumbnailUrl,
              })
            }
          />
        ) : null}
        {isQueued ? (
          <IconQueueButton
            disabled={manageDisabled}
            icon={<Pin className="h-4 w-4" aria-hidden />}
            label={`${item.isPinned ? "Unpin" : "Pin"} ${title}`}
            onClick={() =>
              onQueueItemPriorityChange(item.id, {
                isPinned: !item.isPinned,
              })
            }
            selected={item.isPinned}
          />
        ) : null}
        {!current ? (
          <IconQueueButton
            disabled={playDisabled || isBlocked}
            icon={<Play className="h-4 w-4" aria-hidden />}
            label={isBlocked ? `${title} is unavailable` : `Play ${title}`}
            onClick={() => onPlayQueueItem(item.id)}
          />
        ) : null}
        <button
          aria-label={`Remove ${title}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-error/30 text-error transition hover:bg-error-container/25 disabled:opacity-35"
          disabled={manageDisabled}
          onClick={() => onRemoveQueueItem(item.id)}
          type="button"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </span>
    </div>
  );
}

function ListenSavedRoomToggle({
  canSave,
  compact = false,
  initialSaved,
  roomId,
}: {
  canSave: boolean;
  compact?: boolean;
  initialSaved: boolean;
  roomId: string;
}) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const Icon = isSaved ? BookmarkCheck : Bookmark;

  async function handleToggle() {
    if (!canSave || saving) {
      return;
    }

    const nextSaved = !isSaved;

    setSaving(true);
    setErrorMessage(null);

    try {
      const result = await setRoomSavedAction({
        roomId,
        saved: nextSaved,
      });

      setIsSaved(result.isSaved);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Saved-room update failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (compact) {
    return (
      <Button
        className="shrink-0 border-white/10 bg-transparent text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface"
        disabled={!canSave || saving}
        onClick={handleToggle}
        size="sm"
        type="button"
        variant="ghost"
      >
        <Icon className="h-4 w-4" aria-hidden />
        {isSaved ? "Saved" : "Save"}
      </Button>
    );
  }

  return (
    <div className="grid gap-1.5 rounded-md border border-white/10 bg-surface-container-low p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="technical-label text-secondary-fixed-dim">
            Saved Room
          </span>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Keep this room and queue available after idle cleanup.
          </p>
        </div>
        <Button
          className="shrink-0"
          disabled={!canSave || saving}
          onClick={handleToggle}
          size="sm"
          type="button"
          variant={isSaved ? "secondary" : "ghost"}
        >
          <Icon className="h-4 w-4" aria-hidden />
          {isSaved ? "Saved" : "Save"}
        </Button>
      </div>
      {errorMessage ? (
        <p className="text-label-sm text-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function ListenAiDjHome({
  compact = false,
  insights,
  placement = "center",
}: {
  compact?: boolean;
  insights: ReturnType<typeof buildListenSessionInsights>;
  placement?: "center" | "rail";
}) {
  return (
    <section
      className={cx(
        "overflow-hidden rounded-md border border-white/10 bg-surface-container-lowest/52 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)]",
        placement === "rail" &&
          "border-secondary-fixed-dim/18 bg-surface-container-lowest/46",
      )}
    >
      <div
        className={cx(
          "grid gap-3 border-b border-white/10 bg-surface-container-lowest/36 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
          compact && "px-3 py-3 sm:grid-cols-1",
        )}
      >
        <div className="min-w-0">
          <span className="technical-label border-secondary-fixed-dim/30 text-secondary-fixed-dim">
            Future AI DJ
          </span>
          <h3
            className={cx(
              "mt-2 font-semibold text-on-surface",
              compact ? "text-body-md leading-tight" : "text-title-md",
            )}
          >
            {placement === "rail"
              ? "Session intelligence dock"
              : "Session intelligence home"}
          </h3>
          <p
            className={cx(
              "mt-1 text-label-sm text-on-surface-variant",
              compact ? "max-w-none" : "max-w-2xl",
            )}
          >
            {placement === "rail"
              ? "Reserved for future advisory room intelligence. Reads queue and history signals only."
              : "This area is reserved for future advisory room intelligence. For now it only reads queue and history signals."}
          </p>
        </div>
        <Badge tone="neutral">Advisory only</Badge>
      </div>
      <div
        className={cx(
          "grid gap-2 p-3 sm:p-4",
          compact ? "grid-cols-1" : "sm:grid-cols-3",
        )}
      >
        {insights.map((insight) => (
          <div
            className="rounded-sm border border-white/10 bg-background/45 p-3"
            key={insight.label}
          >
            <p className="technical-label border-0 p-0 text-on-surface-variant">
              {insight.label}
            </p>
            <p className="mt-1 truncate text-label-sm font-semibold text-on-surface">
              {insight.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildProviderRecommendationQuery(item: RoomQueueItem | null) {
  if (!item) {
    return null;
  }

  return [item.artist ?? item.channelName, item.title]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();
}

function youtubeMetadataToQueueItem(
  item: YouTubeVideoMetadata,
  addedBy: string,
): RoomQueueItem {
  return {
    addedBy,
    artist: item.channelTitle ?? undefined,
    channelName: item.channelTitle ?? undefined,
    duration: item.durationSeconds ? formatSeconds(item.durationSeconds) : "",
    durationSeconds: item.durationSeconds ?? undefined,
    id: `provider:${item.videoId}`,
    isUnavailable: !item.availability.playable,
    sourceType: "youtube",
    sourceUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
    status: "queued",
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    title: item.title ?? "YouTube video",
    videoId: item.videoId,
  };
}

function queueItemToSourceLoadInput(item: RoomQueueItem): SourceLoadInput {
  return {
    sourceTitle: item.title,
    sourceType: item.sourceType ?? "youtube",
    sourceUrl: item.sourceUrl ?? "",
  };
}

function queueItemToQueueAddInput(
  item: RoomQueueItem,
  options: { isPlayNext?: boolean } = {},
): QueueAddInput {
  return {
    artist: item.artist,
    channelName: item.channelName,
    durationSeconds: item.durationSeconds,
    isPlayNext: options.isPlayNext,
    isUnavailable: item.isUnavailable,
    playlistId: item.playlistId,
    playlistTitle: item.playlistTitle,
    sourceTitle: item.title,
    sourceType: item.sourceType ?? "youtube",
    sourceUrl: item.sourceUrl ?? "",
    thumbnailUrl: item.thumbnailUrl,
  };
}

function RecommendationCard({
  canAddQueue,
  canLoadSource,
  canPlay,
  current,
  inQueue,
  item,
  onAddQueue,
  onLoadNow,
  onPlayNext,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  canPlay: boolean;
  current: boolean;
  inQueue: boolean;
  item: RoomQueueItem;
  onAddQueue(): void;
  onLoadNow(): void;
  onPlayNext(): void;
}) {
  const metadata = useYouTubeMetadata(
    item.sourceType === "youtube" ? item.sourceUrl : null,
  );
  const title = metadata.metadata?.title ?? item.title;
  const channel =
    metadata.metadata?.channelTitle ?? item.channelName ?? item.artist;
  const thumbnailUrl = metadata.metadata?.thumbnailUrl ?? item.thumbnailUrl;
  const duration = getQueueItemDisplayDuration(item, metadata);
  const isBlocked =
    item.isUnavailable || metadata.metadata?.availability?.playable === false;
  const canPrimaryPlay = inQueue ? canPlay : canLoadSource;
  const disabled = current || !canPrimaryPlay || isBlocked;
  const primaryLabel = inQueue ? "Play" : "Load now";

  return (
    <article
      className={cx(
        "group min-w-0 snap-start overflow-hidden rounded-md border bg-surface/72 text-left transition",
        current
          ? "border-secondary-fixed-dim/45 bg-secondary-fixed-dim/8"
          : "border-white/10 hover:border-secondary-fixed-dim/40 hover:bg-surface-container-low/70",
        disabled && !current && "opacity-75",
      )}
    >
      <button
        aria-label={
          current
            ? `${title} is now playing`
            : canPrimaryPlay
              ? isBlocked
                ? `${title} is unavailable`
                : `${primaryLabel} ${title}`
              : `Permission required for ${title}`
        }
        className="block w-full text-left disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={onLoadNow}
        type="button"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-container">
        <QueueArtwork
          className="h-full w-full rounded-none border-0"
          thumbnailUrl={thumbnailUrl}
          title={title}
        />
        <span
          className={cx(
            "absolute inset-0 grid place-items-center bg-black/0 text-secondary-fixed-dim opacity-0 transition group-hover:bg-black/24 group-hover:opacity-100",
            current && "bg-black/18 opacity-100",
          )}
        >
          {current ? (
            <span className="technical-label border-secondary-fixed-dim/30 bg-surface/80 text-secondary-fixed-dim">
              Now
            </span>
          ) : (
            <Play className="h-8 w-8 drop-shadow-[0_0_16px_rgb(255_186_32_/_0.35)]" aria-hidden />
          )}
        </span>
        </div>
      </button>
      <div className="grid gap-1 p-3">
        <p className="truncate text-body-md font-semibold text-on-surface">
          {title}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {channel ?? "Room source"}
        </p>
        {duration ? (
          <p className="text-label-sm text-on-surface-variant">{duration}</p>
        ) : null}
        {isBlocked ? (
          <Badge tone="amber">
            {getYouTubeAvailabilityLabel(metadata.metadata?.availability)}
          </Badge>
        ) : null}
        <CardActionRail>
          <IconQueueButton
            disabled={disabled}
            icon={<Play className="h-3.5 w-3.5" aria-hidden />}
            label={`${primaryLabel} ${title}`}
            onClick={onLoadNow}
            rail
          />
          <IconQueueButton
            disabled={!canAddQueue || isBlocked}
            icon={<Plus className="h-3.5 w-3.5" aria-hidden />}
            label={`Add ${title} to the end of the queue`}
            onClick={onAddQueue}
            rail
          />
          <IconQueueButton
            disabled={!canAddQueue || isBlocked}
            icon={<ListPlus className="h-3.5 w-3.5" aria-hidden />}
            label={`Add ${title} to play next. Pinned songs stay first when pinned-first is active.`}
            onClick={onPlayNext}
            rail
          />
        </CardActionRail>
      </div>
    </article>
  );
}

function RecentItemRow({
  canPlay,
  item,
  minutesAgo,
  onPlay,
}: {
  canPlay: boolean;
  item: RoomQueueItem;
  minutesAgo: number;
  onPlay(): void;
}) {
  const metadata = useYouTubeMetadata(
    item.sourceType === "youtube" ? item.sourceUrl : null,
  );
  const title = metadata.metadata?.title ?? item.title;
  const channel =
    metadata.metadata?.channelTitle ?? item.channelName ?? item.artist;
  const thumbnailUrl = metadata.metadata?.thumbnailUrl ?? item.thumbnailUrl;
  const duration = getQueueItemDisplayDuration(item, metadata) ?? "-";
  const isBlocked =
    item.isUnavailable || metadata.metadata?.availability?.playable === false;

  return (
    <button
      aria-label={
        canPlay
          ? isBlocked
            ? `${title} is unavailable`
            : `Play ${title}`
          : `Playback permission required for ${title}`
      }
      className="group grid w-full grid-cols-[3rem_minmax(0,1fr)_auto_auto_auto_auto] items-center gap-3 border-b border-white/10 p-3 text-left transition last:border-b-0 hover:bg-surface-variant/18 disabled:cursor-not-allowed disabled:opacity-75"
      disabled={!canPlay || isBlocked}
      onClick={onPlay}
      type="button"
    >
      <QueueArtwork thumbnailUrl={thumbnailUrl} title={title} />
      <div className="min-w-0">
        <p className="truncate text-body-md font-semibold text-on-surface">
          {title}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {channel ?? "Room source"}
        </p>
      </div>
      <span className="hidden text-label-sm text-on-surface-variant sm:inline">
        {duration}
      </span>
      <span className="hidden text-label-sm text-on-surface-variant md:inline">
        Added by {item.addedBy}
      </span>
      <span className="hidden text-label-sm text-on-surface-variant lg:inline">
        {isBlocked
          ? getYouTubeAvailabilityLabel(metadata.metadata?.availability)
          : `${minutesAgo}m ago`}
      </span>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-secondary-fixed-dim opacity-0 transition group-hover:opacity-100">
        <Play className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}

function ComingUpCard({ item }: { item: RoomQueueItem | null }) {
  return (
    <div className="mt-auto rounded-md border border-white/10 bg-surface-container-low p-3">
      <div className="flex items-center justify-between">
        <span className="technical-label text-on-surface-variant">
          Coming up
        </span>
        <ChevronsUp className="h-4 w-4 text-on-surface-variant" aria-hidden />
      </div>
      {item ? (
        <SmallMediaCard item={item} label="Up next" />
      ) : (
        <p className="mt-3 text-label-sm text-on-surface-variant">
          Add songs to build the queue.
        </p>
      )}
    </div>
  );
}

function SmallMediaCard({
  item,
  label,
}: {
  item: RoomQueueItem;
  label: string;
}) {
  return (
    <div className="mt-3 grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3">
      <QueueArtwork thumbnailUrl={item.thumbnailUrl} title={item.title} />
      <div className="min-w-0">
        <p className="truncate text-body-md font-semibold text-on-surface">
          {item.title}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {item.artist ?? item.channelName ?? "Room source"}
        </p>
      </div>
      <span className="text-label-sm text-on-surface-variant">
        {label === "Now" ? "Live" : item.duration}
      </span>
    </div>
  );
}

function CardActionRail({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2 grid grid-cols-3 overflow-hidden rounded-sm border border-white/10 bg-background/52">
      {children}
    </div>
  );
}

function EmptyListenPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-white/10 bg-surface/55 p-4 text-body-md text-on-surface-variant">
      {children}
    </div>
  );
}

function QueueArtwork({
  className,
  thumbnailUrl,
  title,
}: {
  className?: string;
  thumbnailUrl?: string | null;
  title: string;
}) {
  return (
    <div
      className={cx(
        "h-12 w-12 overflow-hidden rounded-sm border border-white/10 bg-surface-container",
        className,
      )}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external media artwork.
        <img alt="" className="h-full w-full object-cover" src={thumbnailUrl} />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-secondary-fixed-dim">
          <Headphones className="h-5 w-5" aria-hidden />
          <span className="sr-only">{title}</span>
        </span>
      )}
    </div>
  );
}

function formatDurationSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function IconQueueButton({
  disabled,
  icon,
  label,
  onClick,
  rail = false,
  selected = false,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick?(): void;
  rail?: boolean;
  selected?: boolean;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={selected || undefined}
      className={cx(
        rail
          ? "inline-flex h-8 items-center justify-center border-l border-white/10 transition first:border-l-0 disabled:opacity-35"
          : "inline-flex h-7 w-7 items-center justify-center rounded-sm border transition disabled:opacity-35",
        selected
          ? "border-secondary-fixed-dim/40 bg-secondary-fixed-dim/12 text-secondary-fixed-dim shadow-[0_0_14px_rgb(255_186_32_/_0.12)]"
          : rail
            ? "border-white/10 text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface"
            : "border-white/10 text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
      )}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

const LISTEN_THEME_PRESETS = [
  {
    primary: "255 186 32",
    secondary: "184 130 22",
    shadow: "255 186 32",
    wave: "255 214 108",
  },
  {
    primary: "219 116 62",
    secondary: "255 186 32",
    shadow: "219 116 62",
    wave: "255 196 92",
  },
  {
    primary: "176 111 224",
    secondary: "255 186 32",
    shadow: "176 111 224",
    wave: "225 184 255",
  },
  {
    primary: "255 219 157",
    secondary: "155 112 72",
    shadow: "255 186 32",
    wave: "255 205 88",
  },
] satisfies ListenTheme[];

function ListenCenterWaveform({
  active,
  artworkUrl,
}: {
  active: boolean;
  artworkUrl?: string | null;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 top-0 z-0 overflow-hidden"
    >
      {artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Provider artwork is used as a low-detail center-stage ambient layer.
        <img
          alt=""
          className="absolute inset-x-[-12%] bottom-[-24%] h-[105%] w-[124%] object-cover opacity-16 blur-3xl saturate-150"
          key={artworkUrl}
          loading="eager"
          src={artworkUrl}
          style={{
            animation: "listen-artwork-fade-in 1400ms ease-out both",
          }}
        />
      ) : null}
      <div
        className={cx(
          "absolute inset-x-[-8%] bottom-0 flex h-[52%] items-end justify-center gap-2 px-8 transition-opacity duration-1000",
          active ? "opacity-46" : "opacity-22",
        )}
      >
        {Array.from({ length: 68 }).map((_, index) => (
          <span
            className={cx(
              "listen-center-wave-bar w-1.5 rounded-t-sm bg-secondary-fixed-dim/75 shadow-amber-glow",
              !active && "animation-paused",
            )}
            key={index}
            style={{
              animationDelay: `${(index % 13) * 80}ms`,
              backgroundColor: "rgb(var(--listen-wave) / 0.78)",
              boxShadow: "0 0 18px rgb(var(--listen-wave) / 0.18)",
              height: `${18 + ((index * 23) % 78)}%`,
            }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(19_19_20_/_0.08),transparent_42%,rgb(19_19_20_/_0.72)),linear-gradient(90deg,rgb(14_14_15_/_0.72),transparent_42%,transparent_58%,rgb(14_14_15_/_0.72))]" />
    </div>
  );
}

function ListenAmbientBackdrop({ artworkUrl }: { artworkUrl?: string | null }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Provider artwork drives the ambient listen-room backdrop.
        <img
          alt=""
          className="absolute -inset-[12%] h-[124%] w-[124%] object-cover opacity-48 blur-3xl saturate-150"
          fetchPriority="high"
          key={artworkUrl}
          loading="eager"
          src={artworkUrl}
          style={{
            animation: "listen-artwork-fade-in 1400ms ease-out both",
          }}
        />
      ) : null}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(14_14_15_/_0.58),rgb(19_19_20_/_0.34)_38%,rgb(14_14_15_/_0.88)),linear-gradient(180deg,rgb(14_14_15_/_0.18),rgb(14_14_15_/_0.9))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgb(255_255_255_/_0.028)_1px,transparent_1px),linear-gradient(180deg,rgb(255_255_255_/_0.022)_1px,transparent_1px)] bg-[size:72px_72px] opacity-25" />
    </div>
  );
}

function useArtworkTheme(
  artworkUrl: string | null | undefined,
  fallbackTheme: ListenTheme,
) {
  const [extractedTheme, setExtractedTheme] = useState<{
    theme: ListenTheme;
    url: string;
  } | null>(null);

  useEffect(() => {
    if (!artworkUrl) {
      return;
    }

    let cancelled = false;
    const image = new Image();

    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.onload = () => {
      if (cancelled) {
        return;
      }

      const nextTheme = extractThemeFromImage(image, fallbackTheme);

      if (nextTheme) {
        setExtractedTheme({
          theme: nextTheme,
          url: artworkUrl,
        });
      }
    };
    image.onerror = () => {
      if (!cancelled) {
        setExtractedTheme(null);
      }
    };
    image.src = artworkUrl;

    return () => {
      cancelled = true;
    };
  }, [artworkUrl, fallbackTheme]);

  if (extractedTheme && extractedTheme.url === artworkUrl) {
    return extractedTheme.theme;
  }

  return fallbackTheme;
}

function getListenTheme(sourceKey?: string | null) {
  if (!sourceKey) {
    return LISTEN_THEME_PRESETS[0];
  }

  let hash = 0;

  for (let index = 0; index < sourceKey.length; index += 1) {
    hash = (hash * 31 + sourceKey.charCodeAt(index)) >>> 0;
  }

  return LISTEN_THEME_PRESETS[hash % LISTEN_THEME_PRESETS.length];
}

function useListenQueueItems(liveRoom: LiveRoomState, room: RoomSnapshot) {
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

function useDesktopListenShell() {
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

function useListenAiDjRailPlacement() {
  const [railPlacement, setRailPlacement] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      "(min-width: 900px) and (max-width: 1180px) and (min-height: 760px) and (pointer: fine)",
    );

    function updateRailPlacement() {
      setRailPlacement(mediaQuery.matches);
    }

    updateRailPlacement();
    mediaQuery.addEventListener("change", updateRailPlacement);

    return () => {
      mediaQuery.removeEventListener("change", updateRailPlacement);
    };
  }, []);

  return railPlacement;
}

function useRemainingQueueSeconds(liveRoom: LiveRoomState) {
  const [metadataDurations, setMetadataDurations] = useState<
    Record<string, number>
  >({});
  const missingDurationItems = useMemo(
    () =>
      liveRoom.snapshot.queue.filter(
        (item) =>
          item.status === "queued" &&
          item.sourceType === "youtube" &&
          typeof item.durationSeconds !== "number" &&
          Boolean(item.sourceUrl),
      ),
    [liveRoom.snapshot.queue],
  );
  const missingDurationKey = useMemo(
    () =>
      missingDurationItems
        .map((item) => `${item.queueItemId}:${item.sourceUrl}`)
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

    let cancelled = false;

    void Promise.all(
      missingDurationItems.map(async (item) => {
        const response = await fetchYouTubeMetadata(item.sourceUrl);
        const durationSeconds = response.metadata?.durationSeconds;

        return typeof durationSeconds === "number" && durationSeconds > 0
          ? ([item.queueItemId, durationSeconds] as const)
          : null;
      }),
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      const resolvedEntries = entries.filter(
        (entry): entry is readonly [string, number] => Boolean(entry),
      );

      if (resolvedEntries.length === 0) {
        return;
      }

      setMetadataDurations((current) => {
        const next = { ...current };

        for (const [queueItemId, durationSeconds] of resolvedEntries) {
          next[queueItemId] = durationSeconds;
        }

        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [liveRoom.connectionStatus, missingDurationItems, missingDurationKey]);

  return useMemo(
    () => getRemainingQueueSeconds(liveRoom.snapshot.queue, metadataDurations),
    [liveRoom.snapshot.queue, metadataDurations],
  );
}

function toSmartShuffleItem(item: RoomQueueItem, index = 0) {
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

function buildCanonicalState(
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

function getRemainingQueueSeconds(
  queueItems: LiveQueueItem[],
  metadataDurations: Record<string, number>,
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

function readStoredVolume() {
  return Math.round(readStoredPlayerVolume() * 100);
}

function readStoredDrawerHeight() {
  if (typeof window === "undefined") {
    return DEFAULT_LISTEN_DRAWER_HEIGHT;
  }

  const stored = window.localStorage.getItem("mw_listen_queue_drawer_height");
  const numericHeight = Number(stored);

  return Number.isFinite(numericHeight)
    ? clampNumber(
        Math.round(numericHeight),
        MIN_LISTEN_DRAWER_HEIGHT,
        MAX_LISTEN_DRAWER_HEIGHT,
      )
    : DEFAULT_LISTEN_DRAWER_HEIGHT;
}

function readStoredRightSidebarCollapsed() {
  if (typeof window === "undefined") {
    return DEFAULT_RIGHT_SIDEBAR_COLLAPSED;
  }

  return window.localStorage.getItem("mw_listen_right_sidebar_collapsed") === "1";
}

function formatListenPreparationStatus(
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

function getQueueItemDisplayDuration(
  item: RoomQueueItem,
  metadata: ReturnType<typeof useYouTubeMetadata>,
) {
  if (
    metadata.metadata?.durationSeconds !== null &&
    metadata.metadata?.durationSeconds !== undefined
  ) {
    return formatSeconds(metadata.metadata.durationSeconds);
  }

  if (item.duration && item.duration !== "Metadata pending" && item.duration !== "-") {
    return item.duration;
  }

  if (
    item.isUnavailable ||
    metadata.metadata?.availability?.playable === false ||
    (!metadata.loading && metadata.status === "unavailable")
  ) {
    return "Unavailable";
  }

  return null;
}

function extractThemeFromImage(
  image: HTMLImageElement,
  fallbackTheme: ListenTheme,
): ListenTheme | null {
  try {
    const canvas = document.createElement("canvas");
    const size = 32;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      return null;
    }

    canvas.width = size;
    canvas.height = size;
    context.drawImage(image, 0, 0, size, size);

    const pixels = context.getImageData(0, 0, size, size).data;
    let red = 0;
    let green = 0;
    let blue = 0;
    let weightTotal = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const alpha = pixels[index + 3] / 255;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lightness = (max + min) / 510;
      const saturation = max === 0 ? 0 : (max - min) / max;

      if (alpha < 0.5 || lightness < 0.12 || lightness > 0.86) {
        continue;
      }

      const weight = alpha * (0.4 + saturation) * (1 - Math.abs(lightness - 0.52));

      red += r * weight;
      green += g * weight;
      blue += b * weight;
      weightTotal += weight;
    }

    if (weightTotal <= 0) {
      return fallbackTheme;
    }

    const base = {
      b: blue / weightTotal,
      g: green / weightTotal,
      r: red / weightTotal,
    };
    const hsl = softenListenThemeHue(rgbToHsl(base));
    const primary = hslToRgb({
      h: hsl.h,
      l: clampNumber(hsl.l * 1.03 + 0.12, 0.42, 0.68),
      s: clampNumber(hsl.s * 1.08, 0.38, 0.72),
    });
    const secondary = hslToRgb({
      h: (hsl.h + 22) % 360,
      l: clampNumber(hsl.l * 0.95 + 0.08, 0.34, 0.62),
      s: clampNumber(hsl.s * 0.96, 0.3, 0.62),
    });
    const wave = hslToRgb({
      h: (hsl.h + 8) % 360,
      l: clampNumber(hsl.l * 1.18 + 0.16, 0.5, 0.78),
      s: clampNumber(hsl.s * 1.08, 0.44, 0.78),
    });

    return {
      primary: rgbToCss(primary),
      secondary: rgbToCss(secondary),
      shadow: rgbToCss(primary),
      wave: rgbToCss(wave),
    };
  } catch {
    return fallbackTheme;
  }
}

function softenListenThemeHue(theme: { h: number; l: number; s: number }) {
  const redRange = theme.h < 18 || theme.h > 344;

  if (!redRange) {
    return theme;
  }

  return {
    h: theme.h < 180 ? 28 : 332,
    l: theme.l,
    s: theme.s * 0.72,
  };
}

function rgbToHsl({ b, g, r }: { b: number; g: number; r: number }) {
  const normalizedRed = r / 255;
  const normalizedGreen = g / 255;
  const normalizedBlue = b / 255;
  const max = Math.max(normalizedRed, normalizedGreen, normalizedBlue);
  const min = Math.min(normalizedRed, normalizedGreen, normalizedBlue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));

    if (max === normalizedRed) {
      hue = 60 * (((normalizedGreen - normalizedBlue) / delta) % 6);
    } else if (max === normalizedGreen) {
      hue = 60 * ((normalizedBlue - normalizedRed) / delta + 2);
    } else {
      hue = 60 * ((normalizedRed - normalizedGreen) / delta + 4);
    }
  }

  return {
    h: (hue + 360) % 360,
    l: lightness,
    s: saturation,
  };
}

function hslToRgb({ h, l, s }: { h: number; l: number; s: number }) {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = h / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime >= 1 && huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime >= 2 && huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime >= 3 && huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime >= 4 && huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  return {
    b: Math.round((blue + match) * 255),
    g: Math.round((green + match) * 255),
    r: Math.round((red + match) * 255),
  };
}

function rgbToCss({ b, g, r }: { b: number; g: number; r: number }) {
  return `${r} ${g} ${b}`;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatSeconds(totalSeconds: number) {
  const safeValue = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = Math.floor(safeValue % 60);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatQueueRemainingDuration(totalSeconds: number) {
  const safeValue =
    Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0;
  const hours = Math.floor(safeValue / 3600);
  const minutes = Math.floor((safeValue % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${Math.max(1, minutes)}m`;
}
