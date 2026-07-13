"use client";

import type { Dispatch, FormEvent, SetStateAction } from "react";
import { createPortal } from "react-dom";
import { ListMusic, Play, Plus, X } from "lucide-react";

import { Badge, Button, SignalInlineStatus } from "@/components/ui";
import { detectUrlType } from "@/lib/player/source";
import { cx } from "@/lib/ui";
import type { YouTubeSearchItem } from "@/lib/youtube/search";
import { YouTubeAddMediaSearch } from "@/components/room/youtube-add-media-search";
import { ListenPlaylistReviewOverlay } from "@/components/room/listen/add-media/playlist-review-overlay";
import {
  QueueArtwork,
  formatDurationSeconds,
} from "@/components/room/listen/discovery/media-cards";
import type {
  ListenNotification,
  PlaylistPreview,
  PlaylistPreviewItem,
  QueueAddInput,
} from "@/components/room/listen/shared";

type ListenAddMediaViewProps = {
  addDisabled: boolean;
  addSearchResult(item: YouTubeSearchItem): void;
  addSingle(event: FormEvent<HTMLFormElement>): Promise<void>;
  canAddQueue: boolean;
  canLoadSource: boolean;
  clearAddMediaState(): void;
  duplicateSourceUrls: Set<string>;
  duplicateVideoIds: Set<string>;
  errorMessage: string | null;
  hasPreviewState: boolean;
  importPlaylist(): void;
  importPlaylistItems(
    items: PlaylistPreviewItem[],
    label: string,
    options?: { allowDuplicates?: boolean; skipDuplicates?: boolean },
  ): void;
  importSelectedPlaylistItems(): void;
  importSummary: string | null;
  isImportingPlaylist: boolean;
  isOpen: boolean;
  loadDisabled: boolean;
  loadSearchResult(item: YouTubeSearchItem): void;
  loadSingle(): Promise<void>;
  notifications: ListenNotification[];
  notify(message: string, tone?: ListenNotification["tone"]): void;
  onAddQueueItem(input: QueueAddInput): void;
  pendingDuplicateInput: QueueAddInput | null;
  pendingDuplicatePlaylist: {
    items: PlaylistPreviewItem[];
    label: string;
  } | null;
  playSearchResultNext(item: YouTubeSearchItem): void;
  playlistPreview: PlaylistPreview | null;
  playlistReviewOpen: boolean;
  previewLoading: boolean;
  roomId: string;
  selectedPlaylistIds: Set<string>;
  setDuplicatePreference: Dispatch<SetStateAction<"allow" | "warn">>;
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setImportSummary: Dispatch<SetStateAction<string | null>>;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  setPendingDuplicateInput: Dispatch<SetStateAction<QueueAddInput | null>>;
  setPendingDuplicatePlaylist: Dispatch<
    SetStateAction<{
      items: PlaylistPreviewItem[];
      label: string;
    } | null>
  >;
  setPlaylistPreview: Dispatch<SetStateAction<PlaylistPreview | null>>;
  setPlaylistReviewOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedPlaylistIds: Dispatch<SetStateAction<Set<string>>>;
  setSinglePreview: Dispatch<SetStateAction<QueueAddInput | null>>;
  setUrl: Dispatch<SetStateAction<string>>;
  singlePreview: QueueAddInput | null;
  url: string;
};

export function ListenAddMediaView({
  addDisabled,
  addSearchResult,
  addSingle,
  canAddQueue,
  canLoadSource,
  clearAddMediaState,
  duplicateSourceUrls,
  duplicateVideoIds,
  errorMessage,
  hasPreviewState,
  importPlaylist,
  importPlaylistItems,
  importSelectedPlaylistItems,
  importSummary,
  isImportingPlaylist,
  isOpen,
  loadDisabled,
  loadSearchResult,
  loadSingle,
  notifications,
  notify,
  onAddQueueItem,
  pendingDuplicateInput,
  pendingDuplicatePlaylist,
  playSearchResultNext,
  playlistPreview,
  playlistReviewOpen,
  previewLoading,
  roomId,
  selectedPlaylistIds,
  setDuplicatePreference,
  setErrorMessage,
  setImportSummary,
  setIsOpen,
  setPendingDuplicateInput,
  setPendingDuplicatePlaylist,
  setPlaylistPreview,
  setPlaylistReviewOpen,
  setSelectedPlaylistIds,
  setSinglePreview,
  setUrl,
  singlePreview,
  url,
}: ListenAddMediaViewProps) {
  return (
    <div className="relative w-full sm:w-auto">
      <Button
        className="w-full !border-[rgb(var(--listen-primary)/0.6)] !bg-[rgb(var(--listen-primary))] !text-background shadow-[0_0_28px_rgb(var(--listen-shadow)/0.22)] hover:!bg-[rgb(var(--listen-primary)/0.9)] sm:w-auto"
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
                        if (
                          detectUrlType(event.target.value) !==
                          "youtube-playlist"
                        ) {
                          setPlaylistPreview(null);
                          setSelectedPlaylistIds(new Set());
                        }
                      }}
                      placeholder="YouTube / YouTube Music link"
                      value={url}
                    />
                    {hasPreviewState ? (
                      <Button
                        onClick={clearAddMediaState}
                        type="button"
                        variant="ghost"
                      >
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
                        disabled={
                          addDisabled || isImportingPlaylist || !singlePreview
                        }
                        size="sm"
                        type="submit"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Add to Queue
                      </Button>
                      <Button
                        disabled={
                          loadDisabled || isImportingPlaylist || !singlePreview
                        }
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
                  mode="listen"
                  onAddResult={addSearchResult}
                  onLoadResult={loadSearchResult}
                  onPlayNextResult={playSearchResultNext}
                  roomId={roomId}
                />
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
                            playlistPreview.items.filter(
                              (item) => !item.isUnavailable,
                            ).length
                          }{" "}
                          playable
                        </p>
                      </div>
                      <Button
                        disabled={
                          addDisabled || playlistPreview.items.length === 0
                        }
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
                  <p
                    className="text-label-sm text-primary-fixed-dim"
                    role="status"
                  >
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
                      {pendingDuplicateInput.sourceTitle} is already in the
                      queue.
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
                      Add the clean playlist items only, or add duplicates
                      anyway.
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
                          notify(
                            "Duplicate playlist items added anyway.",
                            "warning",
                          );
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
