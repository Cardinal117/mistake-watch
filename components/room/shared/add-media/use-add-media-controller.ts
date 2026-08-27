"use client";

import { useEffect, useState, type FormEvent } from "react";

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
import { fetchPlaylistPreview } from "@/lib/youtube/playlist-client";
import type { YouTubeSearchItem } from "@/lib/youtube/search";
import type {
  QueueAddInput,
  QueueNotification,
  SourceLoadInput,
} from "../../queue/contracts";
import type {
  PendingDuplicateAdd,
  PlaylistItemKey,
  PlaylistPreview,
  PlaylistPreviewItem,
} from "./contracts";
import {
  playlistItemKey,
  playlistItemKeys,
  playlistItemsForSelection,
} from "./contracts";
import {
  isDuplicateQueueSource as isDuplicateSource,
  rememberDuplicatePreference,
  resolveYouTubeQueueInput,
  useDuplicatePreference,
  useQueueSourceDuplicates,
  youtubeSearchItemToQueueInput,
} from "./controller-shared";
import {
  fetchFirstPartyMediaMatches,
  firstPartyAssetToQueueInput,
  playlistItemToQueueInput,
} from "./media-matches";

export function useAddMediaController({
  addDisabled,
  historyItems,
  loadDisabled,
  mode,
  notify,
  onAddQueueItem,
  onClose,
  onLoadSource,
  open,
  queueMode,
  roomId,
  items,
}: {
  addDisabled: boolean;
  historyItems: RoomQueueItem[];
  items: RoomQueueItem[];
  loadDisabled: boolean;
  mode: "listen" | "watch";
  notify(message: string, tone?: QueueNotification["tone"]): void;
  onAddQueueItem?(input: QueueAddInput): void;
  onClose(): void;
  onLoadSource?(input: SourceLoadInput): void;
  open: boolean;
  queueMode: QueueMode;
  roomId: string;
}) {
  const [duplicatePreference, setDuplicatePreference] =
    useDuplicatePreference();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [isImportingPlaylist, setIsImportingPlaylist] = useState(false);
  const [pendingDuplicateAdd, setPendingDuplicateAdd] =
    useState<PendingDuplicateAdd | null>(null);
  const [playlistPreview, setPlaylistPreview] =
    useState<PlaylistPreview | null>(null);
  const [singlePreview, setSinglePreview] = useState<QueueAddInput | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [queueUrl, setQueueUrl] = useState("");
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<
    Set<PlaylistItemKey>
  >(() => new Set());
  const { duplicateSourceUrls, duplicateVideoIds } =
    useQueueSourceDuplicates(items);

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
      setSelectedPlaylistIds(playlistItemKeys(payload.items));
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

  async function checkYouTubeInput(input: SourceLoadInput) {
    const result = await resolveYouTubeQueueInput(input);

    if (result.error) {
      setErrorMessage(result.error);
    }

    return result.input;
  }

  async function preferFirstPartyMediaMatch(input: QueueAddInput) {
    const videoId =
      input.sourceType === "youtube"
        ? parseYouTubeVideoId(input.sourceUrl)
        : null;
    if (!videoId) return input;
    const matches = await fetchFirstPartyMediaMatches([videoId]);
    const asset = matches.get(videoId);
    if (!asset) return input;
    return firstPartyAssetToQueueInput(asset, {
      channelTitle: input.channelName ?? input.artist ?? null,
      durationSeconds: input.durationSeconds ?? null,
      sourceUrl: input.sourceUrl,
      thumbnailUrl: input.thumbnailUrl ?? null,
      title: input.sourceTitle,
    });
  }

  function isDuplicateQueueSource(input: Pick<QueueAddInput, "sourceUrl">) {
    return isDuplicateSource(input, duplicateSourceUrls, duplicateVideoIds);
  }

  function addQueueItemWithFeedback(input: QueueAddInput) {
    onAddQueueItem?.(input);
    const action = input.isPlayNext ? "Set to play next" : "Added to queue";
    notify(
      input.allowDuplicate
        ? `Duplicate ${action.toLowerCase()}: ${input.sourceTitle}`
        : `${action}: ${input.sourceTitle}`,
      input.allowDuplicate ? "warning" : "success",
    );
  }

  async function resolveSearchResult(
    item: YouTubeSearchItem,
    isPlayNext = false,
  ) {
    const resolvedInput = await preferFirstPartyMediaMatch(
      youtubeSearchItemToQueueInput(item),
    );
    const input = isPlayNext
      ? { ...resolvedInput, isPlayNext: true }
      : resolvedInput;
    const duplicate = isDuplicateQueueSource(input);
    if (duplicate && duplicatePreference === "warn") {
      setPendingDuplicateAdd({ item: input, kind: "single" });
      notify("Duplicate detected. Confirm whether to add it again.", "warning");
      return;
    }
    addQueueItemWithFeedback({ ...input, allowDuplicate: duplicate });
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
        ? firstPartyAssetToQueueInput(
            firstPartyMatches.get(item.videoId)!,
            item,
          )
        : playlistItemToQueueInput(item, options);
      const duplicate =
        duplicateVideoIds.has(item.videoId) ||
        duplicateSourceUrls.has(item.sourceUrl) ||
        duplicateSourceUrls.has(queueInput.sourceUrl);
      if (duplicate && !options.allowDuplicates) continue;
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

  function parseQueueUrl() {
    setErrorMessage(null);
    setImportSummary(null);
    if (detectUrlType(queueUrl) === "youtube-playlist") {
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

  async function resolveCurrentInput() {
    const input = singlePreview ?? parseQueueUrl();
    if (!input) return null;
    return singlePreview
      ? preferFirstPartyMediaMatch(singlePreview)
      : checkYouTubeInput(input).then((checked) =>
          checked ? preferFirstPartyMediaMatch(checked) : null,
        );
  }

  async function queueCurrentInput(isPlayNext = false) {
    const checkedInput = await resolveCurrentInput();
    if (!checkedInput) return;
    const input = isPlayNext
      ? { ...checkedInput, isPlayNext: true }
      : checkedInput;
    const duplicate = isDuplicateQueueSource(input);
    if (duplicate && duplicatePreference === "warn") {
      setPendingDuplicateAdd({ item: input, kind: "single" });
      notify("Duplicate detected. Confirm whether to add it again.", "warning");
      return;
    }
    addQueueItemWithFeedback({ ...input, allowDuplicate: duplicate });
    clearAddMediaState();
    onClose();
  }

  async function handleAddQueueItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await queueCurrentInput();
  }

  async function handleLoadSource() {
    const checkedInput = await resolveCurrentInput();
    if (!checkedInput) return;
    onLoadSource?.(checkedInput);
    notify(`Loaded source: ${checkedInput.sourceTitle}`, "success");
    clearAddMediaState();
    onClose();
  }

  async function importPlaylist(
    strategy: "all" | "selected" | "shuffle" | "smart",
  ) {
    if (!playlistPreview || addDisabled) return;
    let importItems =
      strategy === "selected"
        ? playlistItemsForSelection(playlistPreview.items, selectedPlaylistIds)
        : playlistPreview.items;
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
      const incoming: SmartShuffleItem[] = importItems.map((item) => ({
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
      }));
      const history: SmartShuffleItem[] = historyItems.map((item, index) => ({
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
      }));
      importItems = smartShuffleQueue(incoming, history).map(
        (shuffled) =>
          playlistPreview.items.find(
            (item) => playlistItemKey(item) === shuffled.queueItemId,
          ) ?? importItems[0],
      );
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
        `${duplicates.length} duplicate playlist item${duplicates.length === 1 ? "" : "s"} detected.`,
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
    onClose();
  }

  function confirmDuplicate(remember: boolean) {
    if (!pendingDuplicateAdd) return;
    if (remember) {
      rememberDuplicatePreference(true);
      setDuplicatePreference("allow");
    }
    if (pendingDuplicateAdd.kind === "single") {
      addQueueItemWithFeedback({
        ...pendingDuplicateAdd.item,
        allowDuplicate: true,
      });
    } else {
      void importPlaylistItemsWithFeedback(pendingDuplicateAdd.items, {
        allowDuplicates: true,
        playlistId: pendingDuplicateAdd.playlistId,
        playlistTitle: pendingDuplicateAdd.playlistTitle,
        skippedUnavailable: pendingDuplicateAdd.skippedUnavailable,
      });
    }
    setPendingDuplicateAdd(null);
    setQueueUrl("");
    clearPlaylistPreview();
    onClose();
  }

  function confirmWithoutDuplicates() {
    if (!pendingDuplicateAdd || pendingDuplicateAdd.kind !== "playlist") return;
    void importPlaylistItemsWithFeedback(pendingDuplicateAdd.items, {
      allowDuplicates: false,
      playlistId: pendingDuplicateAdd.playlistId,
      playlistTitle: pendingDuplicateAdd.playlistTitle,
      skippedUnavailable: pendingDuplicateAdd.skippedUnavailable,
    });
    setPendingDuplicateAdd(null);
    clearAddMediaState();
    onClose();
  }

  useEffect(() => {
    if (!open) return;
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
          if (!cancelled) setPreviewLoading(false);
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
          if (!cancelled) setSinglePreview(checkedInput);
        })
        .catch(() => {
          if (!cancelled) {
            setSinglePreview(null);
            setErrorMessage("Preview failed. Check the URL and try again.");
            notify("Provider preview failed.", "error");
          }
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, queueUrl]);

  return {
    addSearchResult: (item: YouTubeSearchItem) => resolveSearchResult(item),
    clearAddMediaState,
    clearPlaylistPreview,
    confirmDuplicate,
    confirmWithoutDuplicates,
    duplicateSourceUrls,
    duplicateVideoIds,
    errorMessage,
    handleAddQueueItem,
    handleLoadSource,
    handlePlayNext: () => queueCurrentInput(true),
    handleUrlChange(value: string) {
      setQueueUrl(value);
      setImportSummary(null);
      setSinglePreview(null);
      if (detectUrlType(value) !== "youtube-playlist") clearPlaylistPreview();
    },
    hasPreviewState: Boolean(
      queueUrl.trim() || singlePreview || playlistPreview,
    ),
    importPlaylist,
    importSummary,
    isDuplicateQueueSource,
    isImportingPlaylist,
    loadSearchResult,
    pendingDuplicateAdd,
    playSearchResultNext: (item: YouTubeSearchItem) =>
      resolveSearchResult(item, true),
    playlistPreview,
    previewLoading,
    queueUrl,
    selectedPlaylistIds,
    setPendingDuplicateAdd,
    setSelectedPlaylistIds,
    singlePreview,
  };
}

export type AddMediaController = ReturnType<typeof useAddMediaController>;
