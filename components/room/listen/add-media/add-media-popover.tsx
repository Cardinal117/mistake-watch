"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  detectUrlType,
  parseYouTubePlaylist,
  validateMediaSourceForMode,
} from "@/lib/player/source";
import type { RoomQueueItem } from "@/lib/rooms";
import type { LiveRoomError } from "@/lib/spacetime";
import { fetchPlaylistPreview } from "@/lib/youtube/playlist-client";
import type { YouTubeSearchItem } from "@/lib/youtube/search";
import {
  type SourceLoadInput,
  type QueueAddInput,
} from "@/components/room/queue/contracts";
import { useQueueNotifications } from "@/components/room/queue/queue-notifications";
import {
  type PlaylistPreview,
  type PlaylistPreviewItem,
  playlistItemKey,
} from "@/components/room/shared/add-media/contracts";
import {
  isDuplicateQueueSource,
  resolveYouTubeQueueInput,
  useDuplicatePreference,
  useQueueSourceDuplicates,
  youtubeSearchItemToQueueInput,
} from "@/components/room/shared/add-media/controller-shared";
import { playlistItemToQueueInput } from "@/components/room/shared/add-media/media-matches";
import { ListenAddMediaView } from "@/components/room/listen/add-media/add-media-view";

export function ListenAddMediaPopover({
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
  const [url, setUrl] = useState("");
  const addDisabled = !canAddQueue || connectionStatus !== "connected";
  const loadDisabled = !canLoadSource || connectionStatus !== "connected";
  const { duplicateSourceUrls, duplicateVideoIds } =
    useQueueSourceDuplicates(items);
  const [duplicatePreference, setDuplicatePreference] =
    useDuplicatePreference();
  const { notifications, notify } = useQueueNotifications(roomErrors);
  const hasPreviewState = Boolean(
    url.trim() || singlePreview || playlistPreview,
  );

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
    const result = await resolveYouTubeQueueInput(input);

    if (result.error) {
      setErrorMessage(result.error);
    }

    return result.input;
  }

  function isDuplicateSingle(input: Pick<QueueAddInput, "sourceUrl">) {
    return isDuplicateQueueSource(
      input,
      duplicateSourceUrls,
      duplicateVideoIds,
    );
  }

  function addSearchResult(item: YouTubeSearchItem) {
    const input = youtubeSearchItemToQueueInput(item);

    if (isDuplicateSingle(input) && duplicatePreference === "warn") {
      setPendingDuplicateInput(input);
      setErrorMessage(
        "Duplicate detected. Add anyway only if you want this source repeated.",
      );
      notify("Duplicate detected. Confirm whether to add it again.", "warning");
      return;
    }

    onAddQueueItem({
      ...input,
      allowDuplicate: isDuplicateSingle(input),
    });
    notify(`Added to queue: ${input.sourceTitle}`, "success");
  }

  function playSearchResultNext(item: YouTubeSearchItem) {
    const input = {
      ...youtubeSearchItemToQueueInput(item),
      isPlayNext: true,
    };

    if (isDuplicateSingle(input) && duplicatePreference === "warn") {
      setPendingDuplicateInput(input);
      setErrorMessage(
        "Duplicate detected. Add anyway only if you want this source repeated.",
      );
      notify("Duplicate detected. Confirm whether to add it again.", "warning");
      return;
    }

    onAddQueueItem({
      ...input,
      allowDuplicate: isDuplicateSingle(input),
    });
    notify(`Added next: ${input.sourceTitle}`, "success");
  }

  function loadSearchResult(item: YouTubeSearchItem) {
    const input = youtubeSearchItemToQueueInput(item);

    onLoadSource(input);
    notify(`Loaded source: ${input.sourceTitle}`, "success");
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
      notify(
        `${duplicates.length} duplicate playlist items detected.`,
        "warning",
      );
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
        ...playlistItemToQueueInput(item, {
          playlistId: playlistPreview.playlistId,
          playlistTitle: playlistPreview.playlistTitle,
        }),
        allowDuplicate: isDuplicatePlaylistItem(item),
        isUnavailable: item.isUnavailable,
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
    <ListenAddMediaView
      addDisabled={addDisabled}
      addSearchResult={addSearchResult}
      addSingle={addSingle}
      canAddQueue={canAddQueue}
      canLoadSource={canLoadSource}
      clearAddMediaState={clearAddMediaState}
      duplicateSourceUrls={duplicateSourceUrls}
      duplicateVideoIds={duplicateVideoIds}
      errorMessage={errorMessage}
      hasPreviewState={hasPreviewState}
      importPlaylist={importPlaylist}
      importPlaylistItems={importPlaylistItems}
      importSelectedPlaylistItems={importSelectedPlaylistItems}
      importSummary={importSummary}
      isImportingPlaylist={isImportingPlaylist}
      isOpen={isOpen}
      loadDisabled={loadDisabled}
      loadSearchResult={loadSearchResult}
      loadSingle={loadSingle}
      notifications={notifications}
      notify={notify}
      onAddQueueItem={onAddQueueItem}
      pendingDuplicateInput={pendingDuplicateInput}
      pendingDuplicatePlaylist={pendingDuplicatePlaylist}
      playSearchResultNext={playSearchResultNext}
      playlistPreview={playlistPreview}
      playlistReviewOpen={playlistReviewOpen}
      previewLoading={previewLoading}
      roomId={roomId}
      selectedPlaylistIds={selectedPlaylistIds}
      setDuplicatePreference={setDuplicatePreference}
      setErrorMessage={setErrorMessage}
      setImportSummary={setImportSummary}
      setIsOpen={setIsOpen}
      setPendingDuplicateInput={setPendingDuplicateInput}
      setPendingDuplicatePlaylist={setPendingDuplicatePlaylist}
      setPlaylistPreview={setPlaylistPreview}
      setPlaylistReviewOpen={setPlaylistReviewOpen}
      setSelectedPlaylistIds={setSelectedPlaylistIds}
      setSinglePreview={setSinglePreview}
      setUrl={setUrl}
      singlePreview={singlePreview}
      url={url}
    />
  );
}
