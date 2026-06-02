"use client";

import {
  useEffect,
  useId,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
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
  Loader2,
  Maximize2,
  MoreVertical,
  Pause,
  Pin,
  Play,
  Plus,
  Repeat2,
  Search,
  Share2,
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
  Badge,
  Button,
  IconButton,
  PendingLink,
  Slider,
  TabButton,
  TabsList,
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
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { fetchPlaylistPreview } from "@/lib/youtube/playlist-client";
import type {
  YouTubePlaylistItem,
  YouTubePlaylistPreviewResponse,
} from "@/lib/youtube/playlist";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";
import { DirectMediaPlayer } from "./direct-media-player";
import { InviteActions } from "./invite-actions";
import { MembersPanel } from "./members-panel";
import { ModeSwitcher } from "./mode-switcher";
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
  playlistId?: string;
  playlistTitle?: string;
  thumbnailUrl?: string;
};

type ListenTabId = "members" | "room";
type PlaylistPreview = YouTubePlaylistPreviewResponse;
type PlaylistPreviewItem = YouTubePlaylistItem;
type ListenTheme = {
  primary: string;
  secondary: string;
  shadow: string;
  wave: string;
};

const listenTabs = [
  { id: "members", label: "Members" },
  { id: "room", label: "Room" },
] as const;
const MIN_LISTEN_DRAWER_HEIGHT = 34;
const MAX_LISTEN_DRAWER_HEIGHT = 88;

export function ListenModeLayout({ liveRoom, room }: ListenModeLayoutProps) {
  const [clockMs, setClockMs] = useState(() => Date.now());
  const [volume, setVolume] = useState(readStoredVolume);
  const liveQueueItems = useListenQueueItems(liveRoom, room);
  const session = liveRoom.snapshot.session;
  const currentItem =
    liveQueueItems.find((item) => item.status === "now") ?? null;
  const queuedItems = liveQueueItems.filter((item) => item.status === "queued");
  const previousItems = liveQueueItems.filter((item) => item.status === "played");
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
  const currentPosition = useMemo(() => {
    const canonicalState = buildCanonicalState(liveRoom);

    return canonicalState ? expectedPositionAt(canonicalState, clockMs) : 0;
  }, [clockMs, liveRoom]);
  const durationSeconds = session?.sourceDurationSeconds ?? 0;
  const canControl = liveRoom.canControlPlayback;
  const canManageQueue = liveRoom.canManageQueue;
  const isConnected = liveRoom.connectionStatus === "connected";

  useEffect(() => {
    const timer = window.setInterval(() => setClockMs(Date.now()), 500);

    return () => window.clearInterval(timer);
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
      liveRoom.playQueueItem(previous.id);
    }
  }

  function playNext() {
    const next = queuedItems[0];

    if (next) {
      liveRoom.playQueueItem(next.id);
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
      liveRoom.moveQueueItem(item.queueItemId, index);
    });

    if (strategy === "shuffle") {
      liveRoom.setQueueMode("shuffle");
    }

    if (strategy === "smart") {
      liveRoom.setQueueMode("smartShuffle");
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-background text-on-surface"
      style={listenThemeStyle}
    >
      <ListenAmbientBackdrop artworkUrl={activeArtworkUrl} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-1000"
        style={{
          background:
            "radial-gradient(circle at 0% 18%, rgb(var(--listen-primary) / 0.68), transparent 46%), radial-gradient(circle at 18% 62%, rgb(var(--listen-secondary) / 0.32), transparent 42%), radial-gradient(circle at 38% 100%, rgb(var(--listen-wave) / 0.2), transparent 48%), linear-gradient(90deg, rgb(var(--listen-primary) / 0.12), rgb(14 14 15 / 0.4) 34%, rgb(19 19 20 / 0.96) 100%)",
        }}
      />
      <div className="relative z-10 grid min-h-screen gap-4 px-margin-mobile pb-28 pt-4 md:px-margin-desktop lg:grid-cols-[320px_minmax(0,1fr)_320px] lg:gap-0 lg:px-0 lg:pb-0 lg:pt-0">
        <ListenNowPlayingPanel
          canControl={canControl}
          currentItem={currentItem}
          currentPosition={currentPosition}
          durationSeconds={durationSeconds}
          liveRoom={liveRoom}
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
          className="relative min-w-0 overflow-hidden border-white/10 lg:border-x"
          style={{
            background:
              "radial-gradient(circle at 0% 22%, rgb(var(--listen-primary) / 0.34), transparent 42%), radial-gradient(circle at 20% 72%, rgb(var(--listen-secondary) / 0.2), transparent 44%), linear-gradient(90deg,rgb(var(--listen-primary) / 0.1),rgb(14 14 15 / 0.76) 42%,rgb(19 19 20 / 0.96))",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgb(255_255_255_/_0.035)_1px,transparent_1px),linear-gradient(180deg,rgb(255_255_255_/_0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20"
          />
          <ListenCenterWaveform
            active={session?.status === "playing"}
            artworkUrl={activeArtworkUrl}
          />
          <div className="relative z-10 grid min-h-full content-start gap-6 px-4 py-5 sm:px-6 lg:px-10 lg:py-8">
            <ListenDiscoveryPanel
              canAddQueue={liveRoom.canAddQueue}
              canLoadSource={liveRoom.canManageAuthority}
              connectionStatus={liveRoom.connectionStatus}
              currentItem={currentItem}
              items={liveQueueItems}
              onAddQueueItem={liveRoom.addQueueItem}
              onLoadSource={liveRoom.loadMediaSource}
              room={room}
            />
          </div>
        </section>

        <ListenRoomSidebar
          liveRoom={liveRoom}
          queuedItems={queuedItems}
          room={room}
        />
      </div>
      <ListenQueueDrawer
        canAddQueue={liveRoom.canAddQueue}
        canManageQueue={canManageQueue}
        currentItem={currentItem}
        isConnected={isConnected}
        items={liveQueueItems}
        onAddQueueItem={liveRoom.addQueueItem}
        onClearQueue={liveRoom.clearQueue}
        onMoveQueueItem={liveRoom.moveQueueItem}
        onPinnedFirst={() => applyQueueShuffle("pinned")}
        onPlayQueueItem={liveRoom.playQueueItem}
        onQueueItemPriorityChange={liveRoom.setQueueItemPriority}
        onRemoveQueueItem={liveRoom.removeQueueItem}
        onShuffle={() => applyQueueShuffle("shuffle")}
        onSmartShuffle={() => applyQueueShuffle("smart")}
        queueMode={session?.queueMode ?? "normal"}
        queuedItems={queuedItems}
      />
    </main>
  );
}

function ListenNowPlayingPanel({
  canControl,
  currentItem,
  currentPosition,
  durationSeconds,
  liveRoom,
  onNext,
  onPlaybackChange,
  onPrevious,
  onSeek,
  onShuffle,
  onVolumeChange,
  queueAutoplayEnabled,
  room,
  volume,
}: {
  canControl: boolean;
  currentItem: RoomQueueItem | null;
  currentPosition: number;
  durationSeconds: number;
  liveRoom: LiveRoomState;
  onNext(): void;
  onPlaybackChange(status: "paused" | "playing"): void;
  onPrevious(): void;
  onSeek(positionSeconds: number): void;
  onShuffle(): void;
  onVolumeChange(volume: number): void;
  queueAutoplayEnabled: boolean;
  room: RoomSnapshot;
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
    <aside className="relative grid content-start gap-4 overflow-hidden border-white/10 bg-surface/92 p-4 pb-6 backdrop-blur-xl lg:h-screen lg:border-r lg:p-5">
      <div className="grid gap-3">
        <PendingLink
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-white/10 px-3 text-label-sm font-semibold text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
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
        className="relative grid gap-4 overflow-hidden rounded-lg border border-white/10 p-4 shadow-amber-glow transition-colors duration-1000"
        style={{
          background:
            "radial-gradient(circle at 30% 4%, rgb(var(--listen-primary) / 0.32), transparent 42%), radial-gradient(circle at 88% 48%, rgb(var(--listen-secondary) / 0.18), transparent 40%), linear-gradient(180deg, rgb(var(--listen-primary) / 0.19), rgb(19 19 20 / 0.86))",
          boxShadow: "0 0 56px rgb(var(--listen-shadow) / 0.24)",
        }}
      >
        {thumbnailUrl ? (
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
        <div className="relative z-10 aspect-square min-h-[13.75rem] overflow-hidden rounded-md border border-white/10 bg-surface-container-lowest">
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
            className="absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,rgb(14_14_15_/_0.76),transparent)]"
          />
        </div>

        {!youtubeSource && liveSource ? (
          <DirectMediaPlayer
            className="sr-only"
            liveRoom={liveRoom}
            mode="listen"
          />
        ) : null}

        <div className="relative z-10 grid gap-2">
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
            <YouTubeMetadataLine sourceUrl={liveSource} tone="amber" />
          ) : null}
        </div>

        <div className="relative z-10 grid gap-2">
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
              onClick={() => onPlaybackChange(isPlaying ? "paused" : "playing")}
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
              onChange={(event) => onVolumeChange(Number(event.currentTarget.value))}
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
    </aside>
  );
}

function ListenDiscoveryPanel({
  canAddQueue,
  canLoadSource,
  connectionStatus,
  currentItem,
  items,
  onAddQueueItem,
  onLoadSource,
  room,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  connectionStatus: string;
  currentItem: RoomQueueItem | null;
  items: RoomQueueItem[];
  onAddQueueItem(input: QueueAddInput): void;
  onLoadSource(input: SourceLoadInput): void;
  room: RoomSnapshot;
}) {
  const [activeFilter, setActiveFilter] = useState("for-you");
  const recommendations = useMemo(
    () =>
      items
        .filter((item) => item.status === "queued")
        .slice(0, 6),
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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="technical-label text-secondary-fixed-dim">
            Friends and family first
          </p>
          <h2 className="mt-3 text-headline-lg font-semibold text-on-surface">
            Good evening
          </h2>
          <p className="text-body-md text-on-surface-variant">
            What do you want to listen to next?
          </p>
        </div>
        <ListenAddMediaPopover
          canAddQueue={canAddQueue}
          canLoadSource={canLoadSource}
          connectionStatus={connectionStatus}
          onAddQueueItem={onAddQueueItem}
          onLoadSource={onLoadSource}
        />
      </div>

      <div className="max-w-full overflow-x-auto pb-1">
        <div className="inline-grid min-w-max grid-flow-col rounded-md border border-white/10 bg-surface-container-lowest p-1">
        {[
          ["for-you", "For you"],
          ["recommended", "Recommended"],
          ["trending", "Trending"],
          ["playlist", "From your playlist"],
        ].map(([id, label]) => (
          <button
            className={cx(
              "h-9 shrink-0 rounded-sm px-4 text-label-sm font-semibold transition",
              activeFilter === id
                ? "bg-secondary-fixed-dim/12 text-secondary-fixed-dim shadow-[inset_0_0_0_1px_rgb(255_186_32_/_0.32)]"
                : "text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface",
            )}
            key={id}
            onClick={() => setActiveFilter(id)}
            type="button"
          >
            {label}
          </button>
        ))}
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-title-md font-semibold text-on-surface">
            Room picks
          </h3>
          <span className="technical-label text-on-surface-variant">
            Queue based
          </span>
        </div>
        {recommendations.length > 0 ? (
          <div className="grid auto-cols-[minmax(11rem,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
            {recommendations.map((item) => (
              <RecommendationCard
                current={item.id === currentItem?.id}
                item={item}
                key={item.id}
              />
            ))}
          </div>
        ) : (
          <EmptyListenPanel>
            Add media to build room picks. Recommendations will become real once
            provider suggestions are wired.
          </EmptyListenPanel>
        )}
      </div>

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
              <RecentItemRow item={item} key={item.id} minutesAgo={index * 3 + 2} />
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
  onAddQueueItem,
  onLoadSource,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  connectionStatus: string;
  onAddQueueItem(input: QueueAddInput): void;
  onLoadSource(input: SourceLoadInput): void;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [playlistPreview, setPlaylistPreview] =
    useState<PlaylistPreview | null>(null);
  const [playlistReviewOpen, setPlaylistReviewOpen] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [url, setUrl] = useState("");
  const addDisabled = !canAddQueue || connectionStatus !== "connected";
  const loadDisabled = !canLoadSource || connectionStatus !== "connected";

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
      const payload = await fetchPlaylistPreview(input);

      setPlaylistPreview(payload);
      setSelectedPlaylistIds(
        new Set(payload.items.map((item) => item.videoId)),
      );

      if (payload.status !== "available") {
        setErrorMessage(
          payload.reason ??
            "Playlist import is unavailable. You can still add a direct video URL.",
        );
      } else if (openReview && payload.items.length > 0) {
        setPlaylistReviewOpen(true);
      }

      return payload;
    } catch {
      setErrorMessage("Playlist import failed. Try the playlist again.");
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

  function addSingle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = parseMediaUrl();

    if (!input) {
      return;
    }

    onAddQueueItem(input);
    setUrl("");
    setPlaylistPreview(null);
    setSelectedPlaylistIds(new Set());
  }

  function loadSingle() {
    const input = parseMediaUrl();

    if (!input) {
      return;
    }

    onLoadSource(input);
    setUrl("");
    setPlaylistPreview(null);
    setSelectedPlaylistIds(new Set());
    setIsOpen(false);
  }

  function importPlaylistItems(items: PlaylistPreviewItem[], label: string) {
    if (!playlistPreview || addDisabled) {
      return;
    }

    let added = 0;

    items.forEach((item) => {
      onAddQueueItem({
        artist: item.channelTitle ?? undefined,
        channelName: item.channelTitle ?? undefined,
        durationSeconds: item.durationSeconds ?? undefined,
        playlistId: playlistPreview.playlistId ?? undefined,
        playlistTitle: playlistPreview.playlistTitle ?? undefined,
        sourceTitle: item.title,
        sourceType: "youtube",
        sourceUrl: item.sourceUrl,
        thumbnailUrl: item.thumbnailUrl ?? undefined,
      });
      added += 1;
    });

    setImportSummary(`Added ${added} ${label} from playlist.`);
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
      selectedPlaylistIds.has(item.videoId),
    );

    importPlaylistItems(selectedItems, "selected tracks");
  }

  return (
    <div className="relative">
      <Button
        className="shadow-screen-glow"
        onClick={() => setIsOpen((open) => !open)}
        size="md"
        type="button"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Add Media
      </Button>
      {isOpen ? (
        <div className="absolute right-0 top-12 z-40 grid w-[min(24rem,calc(100vw-2rem))] gap-3 rounded-lg border border-white/10 bg-surface/95 p-4 shadow-screen-glow backdrop-blur-xl">
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
                className="h-11 rounded-md border border-white/10 bg-surface-container-low px-3 text-body-md text-on-surface outline-none transition placeholder:text-on-surface-variant/55 focus:border-primary-fixed-dim focus:ring-2 focus:ring-primary-fixed-dim/20"
                disabled={!canAddQueue && !canLoadSource}
                onBlur={() => {
                  if (detectUrlType(url) === "youtube-playlist") {
                    void detectPlaylist(url);
                  }
                }}
                onChange={(event) => {
                  setUrl(event.target.value);
                  setImportSummary(null);
                  if (detectUrlType(event.target.value) !== "youtube-playlist") {
                    setPlaylistPreview(null);
                    setSelectedPlaylistIds(new Set());
                  }
                }}
                placeholder="YouTube / YouTube Music link"
                value={url}
              />
              <Button disabled={addDisabled || isImportingPlaylist} type="submit">
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Button>
            </div>
          </form>
          {isImportingPlaylist ? (
            <p className="inline-flex items-center gap-2 text-label-sm text-on-surface-variant">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading playlist preview
            </p>
          ) : null}
          <div className="grid gap-2 rounded-md bg-surface-container-low p-2">
            <button
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-sm p-2 text-left hover:bg-surface-variant/30"
              disabled={addDisabled}
              onClick={() => {
                const input = parseMediaUrl();
                if (input) {
                  onAddQueueItem(input);
                  setUrl("");
                }
              }}
              type="button"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary-fixed-dim/10 text-primary-fixed-dim">
                <Headphones className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-body-md font-semibold text-on-surface">
                  Add single song
                </span>
                <span className="text-label-sm text-on-surface-variant">
                  Add one song to queue
                </span>
              </span>
            </button>
            <button
              className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-sm p-2 text-left hover:bg-surface-variant/30"
              disabled={addDisabled || !playlistPreview}
              onClick={() => setPlaylistReviewOpen(true)}
              type="button"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary-fixed-dim/10 text-secondary-fixed-dim">
                <ListMusic className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-body-md font-semibold text-on-surface">
                  Review playlist
                </span>
                <span className="text-label-sm text-on-surface-variant">
                  {playlistPreview
                    ? `${playlistPreview.items.length} tracks detected`
                    : "Paste a playlist link first"}
                </span>
              </span>
            </button>
            <Button
              disabled={loadDisabled}
              onClick={loadSingle}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Play className="h-4 w-4" aria-hidden />
              Load now
            </Button>
          </div>
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
        </div>
      ) : null}
      {playlistReviewOpen && playlistPreview ? (
        <ListenPlaylistReviewOverlay
          addDisabled={addDisabled}
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
  onClose,
  onImportAll,
  onImportSelected,
  onSelectionChange,
  preview,
  selectedIds,
}: {
  addDisabled: boolean;
  onClose(): void;
  onImportAll(): void;
  onImportSelected(): void;
  onSelectionChange(ids: Set<string>): void;
  preview: PlaylistPreview;
  selectedIds: Set<string>;
}) {
  const allSelected =
    preview.items.length > 0 &&
    preview.items.every((item) => selectedIds.has(item.videoId));

  function toggleItem(videoId: string) {
    const next = new Set(selectedIds);

    if (next.has(videoId)) {
      next.delete(videoId);
    } else {
      next.add(videoId);
    }

    onSelectionChange(next);
  }

  function setAllSelected(selected: boolean) {
    onSelectionChange(
      selected
        ? new Set(preview.items.map((item) => item.videoId))
        : new Set(),
    );
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] grid place-items-center bg-background/72 px-4 py-6 backdrop-blur-md"
      role="dialog"
    >
      <div className="grid max-h-[min(86vh,46rem)] w-full max-w-3xl overflow-hidden rounded-lg border border-secondary-fixed-dim/25 bg-surface/96 shadow-[0_0_64px_rgb(255_186_32_/_0.16)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-4">
          <div className="min-w-0">
            <Badge tone="amber">Playlist review</Badge>
            <h3 className="mt-2 truncate text-title-md font-semibold text-on-surface">
              {preview.playlistTitle ?? "YouTube playlist"}
            </h3>
            <p className="text-label-sm text-on-surface-variant">
              {selectedIds.size} selected / {preview.items.length} available
              {preview.skippedUnavailable
                ? ` / ${preview.skippedUnavailable} unavailable skipped`
                : ""}
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
          <div className="p-4 text-body-md text-error">
            {preview.reason ?? "Playlist import is unavailable right now."}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-surface-container-lowest/75 p-3">
              <button
                className="inline-flex h-9 items-center gap-2 rounded-sm border border-white/10 px-3 text-label-sm font-semibold text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
                onClick={() => setAllSelected(!allSelected)}
                type="button"
              >
                <Check className="h-4 w-4" aria-hidden />
                {allSelected ? "Clear selection" : "Select all"}
              </button>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={addDisabled || preview.items.length === 0}
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
            <div className="max-h-[min(56vh,30rem)] overflow-y-auto p-3">
              <div className="grid gap-2">
                {preview.items.map((item, index) => {
                  const selected = selectedIds.has(item.videoId);

                  return (
                    <label
                      className={cx(
                        "grid cursor-pointer grid-cols-[auto_3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border p-2 transition",
                        selected
                          ? "border-secondary-fixed-dim/35 bg-secondary-fixed-dim/10"
                          : "border-white/10 bg-surface-container-low hover:border-white/20",
                      )}
                      key={item.videoId}
                    >
                      <input
                        checked={selected}
                        className="accent-secondary-fixed-dim"
                        onChange={() => toggleItem(item.videoId)}
                        type="checkbox"
                      />
                      <QueueArtwork
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
                      <span className="technical-label text-on-surface-variant">
                        {index + 1}
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
}

function ListenRoomSidebar({
  liveRoom,
  queuedItems,
  room,
}: {
  liveRoom: LiveRoomState;
  queuedItems: RoomQueueItem[];
  room: RoomSnapshot;
}) {
  const [activeTab, setActiveTab] = useState<ListenTabId>("members");
  const panelNamespace = useId();
  const onlineParticipants = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  );
  const controllerMemberId =
    liveRoom.participants.find((participant) => participant.isController)?.id ??
    null;
  const comingUp = queuedItems[0] ?? null;

  return (
    <aside className="grid content-start gap-4 border-white/10 bg-surface/92 p-4 backdrop-blur-xl lg:h-screen lg:border-l lg:p-5">
      <TabsList className="grid grid-cols-2 rounded-md border border-white/10 bg-surface-container-lowest p-1">
        {listenTabs.map((tab) => (
          <TabButton
            active={activeTab === tab.id}
            aria-controls={`${panelNamespace}-${tab.id}-panel`}
            className={
              activeTab === tab.id
                ? "bg-secondary-fixed-dim/12 text-secondary-fixed-dim"
                : undefined
            }
            id={`${panelNamespace}-${tab.id}-tab`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="inline-flex items-center gap-1.5">
              {tab.label}
              {tab.id === "members" ? (
                <span className="rounded-sm border border-white/10 bg-surface-container px-1.5 text-[11px]">
                  {onlineParticipants.length}
                </span>
              ) : null}
            </span>
          </TabButton>
        ))}
      </TabsList>

      <div
        aria-labelledby={`${panelNamespace}-${activeTab}-tab`}
        className="min-w-0"
        id={`${panelNamespace}-${activeTab}-panel`}
        role="tabpanel"
      >
        {activeTab === "members" ? (
          <MembersPanel
            canManageAuthority={liveRoom.canManageAuthority}
            connectionStatus={liveRoom.connectionStatus}
            controllerMemberId={controllerMemberId}
            errorMessage={liveRoom.errorMessage}
            grantControl={liveRoom.grantControl}
            kickMember={liveRoom.kickMember}
            onPermissionChange={liveRoom.setPermission}
            participants={liveRoom.participants}
            removeIdleMember={liveRoom.removeIdleMember}
            revokeControl={liveRoom.revokeControl}
          />
        ) : (
          <ListenRoomContext liveRoom={liveRoom} room={room} />
        )}
      </div>

      <ComingUpCard item={comingUp} />
    </aside>
  );
}

function ListenQueueDrawer({
  canAddQueue,
  canManageQueue,
  currentItem,
  isConnected,
  items,
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
}: {
  canAddQueue: boolean;
  canManageQueue: boolean;
  currentItem: RoomQueueItem | null;
  isConnected: boolean;
  items: RoomQueueItem[];
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
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState<number>(
    readStoredDrawerHeight,
  );
  const visibleItems = items.filter((item) => {
    const searchable = `${item.title} ${item.artist ?? ""} ${item.channelName ?? ""}`.toLowerCase();

    return searchable.includes(query.toLowerCase());
  });
  const manageDisabled = !canManageQueue || !isConnected;
  const activeIndex = currentItem
    ? items.findIndex((item) => item.id === currentItem.id)
    : -1;
  const activeQueueLabel =
    activeIndex >= 0 ? `${activeIndex + 1} / ${items.length}` : `0 / ${items.length}`;
  const rowsMaxHeight = `max(12rem, calc(${drawerHeight}vh - 13rem))`;

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
        "fixed bottom-0 left-3 right-3 z-50 overflow-hidden rounded-t-lg border border-b-0 border-white/10 bg-surface/94 shadow-[0_-24px_60px_rgb(0_0_0_/_0.34)] backdrop-blur-xl transition-[max-height,border-color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:left-[320px] lg:right-[320px]",
        open
          ? "border-secondary-fixed-dim/25"
          : "max-h-12 border-white/10",
      )}
      style={{
        maxHeight: open ? `${drawerHeight}vh` : "3rem",
      }}
    >
      <button
        aria-expanded={open}
        aria-label={open ? "Collapse queue drawer" : "Open queue drawer"}
        className={cx(
          "group mx-auto grid h-12 w-full grid-cols-[1fr_auto_1fr] items-center px-4 text-secondary-fixed-dim transition hover:bg-secondary-fixed-dim/8",
          open && "border-b border-white/10",
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
          <span className="hidden min-w-0 items-center gap-2 text-left sm:flex">
            <span className="technical-label text-on-surface">Queue</span>
            <span className="text-label-sm text-on-surface-variant">
              {activeQueueLabel}
            </span>
          </span>
        <span className="flex h-8 min-w-24 items-center justify-center gap-2 rounded-md border border-secondary-fixed-dim/25 bg-surface-container-low/90 px-4 shadow-amber-glow">
          <span className="block h-1 w-10 rounded-full bg-secondary-fixed-dim/80" />
          <ChevronUp
            className={cx(
              "h-4 w-4 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </span>
        <span className="hidden justify-end text-label-sm text-on-surface-variant sm:flex">
          {open ? "Hide details" : "Open queue"}
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-4">
            <div className="flex items-center gap-2">
              <h3 className="text-body-lg font-semibold text-on-surface">
                Queue
              </h3>
              <span className="text-label-sm text-on-surface-variant">
                {activeQueueLabel}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <label className="grid h-9 w-56 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-white/10 bg-surface-container-low px-3">
                <span className="flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  Height
                </span>
                <input
                  aria-label="Queue drawer height"
                  className="h-2 min-w-0 accent-secondary-fixed-dim"
                  max={MAX_LISTEN_DRAWER_HEIGHT}
                  min={MIN_LISTEN_DRAWER_HEIGHT}
                  onChange={(event) => setHeight(Number(event.currentTarget.value))}
                  step={1}
                  type="range"
                  value={drawerHeight}
                />
                <span className="w-10 text-right text-[11px] font-semibold text-secondary-fixed-dim">
                  {drawerHeight}vh
                </span>
              </label>
              <label className="grid h-9 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md border border-white/10 bg-surface-container-low px-3">
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
              <IconButton label="More queue actions" variant="ghost">
                <MoreVertical className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
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
                    index={index}
                    item={item}
                    key={item.id}
                    manageDisabled={manageDisabled}
                    onAddQueueItem={onAddQueueItem}
                    onMoveQueueItem={onMoveQueueItem}
                    onPlayQueueItem={onPlayQueueItem}
                    onQueueItemPriorityChange={onQueueItemPriorityChange}
                    onRemoveQueueItem={onRemoveQueueItem}
                    queuedIndex={queuedIndex}
                    queuedItemsLength={queuedItems.length}
                  />
                );
              })
            ) : (
              <p className="p-4 text-body-md text-on-surface-variant">
                No queue rows match this search.
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
  index,
  item,
  manageDisabled,
  onAddQueueItem,
  onMoveQueueItem,
  onPlayQueueItem,
  onQueueItemPriorityChange,
  onRemoveQueueItem,
  queuedIndex,
  queuedItemsLength,
}: {
  canAddQueue: boolean;
  current: boolean;
  index: number;
  item: RoomQueueItem;
  manageDisabled: boolean;
  onAddQueueItem(input: QueueAddInput): void;
  onMoveQueueItem(queueItemId: string, position: number): void;
  onPlayQueueItem(queueItemId: string): void;
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

  return (
    <div
      className={cx(
        "group grid min-w-[48rem] grid-cols-[2rem_2rem_3.25rem_minmax(12rem,1fr)_5rem_9rem_7rem_7rem_2rem] items-center gap-3 border-b border-white/10 px-4 py-2 text-label-sm transition last:border-b-0",
        current
          ? "bg-secondary-fixed-dim/10 text-on-surface"
          : "text-on-surface-variant hover:bg-surface-variant/20 hover:text-on-surface",
      )}
    >
      <GripVertical className="h-4 w-4 text-on-surface-variant" aria-hidden />
      <span className="text-on-surface-variant">{index + 1}</span>
      <QueueArtwork thumbnailUrl={thumbnailUrl} title={title} />
      <div className="min-w-0">
        <p className="truncate text-body-md font-semibold text-on-surface">
          {title}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {channel ?? "Room source"}
        </p>
      </div>
      <span>{duration}</span>
      <span className="truncate">Added by {item.addedBy}</span>
      <span
        className={cx(
          "text-label-sm font-semibold",
          current ? "text-secondary-fixed-dim" : "text-on-surface-variant",
        )}
      >
        {current ? "Now playing" : queuedIndex === 0 ? "Up next" : item.status}
      </span>
      <span className="flex items-center justify-end gap-1">
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
            disabled={!canAddQueue}
            icon={<Plus className="h-4 w-4" aria-hidden />}
            label={`Requeue ${title}`}
            onClick={() =>
              onAddQueueItem({
                artist: item.artist,
                channelName: item.channelName,
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
          />
        ) : null}
        {!current ? (
          <IconQueueButton
            disabled={manageDisabled}
            icon={<Play className="h-4 w-4" aria-hidden />}
            label={`Play ${title}`}
            onClick={() => onPlayQueueItem(item.id)}
          />
        ) : null}
      </span>
      <button
        aria-label={`Remove ${title}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-error/30 text-error transition hover:bg-error-container/25 disabled:opacity-35"
        disabled={manageDisabled}
        onClick={() => onRemoveQueueItem(item.id)}
        type="button"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function ListenRoomContext({
  liveRoom,
  room,
}: {
  liveRoom: LiveRoomState;
  room: RoomSnapshot;
}) {
  return (
    <div className="grid gap-4">
      <ModeSwitcher
        canSwitch={
          liveRoom.canManageAuthority && liveRoom.connectionStatus === "connected"
        }
        mode="listen"
        onSwitchMode={liveRoom.switchMode}
      />
      <InviteActions inviteUrl={room.inviteUrl} roomCode={room.code} />
      <div className="rounded-md border border-white/10 bg-surface-container-low p-3">
        <span className="technical-label text-secondary-fixed-dim">Room</span>
        <p className="mt-2 text-body-md font-semibold text-on-surface">
          {liveRoom.snapshot.session?.roomName ?? room.name}
        </p>
        <p className="text-label-sm text-on-surface-variant">
          Host: {room.host}
        </p>
      </div>
      <ListenSavedRoomToggle
        canSave={liveRoom.canManageAuthority}
        initialSaved={room.isSaved}
        roomId={room.id}
      />
    </div>
  );
}

function ListenSavedRoomToggle({
  canSave,
  initialSaved,
  roomId,
}: {
  canSave: boolean;
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

function RecommendationCard({
  current,
  item,
}: {
  current: boolean;
  item: RoomQueueItem;
}) {
  return (
    <article
      className={cx(
        "group min-w-0 overflow-hidden rounded-md border bg-surface/72 transition hover:border-secondary-fixed-dim/35",
        current ? "border-secondary-fixed-dim/40" : "border-white/10",
      )}
    >
      <div className="aspect-[4/3] overflow-hidden bg-surface-container">
        <QueueArtwork
          className="h-full w-full rounded-none border-0"
          thumbnailUrl={item.thumbnailUrl}
          title={item.title}
        />
      </div>
      <div className="grid gap-1 p-3">
        <p className="truncate text-body-md font-semibold text-on-surface">
          {item.title}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {item.artist ?? item.channelName ?? "Room source"}
        </p>
        <p className="text-label-sm text-on-surface-variant">
          {item.duration}
        </p>
      </div>
    </article>
  );
}

function RecentItemRow({
  item,
  minutesAgo,
}: {
  item: RoomQueueItem;
  minutesAgo: number;
}) {
  return (
    <div className="grid grid-cols-[3rem_minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-b border-white/10 p-3 last:border-b-0">
      <QueueArtwork thumbnailUrl={item.thumbnailUrl} title={item.title} />
      <div className="min-w-0">
        <p className="truncate text-body-md font-semibold text-on-surface">
          {item.title}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {item.artist ?? item.channelName ?? "Room source"}
        </p>
      </div>
      <span className="hidden text-label-sm text-on-surface-variant sm:inline">
        {item.duration}
      </span>
      <span className="hidden text-label-sm text-on-surface-variant md:inline">
        Added by {item.addedBy}
      </span>
      <span className="hidden text-label-sm text-on-surface-variant lg:inline">
        {minutesAgo}m ago
      </span>
    </div>
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

function IconQueueButton({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick?(): void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface disabled:opacity-35"
      disabled={disabled}
      onClick={onClick}
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
      className="pointer-events-none absolute inset-x-0 bottom-0 top-[28%] z-0 overflow-hidden"
    >
      {artworkUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Provider artwork is used as a low-detail center-stage ambient layer.
        <img
          alt=""
          className="absolute inset-x-[-12%] bottom-[-18%] h-[82%] w-[124%] object-cover opacity-18 blur-3xl saturate-150"
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
          "absolute inset-x-[-8%] bottom-0 flex h-56 items-end justify-center gap-2 px-8 transition-opacity duration-1000",
          active ? "opacity-55" : "opacity-28",
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
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(19_19_20_/_0.12),transparent_24%,rgb(19_19_20_/_0.72)),linear-gradient(90deg,rgb(14_14_15_/_0.72),transparent_42%,transparent_58%,rgb(14_14_15_/_0.72))]" />
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
          : "Metadata pending",
      id: item.queueItemId,
      isPinned: item.isPinned,
      isPlayNext: item.isPlayNext,
      isUnavailable: item.isUnavailable,
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

function readStoredVolume() {
  return Math.round(readStoredPlayerVolume() * 100);
}

function readStoredDrawerHeight() {
  if (typeof window === "undefined") {
    return 56;
  }

  const stored = window.localStorage.getItem("mw_listen_queue_drawer_height");
  const numericHeight = Number(stored);

  return Number.isFinite(numericHeight)
    ? clampNumber(
        Math.round(numericHeight),
        MIN_LISTEN_DRAWER_HEIGHT,
        MAX_LISTEN_DRAWER_HEIGHT,
      )
    : 56;
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
    const hsl = rgbToHsl(base);
    const primary = hslToRgb({
      h: hsl.h,
      l: clampNumber(hsl.l * 1.08 + 0.12, 0.42, 0.72),
      s: clampNumber(hsl.s * 1.34, 0.46, 0.86),
    });
    const secondary = hslToRgb({
      h: (hsl.h + 22) % 360,
      l: clampNumber(hsl.l * 0.95 + 0.08, 0.34, 0.62),
      s: clampNumber(hsl.s * 1.08, 0.34, 0.72),
    });
    const wave = hslToRgb({
      h: (hsl.h + 8) % 360,
      l: clampNumber(hsl.l * 1.18 + 0.16, 0.5, 0.78),
      s: clampNumber(hsl.s * 1.38, 0.5, 0.9),
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
