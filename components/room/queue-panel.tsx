"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  Film,
  ListPlus,
  Loader2,
  Music2,
  Pin,
  Play,
  Plus,
  RotateCcw,
  Shuffle,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Button } from "@/components/ui";
import {
  detectUrlType,
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
import { cx } from "@/lib/ui";
import { fetchPlaylistPreview } from "@/lib/youtube/playlist-client";
import type {
  YouTubePlaylistItem,
  YouTubePlaylistPreviewResponse,
} from "@/lib/youtube/playlist";
import { useYouTubeMetadata } from "@/lib/youtube/use-youtube-metadata";

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
  queueMode?: QueueMode;
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

type PlaylistPreview = YouTubePlaylistPreviewResponse;
type PlaylistPreviewItem = YouTubePlaylistItem;

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
  queueMode = "normal",
}: QueuePanelProps) {
  const [activeQueueTab, setActiveQueueTab] = useState<"history" | "up-next">(
    "up-next",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [playlistPreview, setPlaylistPreview] =
    useState<PlaylistPreview | null>(null);
  const [queueControlsOpen, setQueueControlsOpen] = useState(true);
  const [queueUrl, setQueueUrl] = useState("");
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<Set<string>>(
    () => new Set(),
  );
  const queuedItems = items.filter((item) => item.status === "queued");
  const previousItems = items
    .filter((item) => item.status === "played")
    .slice(-1);
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

  function clearPlaylistPreview() {
    setPlaylistPreview(null);
    setSelectedPlaylistIds(new Set());
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

    if (detectUrlType(value) !== "youtube-playlist") {
      clearPlaylistPreview();
    }
  }

  function handleAddQueueItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = parseQueueUrl();

    if (!input) {
      return;
    }

    onAddQueueItem?.(input);
    setQueueUrl("");
  }

  function handleLoadSource() {
    const input = parseQueueUrl();

    if (!input) {
      return;
    }

    onLoadSource?.(input);
    setQueueUrl("");
  }

  function importPlaylist(strategy: "all" | "selected" | "shuffle" | "smart") {
    if (!playlistPreview || addDisabled) {
      return;
    }

    let importItems = playlistPreview.items.filter((item) =>
      strategy === "selected" ? selectedPlaylistIds.has(item.videoId) : true,
    );

    if (strategy === "shuffle") {
      importItems = shuffleUpcomingQueue(
        importItems.map((item) => ({
          ...item,
          position: item.position,
          queueItemId: item.videoId,
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
          queueItemId: item.videoId,
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
          (item) => item.videoId === shuffled.videoId,
        );

        return original ?? importItems[0];
      });
    }

    const seenInBatch = new Set<string>();
    let added = 0;
    let skippedDuplicates = 0;

    for (const item of importItems) {
      if (
        seenInBatch.has(item.videoId) ||
        duplicateVideoIds.has(item.videoId) ||
        duplicateSourceUrls.has(item.sourceUrl)
      ) {
        skippedDuplicates += 1;
        continue;
      }

      seenInBatch.add(item.videoId);
      added += 1;
      onAddQueueItem?.({
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
    }

    setImportSummary(
      `Added ${added} videos. Skipped ${skippedDuplicates} duplicates and ${playlistPreview.skippedUnavailable} unavailable.`,
    );
    setQueueUrl("");
    clearPlaylistPreview();
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
    <div className="grid min-w-0 gap-4" id={id}>
      <div>
        <Badge tone={mode === "listen" ? "amber" : "cyan"}>Queue</Badge>
        <h2 className="mt-3 text-headline-md font-semibold text-on-surface">
          Up next
        </h2>
      </div>

      <form
        className={cx(
          "sticky top-0 z-10 grid gap-3 rounded-md border bg-surface/95 p-3 backdrop-blur-xl",
          mode === "listen"
            ? "border-secondary-fixed-dim/25 shadow-amber-glow"
            : "border-primary-fixed-dim/25 shadow-screen-glow",
        )}
        onSubmit={handleAddQueueItem}
      >
        <label className="grid gap-2">
          <span className="technical-label text-on-surface-variant">
            Add media
          </span>
          <input
            className="h-10 rounded-md border border-white/10 bg-surface-container-low px-3 text-body-md text-on-surface outline-none transition placeholder:text-on-surface-variant/55 focus:border-primary-fixed-dim focus:ring-2 focus:ring-primary-fixed-dim/20 disabled:opacity-45"
            disabled={!isConnected || (!canAddQueue && !canLoadSource)}
            onBlur={() => {
              if (detectUrlType(queueUrl) === "youtube-playlist") {
                void detectPlaylist(queueUrl);
              }
            }}
            onChange={(event) => handleUrlChange(event.target.value)}
            placeholder={
              mode === "watch"
                ? "YouTube, playlist, direct video, or HLS URL"
                : "YouTube, YouTube Music, playlist, direct audio, or HLS URL"
            }
            value={queueUrl}
          />
        </label>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 text-label-sm text-on-surface-variant">
            {isConnected
              ? "Playlist links open a preview before importing."
              : "Connect to the live room before queueing."}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              disabled={addDisabled || isImportingPlaylist}
              size="sm"
              title={!canAddQueue ? "Queue permission required." : undefined}
              type="submit"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add
            </Button>
            <Button
              disabled={loadDisabled || isImportingPlaylist}
              onClick={handleLoadSource}
              size="sm"
              title={
                !canLoadSource ? "Host source loading required." : undefined
              }
              type="button"
              variant="secondary"
            >
              <Play className="h-4 w-4" aria-hidden />
              Load
            </Button>
          </div>
        </div>
        {isImportingPlaylist ? (
          <p className="inline-flex items-center gap-2 text-label-sm text-on-surface-variant">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading playlist preview
          </p>
        ) : null}
        {playlistPreview ? (
          <PlaylistPreviewCard
            addDisabled={addDisabled}
            mode={mode}
            onCancel={clearPlaylistPreview}
            onImport={importPlaylist}
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
      </form>

      <div
        className={cx(
          "overflow-hidden rounded-md border border-white/10 bg-surface-container-low/80 transition-[max-height,background-color,border-color] duration-200",
          queueControlsOpen ? "max-h-72" : "max-h-9",
        )}
      >
        {queueControlsOpen ? (
          <div className="grid gap-3 p-3 pb-2">
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
            <div className="grid gap-2">
              <select
                className="h-10 rounded-md border border-white/10 bg-surface-container px-3 text-body-md text-on-surface outline-none focus:border-primary-fixed-dim disabled:opacity-45"
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
            Showing 1 previous item. Account settings can later raise this to
            10.
          </p>
          <ol className="grid gap-2">
            {previousItems.map((item) => (
              <QueueRow
                item={item}
                key={item.id}
                manageDisabled={!isConnected || !canAddQueue}
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

function PlaylistPreviewCard({
  addDisabled,
  mode,
  onCancel,
  onImport,
  onSelectionChange,
  preview,
  selectedIds,
}: {
  addDisabled: boolean;
  mode: "listen" | "watch";
  onCancel(): void;
  onImport(strategy: "all" | "selected" | "shuffle" | "smart"): void;
  onSelectionChange(ids: Set<string>): void;
  preview: PlaylistPreview;
  selectedIds: Set<string>;
}) {
  const visibleItems = preview.items.slice(0, 5);

  return (
    <div className="grid gap-3 rounded-md border border-primary-fixed-dim/25 bg-surface-container-low p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Badge tone={mode === "listen" ? "amber" : "cyan"}>
            Playlist detected
          </Badge>
          <p className="mt-2 truncate text-body-md font-semibold text-on-surface">
            {preview.playlistTitle ?? "YouTube playlist"}
          </p>
          <p className="text-label-sm text-on-surface-variant">
            {preview.items.length} valid videos found
            {preview.skippedUnavailable
              ? ` / ${preview.skippedUnavailable} unavailable skipped`
              : ""}
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
      <div className="grid gap-1.5">
        {visibleItems.map((item) => {
          const selected = selectedIds.has(item.videoId);

          return (
            <label
              className="grid cursor-pointer grid-cols-[auto_2.75rem_minmax(0,1fr)] items-center gap-2 rounded-sm border border-white/10 bg-surface-container/70 p-1.5"
              key={item.videoId}
            >
              <input
                checked={selected}
                className="accent-primary-fixed-dim"
                onChange={() => {
                  const next = new Set(selectedIds);

                  if (selected) {
                    next.delete(item.videoId);
                  } else {
                    next.add(item.videoId);
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
          Select Items
        </Button>
      </div>
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
          <span className="technical-label mt-1 block text-on-surface-variant/80">
            {metadata.loading ? "Loading details" : "Metadata unavailable"}
          </span>
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
              disabled={manageDisabled}
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
