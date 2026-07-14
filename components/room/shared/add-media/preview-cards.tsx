"use client";

import { useState } from "react";
import {
  ChevronsUp,
  ListPlus,
  MoreVertical,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";

import { Badge, Button } from "@/components/ui";
import { QueueImage } from "../../queue/queue-row";
import { formatDuration } from "../../queue/queue-utils";
import type { QueueAddInput } from "../../queue/contracts";
import { cx } from "@/lib/ui";
import { getYouTubeAvailabilityLabel } from "@/lib/youtube/availability";
import type {
  PendingDuplicateAdd,
  PlaylistPreview,
  PlaylistPreviewItem,
} from "./contracts";
import { playlistItemKey } from "./contracts";

export function SinglePreviewCard({
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

export function PlaylistPreviewCard({
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
      if (sortMode === "title") return first.title.localeCompare(second.title);
      if (sortMode === "duration")
        return (first.durationSeconds ?? 0) - (second.durationSeconds ?? 0);
      if (sortMode === "duplicate")
        return Number(isDuplicateItem(second)) - Number(isDuplicateItem(first));
      return first.position - second.position;
    });
  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedIds.has(playlistItemKey(item)));

  function setVisibleSelected(selected: boolean) {
    const next = new Set(selectedIds);
    for (const item of visibleItems) {
      if (selected) next.add(playlistItemKey(item));
      else next.delete(playlistItemKey(item));
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
            {preview.items.filter((item) => !item.isUnavailable).length}{" "}
            playable videos found
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
          <MoreVertical className="h-4 w-4" aria-hidden /> More
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
                  if (unavailable) return;
                  const next = new Set(selectedIds);
                  if (selected) next.delete(itemKey);
                  else next.add(itemKey);
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

export function DuplicateConfirmation({
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
