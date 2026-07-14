"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, ListMusic, Search, SlidersHorizontal, X } from "lucide-react";
import { Badge, Button } from "@/components/ui";
import { cx } from "@/lib/ui";
import { getYouTubeAvailabilityLabel } from "@/lib/youtube/availability";
import {
  type PlaylistPreview,
  type PlaylistPreviewItem,
  playlistItemKey,
} from "@/components/room/shared/add-media/contracts";
import { QueueArtwork } from "@/components/room/listen/discovery/media-cards";

export function ListenPlaylistReviewOverlay({
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
  const portalRoot = typeof document === "undefined" ? null : document.body;
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
