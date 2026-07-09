"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Film,
  ListPlus,
  Music2,
  MoreVertical,
  Pin,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button, SignalInlineStatus } from "@/components/ui";
import { MetadataPlaceholderChips } from "./metadata-placeholder-chips";
import {
  detectUrlType,
  parseYouTubeVideoId,
  parseYouTubePlaylist,
  validateMediaSourceForMode,
} from "@/lib/player/source";
import {
  shuffleUpcomingQueue,
  smartShuffleQueue,
  type QueueMode,
  type SmartShuffleItem,
} from "@/lib/queue/model";
import type { RoomQueueItem } from "@/lib/rooms";
import type { LiveRoomError } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { fetchPlaylistPreview } from "@/lib/youtube/playlist-client";
import { fetchYouTubeMetadata } from "@/lib/youtube/metadata-client";
import { createUploadedAssetReference } from "@/lib/media/uploaded-playback-reference";
import type {
  YouTubePlaylistItem,
  YouTubePlaylistPreviewResponse,
} from "@/lib/youtube/playlist";
import { getYouTubeAvailabilityLabel } from "@/lib/youtube/availability";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";
import type { YouTubeSearchItem } from "@/lib/youtube/search";
import { YouTubeAddMediaSearch } from "./youtube-add-media-search";

type QueuePanelProps = {
  canAddQueue?: boolean;
  canLoadSource?: boolean;
  canManageQueue?: boolean;
  connectionStatus?: string;
  id?: string;
  items: RoomQueueItem[];
  mode?: "watch" | "listen";
  onAddQueueItem?(input: QueueAddInput): void;
  onClearQueue?(): void;
  onLoadSource?(input: SourceLoadInput): void;
  onMoveQueueItem?(queueItemId: string, position: number): void;
  onPlayQueueItem?(queueItemId: string): void;
  onQueueItemPriorityChange?(
    queueItemId: string,
    input: { isPinned?: boolean; isPlayNext?: boolean },
  ): void;
  onQueueModeChange?(mode: QueueMode): void;
  onRemoveQueueItem?(queueItemId: string): void;
  presentation?: "default" | "hub";
  queueMode?: QueueMode;
  roomErrors?: LiveRoomError[];
  roomId: string;
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
type MediaLibraryAsset = {
  durationSeconds: number | null;
  id: string;
  publicUrl: string;
  sourceMatches: Array<{
    sourceId: string;
    sourceType: string;
    status: string;
  }>;
  thumbnailUrl: string | null;
  title: string;
};

type PlaylistPreview = YouTubePlaylistPreviewResponse;
type PlaylistPreviewItem = YouTubePlaylistItem;
type DuplicatePreference = "allow" | "warn";
type QueueNotification = {
  id: string;
  message: string;
  tone: "error" | "info" | "success" | "warning";
};
type PendingDuplicateAdd =
  | { kind: "single"; item: QueueAddInput }
  | {
      items: PlaylistPreviewItem[];
      kind: "playlist";
      playlistId?: string | null;
      playlistTitle?: string | null;
      skippedUnavailable: number;
    };

const duplicatePreferenceStorageKey = "mw_queue_duplicate_preference";
const roomErrorToneBySeverity = {
  error: "error",
  info: "info",
  warning: "warning",
} satisfies Record<LiveRoomError["severity"], QueueNotification["tone"]>;

function playlistItemKey(item: PlaylistPreviewItem) {
  return `${item.videoId}:${item.position}`;
}

const queueModeOptions: Array<{ label: string; mode: QueueMode }> = [
  { label: "Normal", mode: "normal" },
  { label: "Shuffle", mode: "shuffle" },
  { label: "Smart Shuffle", mode: "smartShuffle" },
  { label: "Loop Queue", mode: "loop" },
  { label: "Autoplay Related", mode: "autoplayRelated" },
];

export function QueuePanel({
  canAddQueue = false,
  canLoadSource = false,
  canManageQueue = false,
  connectionStatus,
  id,
  items,
  mode = "watch",
  onAddQueueItem,
  onClearQueue,
  onLoadSource,
  onMoveQueueItem,
  onPlayQueueItem,
  onQueueItemPriorityChange,
  onQueueModeChange,
  onRemoveQueueItem,
  presentation = "default",
  queueMode = "normal",
  roomErrors = [],
  roomId,
}: QueuePanelProps) {
  const [activeQueueTab, setActiveQueueTab] = useState<"history" | "up-next">(
    "up-next",
  );
  const [addMediaOpen, setAddMediaOpen] = useState(false);
  const [duplicatePreference, setDuplicatePreference] =
    useState<DuplicatePreference>(() =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(duplicatePreferenceStorageKey) === "allow"
        ? "allow"
        : "warn",
    );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [notifications, setNotifications] = useState<QueueNotification[]>([]);
  const [pendingDuplicateAdd, setPendingDuplicateAdd] =
    useState<PendingDuplicateAdd | null>(null);
  const [playlistPreview, setPlaylistPreview] =
    useState<PlaylistPreview | null>(null);
  const [singlePreview, setSinglePreview] = useState<QueueAddInput | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [queueControlsOpen, setQueueControlsOpen] = useState(true);
  const [queueUrl, setQueueUrl] = useState("");
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    () => new Set(),
  );
  const notifiedRoomErrorIds = useRef<Set<string> | null>(null);
  const queuedItems = items.filter((item) => item.status === "queued");
  const previousItems = items
    .filter((item) => item.status === "played")
    .sort((a, b) => (a.playedSequence ?? 0) - (b.playedSequence ?? 0));
  const upcomingItems = items.filter((item) => item.status !== "played");
  const isConnected = connectionStatus === "connected";
  const addDisabled = !canAddQueue || !isConnected;
  const loadDisabled = !canLoadSource || !isConnected;
  const manageDisabled = !canManageQueue || !isConnected;
  const currentItem = items.find((item) => item.status === "now") ?? null;
  const historyItems = items.filter((item) => item.status === "played");
  const duplicateVideoIds = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.videoId)
          .filter((videoId): videoId is string => Boolean(videoId)),
      ),
    [items],
  );
  const duplicateSourceUrls = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.sourceUrl)
          .filter((sourceUrl): sourceUrl is string => Boolean(sourceUrl)),
      ),
    [items],
  );
  const hasPreviewState = Boolean(
    queueUrl.trim() || singlePreview || playlistPreview,
  );

  const hub = presentation === "hub";

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

  useEffect(() => {
    if (!addMediaOpen) {
      return;
    }

    const trimmedUrl = queueUrl.trim();

    if (!trimmedUrl) {
      const resetTimer = window.setTimeout(() => {
        setSinglePreview(null);
        clearPlaylistPreview();
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
        void detectPlaylist(trimmedUrl).finally(() => {
          if (!cancelled) {
            setPreviewLoading(false);
          }
        });
        return;
      }

      clearPlaylistPreview();
      const result = validateMediaSourceForMode(trimmedUrl, mode);

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
  }, [addMediaOpen, mode, queueUrl]);

  function notify(message: string, tone: QueueNotification["tone"] = "info") {
    const id = window.crypto.randomUUID();

    setNotifications((current) => [...current.slice(-3), { id, message, tone }]);
    window.setTimeout(() => {
      setNotifications((current) =>
        current.filter((notification) => notification.id !== id),
      );
    }, 4200);
  }

  function rememberDuplicatePreference(remember: boolean) {
    if (!remember) {
      return;
    }

    window.localStorage.setItem(duplicatePreferenceStorageKey, "allow");
    setDuplicatePreference("allow");
  }

  function clearPlaylistPreview() {
    setPlaylistPreview(null);
    setSelectedPlaylistIds(new Set());
  }

  function clearAddMediaState() {
    setQueueUrl("");
    setSinglePreview(null);
    setPendingDuplicateAdd(null);
    setErrorMessage(null);
    setImportSummary(null);
    clearPlaylistPreview();
  }

  async function detectPlaylist(input: string) {
    const parsed = parseYouTubePlaylist(input);

    if (!parsed) {
      clearPlaylistPreview();
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
      }

      return payload;
    } catch {
      setErrorMessage("Playlist import failed. Try the playlist again.");
      clearPlaylistPreview();
      return null;
    } finally {
      setIsImportingPlaylist(false);
    }
  }

  function parseQueueUrl() {
    setErrorMessage(null);
    setImportSummary(null);

    const type = detectUrlType(queueUrl);

    if (type === "youtube-playlist") {
      void detectPlaylist(queueUrl);
      return null;
    }

    const result = validateMediaSourceForMode(queueUrl, mode);

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

  function handleUrlChange(value: string) {
    setQueueUrl(value);
    setImportSummary(null);
    setSinglePreview(null);

    if (detectUrlType(value) !== "youtube-playlist") {
      clearPlaylistPreview();
    }
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

  async function preferFirstPartyMediaMatch(input: QueueAddInput) {
    const videoId =
      input.sourceType === "youtube" ? parseYouTubeVideoId(input.sourceUrl) : null;

    if (!videoId) {
      return input;
    }

    const matches = await fetchFirstPartyMediaMatches([videoId]);
    const asset = matches.get(videoId);

    if (!asset) {
      return input;
    }

    return firstPartyAssetToQueueInput(asset, {
      channelTitle: input.channelName ?? input.artist ?? null,
      durationSeconds: input.durationSeconds ?? null,
      sourceUrl: input.sourceUrl,
      thumbnailUrl: input.thumbnailUrl ?? null,
      title: input.sourceTitle,
    });
  }

  function isDuplicateQueueSource(input: Pick<QueueAddInput, "sourceUrl">) {
    const videoId = parseYouTubeVideoId(input.sourceUrl);

    return (
      duplicateSourceUrls.has(input.sourceUrl) ||
      Boolean(videoId && duplicateVideoIds.has(videoId))
    );
  }

  function addQueueItemWithFeedback(input: QueueAddInput) {
    onAddQueueItem?.(input);
    notify(
      input.allowDuplicate
        ? `Duplicate added: ${input.sourceTitle}`
        : `Added to queue: ${input.sourceTitle}`,
      input.allowDuplicate ? "warning" : "success",
    );
  }

  function youtubeSearchItemToQueueInput(item: YouTubeSearchItem): QueueAddInput {
    return {
      artist: item.channelTitle ?? undefined,
      channelName: item.channelTitle ?? undefined,
      durationSeconds: item.durationSeconds ?? undefined,
      isUnavailable: item.availability.playable === false,
      sourceTitle: item.title,
      sourceType: "youtube",
      sourceUrl: item.url,
      thumbnailUrl: item.thumbnailUrl ?? undefined,
    };
  }

  async function addSearchResult(item: YouTubeSearchItem) {
    const input = await preferFirstPartyMediaMatch(
      youtubeSearchItemToQueueInput(item),
    );

    if (isDuplicateQueueSource(input) && duplicatePreference === "warn") {
      setPendingDuplicateAdd({ item: input, kind: "single" });
      notify("Duplicate detected. Confirm whether to add it again.", "warning");
      return;
    }

    addQueueItemWithFeedback({
      ...input,
      allowDuplicate: isDuplicateQueueSource(input),
    });
  }

  async function playSearchResultNext(item: YouTubeSearchItem) {
    const input = await preferFirstPartyMediaMatch(
      youtubeSearchItemToQueueInput(item),
    );

    if (isDuplicateQueueSource(input) && duplicatePreference === "warn") {
      setPendingDuplicateAdd({
        item: {
          ...input,
          isPlayNext: true,
        },
        kind: "single",
      });
      notify("Duplicate detected. Confirm whether to add it again.", "warning");
      return;
    }

    addQueueItemWithFeedback({
      ...input,
      allowDuplicate: isDuplicateQueueSource(input),
      isPlayNext: true,
    });
  }

  async function loadSearchResult(item: YouTubeSearchItem) {
    const input = await preferFirstPartyMediaMatch(
      youtubeSearchItemToQueueInput(item),
    );

    onLoadSource?.(input);
    notify(`Loaded source: ${input.sourceTitle}`, "success");
  }

  async function importPlaylistItemsWithFeedback(
    importItems: PlaylistPreviewItem[],
    options: {
      allowDuplicates: boolean;
      playlistId?: string | null;
      playlistTitle?: string | null;
      skippedUnavailable: number;
    },
  ) {
    let added = 0;
    let duplicatesAdded = 0;
    const firstPartyMatches = await fetchFirstPartyMediaMatches(
      importItems.map((item) => item.videoId),
    );

    for (const item of importItems) {
      const queueInput = firstPartyMatches.has(item.videoId)
        ? firstPartyAssetToQueueInput(firstPartyMatches.get(item.videoId)!, item)
        : playlistItemToQueueInput(item, options);
      const duplicate =
        duplicateVideoIds.has(item.videoId) ||
        duplicateSourceUrls.has(item.sourceUrl) ||
        duplicateSourceUrls.has(queueInput.sourceUrl);

      if (duplicate && !options.allowDuplicates) {
        continue;
      }

      added += 1;
      duplicatesAdded += duplicate ? 1 : 0;
      onAddQueueItem?.({ ...queueInput, allowDuplicate: duplicate });
    }

    const summary =
      duplicatesAdded > 0
        ? `Added ${added} playlist videos, including ${duplicatesAdded} duplicates.`
        : `Added ${added} playlist videos.`;

    setImportSummary(
      options.skippedUnavailable
        ? `${summary} Skipped ${options.skippedUnavailable} unavailable.`
        : summary,
    );
    notify(summary, duplicatesAdded > 0 ? "warning" : "success");
  }

  async function handleAddQueueItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = singlePreview ?? parseQueueUrl();

    if (!input) {
      return;
    }

    const checkedInput = singlePreview
      ? await preferFirstPartyMediaMatch(singlePreview)
      : await checkYouTubeInput(input).then((checked) =>
          checked ? preferFirstPartyMediaMatch(checked) : null,
        );

    if (!checkedInput) {
      return;
    }

    if (isDuplicateQueueSource(checkedInput) && duplicatePreference === "warn") {
      setPendingDuplicateAdd({ item: checkedInput, kind: "single" });
      notify("Duplicate detected. Confirm whether to add it again.", "warning");
      return;
    }

    addQueueItemWithFeedback({
      ...checkedInput,
      allowDuplicate: isDuplicateQueueSource(checkedInput),
    });
    clearAddMediaState();
    setAddMediaOpen(false);
  }

  async function handleLoadSource() {
    const input = singlePreview ?? parseQueueUrl();

    if (!input) {
      return;
    }

    const checkedInput = singlePreview
      ? await preferFirstPartyMediaMatch(singlePreview)
      : await checkYouTubeInput(input).then((checked) =>
          checked ? preferFirstPartyMediaMatch(checked) : null,
        );

    if (!checkedInput) {
      return;
    }

    onLoadSource?.(checkedInput);
    notify(`Loaded source: ${checkedInput.sourceTitle}`, "success");
    clearAddMediaState();
    setAddMediaOpen(false);
  }

  async function importPlaylist(
    strategy: "all" | "selected" | "shuffle" | "smart",
  ) {
    if (!playlistPreview || addDisabled) {
      return;
    }

    let importItems = playlistPreview.items.filter((item) =>
      strategy === "selected" ? selectedPlaylistIds.has(playlistItemKey(item)) : true,
    );
    const skippedUnavailable = importItems.filter(
      (item) => item.isUnavailable,
    ).length;

    importItems = importItems.filter((item) => !item.isUnavailable);

    if (strategy === "shuffle") {
      importItems = shuffleUpcomingQueue(
        importItems.map((item) => ({
          ...item,
          position: item.position,
          queueItemId: playlistItemKey(item),
          status: "queued" as const,
        })),
      );
    }

    if (strategy === "smart" || queueMode === "smartShuffle") {
      const importShuffleItems: SmartShuffleItem[] = importItems.map(
        (item) => ({
          artist: item.channelTitle,
          channelName: item.channelTitle,
          playlistId: playlistPreview.playlistId,
          playlistTitle: playlistPreview.playlistTitle,
          position: item.position,
          queueItemId: playlistItemKey(item),
          sourceUrl: item.sourceUrl,
          status: "queued",
          title: item.title,
          videoId: item.videoId,
        }),
      );
      const historyShuffleItems: SmartShuffleItem[] = historyItems.map(
        (item, index) => ({
          artist: item.artist ?? null,
          channelName: item.channelName ?? null,
          playlistId: item.playlistId ?? null,
          playlistTitle: item.playlistTitle ?? null,
          position: index,
          queueItemId: item.id,
          sourceUrl: item.sourceUrl ?? null,
          status: "played",
          title: item.title,
          videoId: item.videoId ?? null,
        }),
      );

      importItems = smartShuffleQueue(
        importShuffleItems,
        historyShuffleItems,
      ).map((shuffled) => {
        const original = playlistPreview.items.find(
          (item) => playlistItemKey(item) === shuffled.queueItemId,
        );

        return original ?? importItems[0];
      });
    }

    const duplicates = importItems.filter(
      (item) =>
        duplicateVideoIds.has(item.videoId) ||
        duplicateSourceUrls.has(item.sourceUrl),
    );

    if (duplicates.length > 0 && duplicatePreference === "warn") {
      setPendingDuplicateAdd({
        items: importItems,
        kind: "playlist",
        playlistId: playlistPreview.playlistId,
        playlistTitle: playlistPreview.playlistTitle,
        skippedUnavailable,
      });
      notify(
        `${duplicates.length} duplicate playlist item${
          duplicates.length === 1 ? "" : "s"
        } detected.`,
        "warning",
      );
      return;
    }

    await importPlaylistItemsWithFeedback(importItems, {
      allowDuplicates: true,
      playlistId: playlistPreview.playlistId,
      playlistTitle: playlistPreview.playlistTitle,
      skippedUnavailable,
    });
    setQueueUrl("");
    clearPlaylistPreview();
    setAddMediaOpen(false);
  }

  function applyQueueShuffle(strategy: "shuffle" | "smart") {
    if (manageDisabled) {
      return;
    }

    const nextOrder =
      strategy === "smart"
        ? smartShuffleQueue(
            queuedItems.map(toSmartShuffleItem),
            [...historyItems, ...(currentItem ? [currentItem] : [])].map(
              toSmartShuffleItem,
            ),
          )
        : shuffleUpcomingQueue(queuedItems.map(toSmartShuffleItem));

    nextOrder.forEach((item, index) => {
      onMoveQueueItem?.(item.queueItemId, index);
    });

    onQueueModeChange?.(strategy === "smart" ? "smartShuffle" : "shuffle");
  }

  function handleQueueModeChange(nextMode: QueueMode) {
    onQueueModeChange?.(nextMode);

    if (nextMode === "shuffle") {
      applyQueueShuffle("shuffle");
    }

    if (nextMode === "smartShuffle") {
      applyQueueShuffle("smart");
    }
  }

  return (
    <div className={cx("grid min-w-0", hub ? "gap-3" : "gap-4")} id={id}>
      <div
        className={cx(
          hub
            ? "flex min-w-0 flex-wrap items-center justify-between gap-3"
            : undefined,
        )}
      >
        <div className="min-w-0">
          <Badge tone={mode === "listen" ? "amber" : "cyan"}>Queue</Badge>
          <h2
            className={cx(
              "font-semibold text-on-surface",
              hub ? "mt-2 text-body-lg" : "mt-3 text-headline-md",
            )}
          >
          Up next
          </h2>
        </div>
        {hub ? (
          <Button
            className="shrink-0"
            disabled={!isConnected || (!canAddQueue && !canLoadSource)}
            onClick={() => setAddMediaOpen(true)}
            size="sm"
            type="button"
            variant={mode === "listen" ? "secondary" : "primary"}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add Media
          </Button>
        ) : null}
      </div>

      {hub ? null : (
        <Button
          className="w-full"
          disabled={!isConnected || (!canAddQueue && !canLoadSource)}
          onClick={() => setAddMediaOpen(true)}
          type="button"
          variant={mode === "listen" ? "secondary" : "primary"}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Media
        </Button>
      )}

      {addMediaOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[120] grid place-items-center bg-background/72 p-4 backdrop-blur-xl">
              <form
        className={cx(
          "grid max-h-[min(44rem,calc(100dvh-2rem))] w-full max-w-3xl gap-3 overflow-y-auto rounded-lg border bg-surface/95 p-4 shadow-[0_0_48px_rgb(0_0_0_/_0.42)] backdrop-blur-xl",
          mode === "listen"
            ? "border-secondary-fixed-dim/25 shadow-amber-glow"
            : "border-primary-fixed-dim/25 shadow-screen-glow",
        )}
        onSubmit={handleAddQueueItem}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <Badge tone={mode === "listen" ? "amber" : "cyan"}>Add Media</Badge>
            <h3 className="mt-2 text-body-lg font-semibold text-on-surface">
              Add from link
            </h3>
            <p className="text-label-sm text-on-surface-variant">
              Preview a song or playlist before changing the queue.
            </p>
          </div>
          <button
            aria-label="Close add media"
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface"
            onClick={() => {
              setAddMediaOpen(false);
              setPendingDuplicateAdd(null);
            }}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <label className="grid gap-2">
          <span className="technical-label text-on-surface-variant">
            Source URL
          </span>
          <span className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              className="h-10 rounded-md border border-white/10 bg-surface-container-low px-3 text-body-md text-on-surface outline-none transition placeholder:text-on-surface-variant/55 focus:border-primary-fixed-dim focus:ring-2 focus:ring-primary-fixed-dim/20 disabled:opacity-45"
              disabled={!isConnected || (!canAddQueue && !canLoadSource)}
              onChange={(event) => handleUrlChange(event.target.value)}
              placeholder={
                mode === "watch"
                  ? "YouTube, playlist, direct video, or HLS URL"
                  : "YouTube, YouTube Music, playlist, direct audio, or HLS URL"
              }
              value={queueUrl}
            />
            {hasPreviewState ? (
              <Button
                onClick={clearAddMediaState}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear
              </Button>
            ) : null}
          </span>
        </label>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-label-sm text-on-surface-variant">
            {isConnected
              ? "Links preview automatically before changing the queue."
              : "Connect to the live room before queueing."}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              disabled={addDisabled || isImportingPlaylist || !singlePreview}
              size="sm"
              title={!canAddQueue ? "Queue permission required." : undefined}
              type="submit"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add to Queue
            </Button>
            <Button
              disabled={loadDisabled || isImportingPlaylist || !singlePreview}
              onClick={() => void handleLoadSource()}
              size="sm"
              title={
                !canLoadSource ? "Host source loading required." : undefined
              }
              type="button"
              variant="secondary"
            >
              <Play className="h-4 w-4" aria-hidden />
              Load Now
            </Button>
          </div>
        </div>
        {isImportingPlaylist || previewLoading ? (
          <SignalInlineStatus
            state={{
              detail: "Checking the pasted media source.",
              label: "Loading preview",
              state: "loading",
              tone: "info",
            }}
          />
        ) : null}
        <YouTubeAddMediaSearch
          canAddQueue={!addDisabled}
          canLoadSource={!loadDisabled}
          duplicateVideoIds={duplicateVideoIds}
          mode={mode}
          onAddResult={(item) => {
            void addSearchResult(item);
          }}
          onLoadResult={(item) => {
            void loadSearchResult(item);
          }}
          onPlayNextResult={(item) => {
            void playSearchResultNext(item);
          }}
          roomId={roomId}
        />
        {singlePreview ? (
          <SinglePreviewCard
            duplicate={isDuplicateQueueSource(singlePreview)}
            mode={mode}
            preview={singlePreview}
          />
        ) : null}
        {playlistPreview ? (
          <PlaylistPreviewCard
            addDisabled={addDisabled}
            duplicateSourceUrls={duplicateSourceUrls}
            duplicateVideoIds={duplicateVideoIds}
            mode={mode}
            onCancel={clearPlaylistPreview}
            onImport={(strategy) => {
              void importPlaylist(strategy);
            }}
            onSelectionChange={setSelectedPlaylistIds}
            preview={playlistPreview}
            selectedIds={selectedPlaylistIds}
          />
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
        {pendingDuplicateAdd ? (
          <DuplicateConfirmation
            mode={mode}
            onCancel={() => setPendingDuplicateAdd(null)}
            onConfirm={(remember) => {
              rememberDuplicatePreference(remember);

              if (pendingDuplicateAdd.kind === "single") {
                addQueueItemWithFeedback({
                  ...pendingDuplicateAdd.item,
                  allowDuplicate: true,
                });
              } else {
                void importPlaylistItemsWithFeedback(
                  pendingDuplicateAdd.items,
                  {
                    allowDuplicates: true,
                    playlistId: pendingDuplicateAdd.playlistId,
                    playlistTitle: pendingDuplicateAdd.playlistTitle,
                    skippedUnavailable: pendingDuplicateAdd.skippedUnavailable,
                  },
                );
              }

              setPendingDuplicateAdd(null);
              setQueueUrl("");
              clearPlaylistPreview();
              setAddMediaOpen(false);
            }}
            onConfirmWithoutDuplicates={
              pendingDuplicateAdd.kind === "playlist"
                ? () => {
                    void importPlaylistItemsWithFeedback(
                      pendingDuplicateAdd.items,
                      {
                        allowDuplicates: false,
                        playlistId: pendingDuplicateAdd.playlistId,
                        playlistTitle: pendingDuplicateAdd.playlistTitle,
                        skippedUnavailable:
                          pendingDuplicateAdd.skippedUnavailable,
                      },
                    );
                    setPendingDuplicateAdd(null);
                    clearAddMediaState();
                    setAddMediaOpen(false);
                  }
                : undefined
            }
            pending={pendingDuplicateAdd}
          />
        ) : null}
      </form>
            </div>,
            document.body,
          )
        : null}

      <QueueNotifications notifications={notifications} />

      <div
        className={cx(
          "overflow-hidden rounded-md border border-white/10 bg-surface-container-low/80 transition-[max-height,background-color,border-color] duration-200",
          queueControlsOpen ? (hub ? "max-h-56" : "max-h-72") : "max-h-9",
        )}
      >
        {queueControlsOpen ? (
          <div className={cx("grid gap-3 p-3 pb-2", hub && "gap-2 p-2")}>
            <div className="flex items-center justify-between gap-2">
              <span className="technical-label text-on-surface-variant">
                Queue controls
              </span>
              {queueMode === "loop" ? (
                <Badge tone={mode === "listen" ? "amber" : "cyan"}>
                  Loop Queue
                </Badge>
              ) : queueMode === "autoplayRelated" ? (
                <Badge tone="amber">Related</Badge>
              ) : null}
            </div>
            <div className={cx("grid gap-2", hub && "gap-1.5")}>
              <select
                className={cx(
                  "rounded-md border border-white/10 bg-surface-container px-3 text-on-surface outline-none focus:border-primary-fixed-dim disabled:opacity-45",
                  hub ? "h-9 text-label-sm" : "h-10 text-body-md",
                )}
                disabled={manageDisabled}
                onChange={(event) =>
                  handleQueueModeChange(event.target.value as QueueMode)
                }
                title={
                  !canManageQueue
                    ? "Host queue management required."
                    : undefined
                }
                value={queueMode}
              >
                {queueModeOptions.map((option) => (
                  <option key={option.mode} value={option.mode}>
                    {option.label}
                  </option>
                ))}
              </select>
              {queueMode === "autoplayRelated" ? (
                <p className="text-label-sm text-on-surface-variant">
                  Autoplay will add related tracks when provider recommendations
                  are wired. No fake related items are generated.
                </p>
              ) : queueMode === "smartShuffle" ? (
                <p className="text-label-sm text-on-surface-variant">
                  Smart Shuffle keeps current and history stable while varying
                  upcoming artists, channels, and playlist sources.
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                disabled={manageDisabled || queuedItems.length < 2}
                onClick={() => applyQueueShuffle("shuffle")}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Shuffle className="h-4 w-4" aria-hidden />
                Shuffle
              </Button>
              <Button
                disabled={manageDisabled || queuedItems.length < 2}
                onClick={() => applyQueueShuffle("smart")}
                size="sm"
                type="button"
                variant="ghost"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Smart
              </Button>
              <Button
                disabled={manageDisabled || queuedItems.length === 0}
                onClick={onClearQueue}
                size="sm"
                type="button"
                variant="ghost"
              >
                <X className="h-4 w-4" aria-hidden />
                Clear
              </Button>
            </div>
          </div>
        ) : null}
        <button
          aria-expanded={queueControlsOpen}
          aria-label={
            queueControlsOpen ? "Hide queue controls" : "Show queue controls"
          }
          className={cx(
            "mx-auto flex h-9 w-full items-center justify-center border-t border-white/10 text-on-surface-variant transition hover:bg-surface-variant/25 hover:text-on-surface",
            !queueControlsOpen && "border-t-0",
          )}
          onClick={() => setQueueControlsOpen((open) => !open)}
          type="button"
        >
          <span className="inline-flex h-6 w-12 items-center justify-center rounded-sm border border-white/10 bg-surface-container text-primary-fixed-dim">
            {queueControlsOpen ? (
              <ChevronUp className="h-4 w-4" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4" aria-hidden />
            )}
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-surface-container-lowest p-1">
        {[
          { id: "up-next", label: "Up Next" },
          { id: "history", label: "History" },
        ].map((tab) => (
          <button
            className={`h-9 rounded-sm px-3 text-label-sm font-semibold transition ${
              activeQueueTab === tab.id
                ? mode === "listen"
                  ? "bg-secondary-fixed-dim/12 text-secondary-fixed-dim"
                  : "bg-primary-fixed-dim/12 text-primary-fixed-dim"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            key={tab.id}
            onClick={() =>
              setActiveQueueTab(tab.id === "history" ? "history" : "up-next")
            }
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeQueueTab === "up-next" ? (
        upcomingItems.length > 0 ? (
          <ol className="grid gap-2">
            {upcomingItems.map((item) => {
              const queuedIndex = queuedItems.findIndex(
                (queuedItem) => queuedItem.id === item.id,
              );

              return (
                <QueueRow
                  item={item}
                  key={item.id}
                  manageDisabled={manageDisabled}
                  mode={mode}
                  onMoveQueueItem={onMoveQueueItem}
                  onPlayNext={(queueItem) => {
                    onQueueItemPriorityChange?.(queueItem.id, {
                      isPlayNext: !queueItem.isPlayNext,
                    });
                  }}
                  onPin={(queueItem) => {
                    onQueueItemPriorityChange?.(queueItem.id, {
                      isPinned: !queueItem.isPinned,
                    });
                  }}
                  onPlayQueueItem={onPlayQueueItem}
                  onRemoveQueueItem={onRemoveQueueItem}
                  queuedIndex={queuedIndex}
                  queuedItemsLength={queuedItems.length}
                />
              );
            })}
          </ol>
        ) : (
          <div className="rounded-md border border-dashed border-white/10 bg-surface-container-low p-4 text-body-md text-on-surface-variant">
            {mode === "listen"
              ? "No queue items yet. Add YouTube, YouTube Music, direct audio, HLS, or playlist links."
              : "No queue items yet. Add a YouTube, playlist, direct media, or HLS URL."}
          </div>
        )
      ) : previousItems.length > 0 ? (
        <div className="grid gap-2">
          <p className="text-label-sm text-on-surface-variant">
            Showing server-recorded playback history in played order.
          </p>
          <ol className="grid gap-2">
            {previousItems.map((item) => (
              <QueueRow
                item={item}
                key={item.id}
                manageDisabled={manageDisabled}
                mode={mode}
                onPlayNext={(queueItem) => {
                  onAddQueueItem?.({
                    artist: queueItem.artist,
                    channelName: queueItem.channelName,
                    isPlayNext: true,
                    playlistId: queueItem.playlistId,
                    playlistTitle: queueItem.playlistTitle,
                    sourceTitle: queueItem.title,
                    sourceType: queueItem.sourceType ?? "youtube",
                    sourceUrl: queueItem.sourceUrl ?? "",
                    thumbnailUrl: queueItem.thumbnailUrl,
                  });
                }}
                onPlayQueueItem={onPlayQueueItem}
                onRequeue={(queueItem) => {
                  onAddQueueItem?.({
                    artist: queueItem.artist,
                    channelName: queueItem.channelName,
                    playlistId: queueItem.playlistId,
                    playlistTitle: queueItem.playlistTitle,
                    sourceTitle: queueItem.title,
                    sourceType: queueItem.sourceType ?? "youtube",
                    sourceUrl: queueItem.sourceUrl ?? "",
                    thumbnailUrl: queueItem.thumbnailUrl,
                  });
                }}
                onRemoveQueueItem={onRemoveQueueItem}
                queuedIndex={-1}
                queuedItemsLength={queuedItems.length}
              />
            ))}
          </ol>
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-white/10 bg-surface-container-low p-4 text-body-md text-on-surface-variant">
          No previous items yet. Played songs will appear here.
        </div>
      )}
    </div>
  );
}

async function fetchFirstPartyMediaMatches(videoIds: string[]) {
  const uniqueVideoIds = Array.from(
    new Set(videoIds.filter((videoId) => /^[a-zA-Z0-9_-]{11}$/.test(videoId))),
  );

  if (uniqueVideoIds.length === 0) {
    return new Map<string, MediaLibraryAsset>();
  }

  const response = await fetch("/api/media/source-matches", {
    body: JSON.stringify({
      sources: uniqueVideoIds.map((videoId) => ({
        sourceId: videoId,
        sourceType: "youtube",
      })),
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json()) as {
    assets?: MediaLibraryAsset[];
  };

  if (!response.ok || !payload.assets) {
    return new Map<string, MediaLibraryAsset>();
  }

  const matches = new Map<string, MediaLibraryAsset>();

  for (const asset of payload.assets) {
    for (const match of asset.sourceMatches) {
      if (match.sourceType === "youtube") {
        matches.set(match.sourceId, asset);
      }
    }
  }

  return matches;
}

function playlistItemToQueueInput(
  item: PlaylistPreviewItem,
  options: {
    playlistId?: string | null;
    playlistTitle?: string | null;
  },
): QueueAddInput {
  return {
    artist: item.channelTitle ?? undefined,
    channelName: item.channelTitle ?? undefined,
    durationSeconds: item.durationSeconds ?? undefined,
    playlistId: options.playlistId ?? undefined,
    playlistTitle: options.playlistTitle ?? undefined,
    sourceTitle: item.title,
    sourceType: "youtube",
    sourceUrl: item.sourceUrl,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
  };
}

function firstPartyAssetToQueueInput(
  asset: MediaLibraryAsset,
  item: Pick<
    PlaylistPreviewItem,
    "channelTitle" | "durationSeconds" | "sourceUrl" | "thumbnailUrl" | "title"
  >,
): QueueAddInput {
  return {
    artist: item.channelTitle ?? "Mistake Watch Library",
    channelName: item.channelTitle ?? undefined,
    durationSeconds: asset.durationSeconds ?? item.durationSeconds ?? undefined,
    playlistId: undefined,
    playlistTitle: "Matched first-party media",
    sourceTitle: asset.title || item.title,
    sourceType: "direct",
    sourceUrl: createUploadedAssetReference(asset.id),
    thumbnailUrl: asset.thumbnailUrl ?? item.thumbnailUrl ?? undefined,
  };
}

function SinglePreviewCard({
  duplicate,
  mode,
  preview,
}: {
  duplicate: boolean;
  mode: "listen" | "watch";
  preview: QueueAddInput;
}) {
  return (
    <div className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 rounded-md border border-white/10 bg-surface-container-low p-3">
      <QueueImage thumbnailUrl={preview.thumbnailUrl} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={mode === "listen" ? "amber" : "cyan"}>
            Single preview
          </Badge>
          {duplicate ? <Badge tone="amber">Duplicate</Badge> : null}
        </div>
        <p className="mt-2 truncate text-body-md font-semibold text-on-surface">
          {preview.sourceTitle}
        </p>
        <p className="truncate text-label-sm text-on-surface-variant">
          {preview.channelName ?? preview.artist ?? preview.sourceType}
          {preview.durationSeconds
            ? ` / ${formatDuration(preview.durationSeconds)}`
            : ""}
        </p>
        {duplicate ? (
          <p className="mt-1 text-label-sm text-secondary-fixed-dim">
            This source is already in the active queue.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function PlaylistPreviewCard({
  addDisabled,
  duplicateSourceUrls,
  duplicateVideoIds,
  mode,
  onCancel,
  onImport,
  onSelectionChange,
  preview,
  selectedIds,
}: {
  addDisabled: boolean;
  duplicateSourceUrls: Set<string>;
  duplicateVideoIds: Set<string>;
  mode: "listen" | "watch";
  onCancel(): void;
  onImport(strategy: "all" | "selected" | "shuffle" | "smart"): void;
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
  const playableItems = preview.items.filter((item) => !item.isUnavailable);
  const isDuplicateItem = (item: PlaylistPreviewItem) =>
    duplicateVideoIds.has(item.videoId) ||
    duplicateSourceUrls.has(item.sourceUrl);
  const duplicateCount = playableItems.filter(isDuplicateItem).length;
  const visibleItems = playableItems
    .filter((item) => {
      const searchable =
        `${item.title} ${item.channelTitle ?? ""}`.toLowerCase();
      const matchesQuery = searchable.includes(query.toLowerCase());
      const durationLimit =
        durationFilter === "short"
          ? 180
          : durationFilter === "medium"
            ? 360
            : durationFilter === "long"
              ? 600
            : null;

      return (
        matchesQuery &&
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
  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedIds.has(playlistItemKey(item)));

  function setVisibleSelected(selected: boolean) {
    const next = new Set(selectedIds);

    for (const item of visibleItems) {
      if (selected) {
        next.add(playlistItemKey(item));
      } else {
        next.delete(playlistItemKey(item));
      }
    }

    onSelectionChange(next);
  }

  return (
    <div className="grid max-h-[min(34rem,calc(100dvh-12rem))] min-h-0 grid-rows-[auto_auto_auto_auto_minmax(0,1fr)_auto] gap-3 overflow-hidden rounded-md border border-primary-fixed-dim/25 bg-surface-container-low p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Badge tone={mode === "listen" ? "amber" : "cyan"}>
            Playlist detected
          </Badge>
          <p className="mt-2 truncate text-body-md font-semibold text-on-surface">
            {preview.playlistTitle ?? "YouTube playlist"}
          </p>
          <p className="text-label-sm text-on-surface-variant">
            {preview.items.filter((item) => !item.isUnavailable).length} playable videos found
            {preview.skippedUnavailable
              ? ` / ${preview.skippedUnavailable} unavailable skipped`
              : ""}
            {duplicateCount ? ` / ${duplicateCount} duplicate` : ""}
          </p>
        </div>
        <button
          aria-label="Cancel playlist import"
          className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant hover:text-on-surface"
          onClick={onCancel}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {preview.reason ? (
        <p className="text-label-sm text-error">{preview.reason}</p>
      ) : null}
      <div className="grid gap-2 rounded-sm border border-white/10 bg-surface-container-lowest p-2 md:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          className="h-9 min-w-0 rounded-sm border border-white/10 bg-surface-container px-3 text-label-sm text-on-surface outline-none placeholder:text-on-surface-variant/55 focus:border-primary-fixed-dim"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search playlist"
          value={query}
        />
        <select
          className="h-9 rounded-sm border border-white/10 bg-surface-container px-2 text-label-sm text-on-surface outline-none focus:border-primary-fixed-dim"
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
          className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-white/10 bg-surface-container px-2 text-label-sm text-on-surface transition hover:bg-surface-variant/35"
          onClick={() => setMoreOptionsOpen((open) => !open)}
          type="button"
        >
          <MoreVertical className="h-4 w-4" aria-hidden />
          More
        </button>
      </div>
      {moreOptionsOpen ? (
        <div className="grid gap-2 rounded-sm border border-primary-fixed-dim/25 bg-surface-container p-3 shadow-[0_12px_28px_rgba(0,0,0,0.28)]">
          <span className="technical-label text-primary-fixed-dim">
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
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={visibleItems.length === 0}
          onClick={() => setVisibleSelected(!allVisibleSelected)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {allVisibleSelected ? "Clear visible" : "Select visible"}
        </Button>
        <Button
          disabled={playableItems.length === 0}
          onClick={() =>
            onSelectionChange(
              new Set(playableItems.map((item) => playlistItemKey(item))),
            )
          }
          size="sm"
          type="button"
          variant="ghost"
        >
          Select all
        </Button>
        <Button
          disabled={selectedIds.size === 0}
          onClick={() => onSelectionChange(new Set())}
          size="sm"
          type="button"
          variant="ghost"
        >
          Clear selection
        </Button>
      </div>
      <div className="grid min-h-0 gap-1.5 overflow-y-auto pr-1 [scrollbar-color:rgb(255_186_32_/_0.42)_transparent] [scrollbar-width:thin]">
        {visibleItems.map((item) => {
          const itemKey = playlistItemKey(item);
          const selected = selectedIds.has(itemKey);
          const unavailable = item.isUnavailable;
          const duplicate = isDuplicateItem(item);

          return (
            <label
              className={cx(
                "grid grid-cols-[auto_2.75rem_minmax(0,1fr)_auto] items-center gap-2 rounded-sm border border-white/10 bg-surface-container/70 p-1.5",
                unavailable
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer",
              )}
              key={itemKey}
            >
              <input
                checked={selected}
                className="accent-primary-fixed-dim"
                disabled={unavailable}
                onChange={() => {
                  if (unavailable) {
                    return;
                  }

                  const next = new Set(selectedIds);

                  if (selected) {
                    next.delete(itemKey);
                  } else {
                    next.add(itemKey);
                  }

                  onSelectionChange(next);
                }}
                type="checkbox"
              />
              <QueueImage thumbnailUrl={item.thumbnailUrl} />
              <span className="min-w-0">
                <span className="block truncate text-label-sm font-semibold text-on-surface">
                  {item.title}
                </span>
                <span className="block truncate text-[11px] text-on-surface-variant">
                  {item.channelTitle ?? "YouTube"}
                </span>
              </span>
              {unavailable ? (
                <Badge tone="amber">
                  {getYouTubeAvailabilityLabel(item.availability)}
                </Badge>
              ) : duplicate ? (
                <Badge tone="amber">Duplicate</Badge>
              ) : null}
            </label>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={addDisabled || preview.items.length === 0}
          onClick={() => onImport("all")}
          size="sm"
          type="button"
        >
          <ListPlus className="h-4 w-4" aria-hidden />
          Add All
        </Button>
        <Button
          disabled={addDisabled || preview.items.length === 0}
          onClick={() => onImport("shuffle")}
          size="sm"
          type="button"
          variant="secondary"
        >
          <Shuffle className="h-4 w-4" aria-hidden />
          Shuffle Add
        </Button>
        <Button
          disabled={addDisabled || preview.items.length === 0}
          onClick={() => onImport("smart")}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Smart Add
        </Button>
        <Button
          disabled={addDisabled || selectedIds.size === 0}
          onClick={() => onImport("selected")}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ChevronsUp className="h-4 w-4" aria-hidden />
          Add Selected
        </Button>
      </div>
    </div>
  );
}

function DuplicateConfirmation({
  mode,
  onCancel,
  onConfirm,
  onConfirmWithoutDuplicates,
  pending,
}: {
  mode: "listen" | "watch";
  onCancel(): void;
  onConfirm(remember: boolean): void;
  onConfirmWithoutDuplicates?: () => void;
  pending: PendingDuplicateAdd;
}) {
  const [remember, setRemember] = useState(false);
  const duplicateLabel =
    pending.kind === "single"
      ? pending.item.sourceTitle
      : `${pending.items.length} playlist items`;

  return (
    <div className="grid gap-3 rounded-md border border-secondary-fixed-dim/35 bg-secondary-fixed-dim/10 p-3">
      <div>
        <Badge tone="amber">Duplicate detected</Badge>
        <p className="mt-2 text-body-md font-semibold text-on-surface">
          {duplicateLabel} already appears in the active queue.
        </p>
        <p className="mt-1 text-label-sm text-on-surface-variant">
          Add it again only if you want a repeated queue entry.
        </p>
      </div>
      <label className="inline-flex items-center gap-2 text-label-sm text-on-surface-variant">
        <input
          checked={remember}
          className={
            mode === "listen"
              ? "accent-secondary-fixed-dim"
              : "accent-primary-fixed-dim"
          }
          onChange={(event) => setRemember(event.currentTarget.checked)}
          type="checkbox"
        />
        Remember my choice and add duplicates without asking
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={onCancel} size="sm" type="button" variant="ghost">
          Cancel
        </Button>
        {pending.kind === "playlist" && onConfirmWithoutDuplicates ? (
          <Button
            onClick={onConfirmWithoutDuplicates}
            size="sm"
            type="button"
            variant="secondary"
          >
            Add without duplicates
          </Button>
        ) : null}
        <Button onClick={() => onConfirm(remember)} size="sm" type="button">
          Add anyway
        </Button>
      </div>
    </div>
  );
}

function QueueNotifications({
  notifications,
}: {
  notifications: QueueNotification[];
}) {
  if (notifications.length === 0) {
    return null;
  }

  return (
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
  );
}

function QueueRow({
  item,
  manageDisabled,
  mode,
  onMoveQueueItem,
  onPin,
  onPlayNext,
  onPlayQueueItem,
  onRemoveQueueItem,
  onRequeue,
  queuedIndex,
  queuedItemsLength,
}: {
  item: RoomQueueItem;
  manageDisabled: boolean;
  mode: "listen" | "watch";
  onMoveQueueItem?(queueItemId: string, position: number): void;
  onPin?(item: RoomQueueItem): void;
  onPlayNext?(item: RoomQueueItem): void;
  onPlayQueueItem?(queueItemId: string): void;
  onRemoveQueueItem?(queueItemId: string): void;
  onRequeue?(item: RoomQueueItem): void;
  queuedIndex: number;
  queuedItemsLength: number;
}) {
  const metadata = useYouTubeMetadata(
    item.sourceType === "youtube" ? item.sourceUrl : null,
  );
  const title = metadata.metadata?.title ?? item.title;
  const channel = metadata.metadata?.channelTitle ?? item.channelName;
  const thumbnailUrl = metadata.metadata?.thumbnailUrl ?? item.thumbnailUrl;
  const duration =
    metadata.metadata?.durationSeconds !== null &&
    metadata.metadata?.durationSeconds !== undefined
      ? formatDuration(metadata.metadata.durationSeconds)
      : item.duration;
  const isQueued = item.status === "queued";
  const isActive = item.status === "now";
  const isBlocked =
    item.isUnavailable || metadata.metadata?.availability?.playable === false;
  const activeTone =
    mode === "listen"
      ? "border-secondary-fixed-dim/40 bg-secondary-fixed-dim/10 shadow-[0_0_24px_rgba(255,186,32,0.08)]"
      : "border-primary-fixed-dim/40 bg-primary-fixed-dim/10 shadow-[0_0_24px_rgba(0,219,233,0.08)]";

  return (
    <li
      className={cx(
        "relative grid grid-cols-[3.75rem_minmax(0,1fr)] items-start gap-2 rounded-md border bg-surface-container-low/82 p-2 pr-9 transition",
        isActive ? activeTone : "border-white/10",
      )}
    >
      <button
        aria-label={`Remove ${title}`}
        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-sm border border-error/30 text-error transition hover:bg-error-container/25 disabled:cursor-not-allowed disabled:opacity-35"
        disabled={manageDisabled}
        onClick={() => onRemoveQueueItem?.(item.id)}
        title={
          manageDisabled
            ? "Permission or queue state does not allow this."
            : `Remove ${title}`
        }
        type="button"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </button>
      <QueueThumbnail item={item} mode={mode} thumbnailUrl={thumbnailUrl} />
      <div className="min-w-0 pt-0.5">
        <div className="flex min-w-0 items-start gap-1.5 pr-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-on-surface">
            {title}
          </p>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
          {channel ? `${channel} / ` : item.artist ? `${item.artist} / ` : null}
          {duration}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {item.status === "now" ? (
            <Badge tone={mode === "listen" ? "amber" : "cyan"}>Now</Badge>
          ) : item.status === "played" ? (
            <Badge tone="neutral">Previous</Badge>
          ) : queuedIndex === 0 ? (
            <Badge tone={mode === "listen" ? "amber" : "cyan"}>Next</Badge>
          ) : null}
          {item.isPinned ? <Badge tone="neutral">Pinned</Badge> : null}
          {item.isPlayNext ? <Badge tone="neutral">Play Next</Badge> : null}
          {item.playlistId ? <Badge tone="neutral">Playlist</Badge> : null}
          {item.isUnavailable ? <Badge tone="amber">Unavailable</Badge> : null}
        </div>
        {item.sourceType === "youtube" && metadata.status !== "available" ? (
          metadata.loading ? (
            <MetadataPlaceholderChips className="mt-1" compact />
          ) : (
            <span className="technical-label mt-1 block text-on-surface-variant/80">
              Metadata unavailable
            </span>
          )
        ) : null}
        {isBlocked ? (
          <p className="mt-1 text-label-sm text-error">
            {metadata.metadata?.availability.reason ??
              "This YouTube item is known unavailable."}
          </p>
        ) : null}
        <div className="mt-1.5 flex flex-wrap items-center justify-end gap-1">
          {isQueued ? (
            <>
              <IconQueueButton
                disabled={manageDisabled || queuedIndex <= 0}
                icon={<ArrowUp className="h-4 w-4" aria-hidden />}
                label={`Move ${title} up`}
                onClick={() => onMoveQueueItem?.(item.id, queuedIndex - 1)}
              />
              <IconQueueButton
                disabled={
                  manageDisabled ||
                  queuedIndex < 0 ||
                  queuedIndex >= queuedItemsLength - 1
                }
                icon={<ArrowDown className="h-4 w-4" aria-hidden />}
                label={`Move ${title} down`}
                onClick={() => onMoveQueueItem?.(item.id, queuedIndex + 1)}
              />
              <IconQueueButton
                disabled={manageDisabled}
                icon={<ChevronsUp className="h-4 w-4" aria-hidden />}
                label={`${item.isPlayNext ? "Unset" : "Set"} ${title} as play next`}
                onClick={() => onPlayNext?.(item)}
              />
              <IconQueueButton
                disabled={manageDisabled}
                icon={<Pin className="h-4 w-4" aria-hidden />}
                label={`${item.isPinned ? "Unpin" : "Pin"} ${title}`}
                onClick={() => onPin?.(item)}
              />
            </>
          ) : item.status === "played" ? (
            <>
              <IconQueueButton
                disabled={manageDisabled}
                icon={<RotateCcw className="h-4 w-4" aria-hidden />}
                label={`Requeue ${title}`}
                onClick={() => onRequeue?.(item)}
              />
              <IconQueueButton
                disabled={manageDisabled}
                icon={<ChevronsUp className="h-4 w-4" aria-hidden />}
                label={`Play ${title} next`}
                onClick={() => onPlayNext?.(item)}
              />
            </>
          ) : null}
          {item.status !== "now" ? (
            <IconQueueButton
              disabled={manageDisabled || isBlocked}
              icon={<Play className="h-4 w-4" aria-hidden />}
              label={
                item.status === "played"
                  ? `Play ${title} again`
                  : `Play ${title} now`
              }
              onClick={() => onPlayQueueItem?.(item.id)}
              tone="primary"
            />
          ) : (
            <span
              className={cx(
                "inline-flex h-7 items-center gap-1 rounded-sm border px-2 text-label-sm",
                mode === "listen"
                  ? "border-secondary-fixed-dim/40 text-secondary-fixed-dim"
                  : "border-primary-fixed-dim/40 text-primary-fixed-dim",
              )}
            >
              <ListPlus className="h-4 w-4" aria-hidden />
              Active
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function IconQueueButton({
  disabled,
  icon,
  label,
  onClick,
  tone = "neutral",
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick?(): void;
  tone?: "danger" | "neutral" | "primary";
}) {
  return (
    <button
      aria-label={label}
      className={cx(
        "inline-flex h-7 w-7 items-center justify-center rounded-sm border transition disabled:cursor-not-allowed disabled:opacity-35",
        tone === "primary"
          ? "border-primary-fixed-dim/35 text-primary-fixed-dim hover:bg-primary-fixed-dim/10"
          : tone === "danger"
            ? "border-error/30 text-error hover:bg-error-container/25"
            : "border-white/10 text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
      )}
      disabled={disabled}
      onClick={onClick}
      title={
        disabled ? "Permission or queue state does not allow this." : label
      }
      type="button"
    >
      {icon}
    </button>
  );
}

function QueueThumbnail({
  item,
  mode,
  thumbnailUrl,
}: {
  item: RoomQueueItem;
  mode: "listen" | "watch";
  thumbnailUrl?: string | null;
}) {
  const Icon = mode === "listen" ? Music2 : Film;

  if (thumbnailUrl) {
    return <QueueImage thumbnailUrl={thumbnailUrl} />;
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-md border border-white/10 bg-surface-container text-on-surface-variant">
      <Icon className="h-5 w-5" aria-hidden />
      <span className="sr-only">{item.title}</span>
    </div>
  );
}

function QueueImage({ thumbnailUrl }: { thumbnailUrl?: string | null }) {
  if (!thumbnailUrl) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-white/10 bg-surface-container text-on-surface-variant">
        <Film className="h-4 w-4" aria-hidden />
      </div>
    );
  }

  return (
    <div className="h-14 w-14 overflow-hidden rounded-sm border border-white/10 bg-surface-container">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
        src={thumbnailUrl}
      />
    </div>
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
    status:
      item.status === "now"
        ? ("playing" as const)
        : item.status === "played"
          ? ("played" as const)
          : ("queued" as const),
    title: item.title,
    videoId: item.videoId,
  };
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
