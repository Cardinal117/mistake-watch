"use client";

import { createPortal } from "react-dom";
import { ListPlus, Play, Plus, X } from "lucide-react";

import { Badge, Button, SignalInlineStatus } from "@/components/ui";
import { YouTubeAddMediaSearch } from "../../youtube-add-media-search";
import type {
  QueueAddInput,
  QueueNotification,
  SourceLoadInput,
} from "../../queue/contracts";
import type { QueueMode } from "@/lib/queue/model";
import type { RoomQueueItem } from "@/lib/rooms";
import { cx } from "@/lib/ui";
import {
  DuplicateConfirmation,
  PlaylistPreviewCard,
  SinglePreviewCard,
} from "./preview-cards";
import { useAddMediaController } from "./use-add-media-controller";

export function AddMediaDialog({
  addDisabled,
  canAddQueue,
  canLoadSource,
  historyItems,
  isConnected,
  items,
  loadDisabled,
  mode,
  notify,
  onAddQueueItem,
  onClose,
  onLoadSource,
  open,
  queueMode,
  roomId,
}: {
  addDisabled: boolean;
  canAddQueue: boolean;
  canLoadSource: boolean;
  historyItems: RoomQueueItem[];
  isConnected: boolean;
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
  const controller = useAddMediaController({
    addDisabled,
    historyItems,
    items,
    loadDisabled,
    mode,
    notify,
    onAddQueueItem,
    onClose,
    onLoadSource,
    open,
    queueMode,
    roomId,
  });

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] grid place-items-center bg-background/72 p-4 backdrop-blur-xl">
      <form
        className={cx(
          "grid max-h-[min(44rem,calc(100dvh-2rem))] w-full max-w-3xl gap-3 overflow-y-auto rounded-lg border bg-surface/95 p-4 shadow-[0_0_48px_rgb(0_0_0_/_0.42)] backdrop-blur-xl",
          mode === "listen"
            ? "border-secondary-fixed-dim/25 shadow-amber-glow"
            : "border-primary-fixed-dim/25 shadow-screen-glow",
        )}
        onSubmit={controller.handleAddQueueItem}
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
              onClose();
              controller.setPendingDuplicateAdd(null);
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
              disabled={addDisabled && loadDisabled}
              onChange={(event) =>
                controller.handleUrlChange(event.target.value)
              }
              placeholder={
                mode === "watch"
                  ? "YouTube, playlist, direct video, or HLS URL"
                  : "YouTube, YouTube Music, playlist, direct audio, or HLS URL"
              }
              value={controller.queueUrl}
            />
            {controller.hasPreviewState ? (
              <Button
                onClick={controller.clearAddMediaState}
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
              disabled={
                addDisabled ||
                controller.isImportingPlaylist ||
                !controller.singlePreview
              }
              size="sm"
              title={!canAddQueue ? "Queue permission required." : undefined}
              type="submit"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add to Queue
            </Button>
            <Button
              disabled={
                addDisabled ||
                controller.isImportingPlaylist ||
                !controller.singlePreview
              }
              onClick={() => void controller.handlePlayNext()}
              size="sm"
              title={!canAddQueue ? "Queue permission required." : undefined}
              type="button"
              variant="secondary"
            >
              <ListPlus className="h-4 w-4" aria-hidden />
              Play Next
            </Button>
            <Button
              disabled={
                loadDisabled ||
                controller.isImportingPlaylist ||
                !controller.singlePreview
              }
              onClick={() => void controller.handleLoadSource()}
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
        {controller.isImportingPlaylist || controller.previewLoading ? (
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
          duplicateVideoIds={controller.duplicateVideoIds}
          mode={mode}
          onAddResult={(item) => {
            void controller.addSearchResult(item);
          }}
          onLoadResult={(item) => {
            void controller.loadSearchResult(item);
          }}
          onPlayNextResult={(item) => {
            void controller.playSearchResultNext(item);
          }}
          roomId={roomId}
        />
        {controller.singlePreview ? (
          <SinglePreviewCard
            duplicate={controller.isDuplicateQueueSource(
              controller.singlePreview,
            )}
            mode={mode}
            preview={controller.singlePreview}
          />
        ) : null}
        {controller.playlistPreview ? (
          <PlaylistPreviewCard
            addDisabled={addDisabled}
            duplicateSourceUrls={controller.duplicateSourceUrls}
            duplicateVideoIds={controller.duplicateVideoIds}
            mode={mode}
            onCancel={controller.clearPlaylistPreview}
            onImport={(strategy) => {
              void controller.importPlaylist(strategy);
            }}
            onSelectionChange={controller.setSelectedPlaylistIds}
            preview={controller.playlistPreview}
            selectedIds={controller.selectedPlaylistIds}
          />
        ) : null}
        {controller.importSummary ? (
          <p className="text-label-sm text-primary-fixed-dim" role="status">
            {controller.importSummary}
          </p>
        ) : null}
        {controller.errorMessage ? (
          <p className="text-label-sm text-error" role="alert">
            {controller.errorMessage}
          </p>
        ) : null}
        {controller.pendingDuplicateAdd ? (
          <DuplicateConfirmation
            mode={mode}
            onCancel={() => controller.setPendingDuplicateAdd(null)}
            onConfirm={controller.confirmDuplicate}
            onConfirmWithoutDuplicates={
              controller.pendingDuplicateAdd.kind === "playlist"
                ? controller.confirmWithoutDuplicates
                : undefined
            }
            pending={controller.pendingDuplicateAdd}
          />
        ) : null}
      </form>
    </div>,
    document.body,
  );
}
