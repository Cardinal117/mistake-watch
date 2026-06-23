"use client";

import { useEffect, useRef, useState } from "react";
import { ListPlus, Loader2, Plus, Play, Search, X } from "lucide-react";

import { Badge, Button } from "@/components/ui";
import { cx } from "@/lib/ui";
import { fetchYouTubeSearch } from "@/lib/youtube/search-client";
import type { YouTubeSearchItem, YouTubeSearchResponse } from "@/lib/youtube/search";

type YouTubeAddMediaSearchProps = {
  canAddQueue: boolean;
  canLoadSource: boolean;
  duplicateVideoIds: Set<string>;
  focusSignal?: number;
  inputClassName?: string;
  inputIconClassName?: string;
  mode: "listen" | "watch";
  onAddResult(item: YouTubeSearchItem): void;
  onInputFocus?(): void;
  onLoadResult(item: YouTubeSearchItem): void;
  onPlayNextResult(item: YouTubeSearchItem): void;
  onRequestClose?(): void;
  placeholder?: string;
  popoverOpen?: boolean;
  presentation?: "inline" | "popover";
  roomId: string;
  shortcutLabel?: string;
};

type SearchState =
  | { kind: "idle" }
  | { kind: "searching"; query: string }
  | { kind: "results"; query: string; response: YouTubeSearchResponse }
  | { kind: "empty-results"; query: string; reason: string }
  | { kind: "error"; query: string; reason: string };

const minQueryLength = 3;
const debounceMs = 600;

export function YouTubeAddMediaSearch({
  canAddQueue,
  canLoadSource,
  duplicateVideoIds,
  focusSignal,
  inputClassName,
  inputIconClassName,
  mode,
  onAddResult,
  onInputFocus,
  onLoadResult,
  onPlayNextResult,
  onRequestClose,
  placeholder = "Search YouTube videos...",
  popoverOpen = true,
  presentation = "inline",
  roomId,
  shortcutLabel,
}: YouTubeAddMediaSearchProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const trimmedQuery = query.trim();
  const displayState =
    trimmedQuery.length === 0
      ? ({ kind: "empty" } as const)
      : trimmedQuery.length < minQueryLength
        ? ({ kind: "typing" } as const)
        : state.kind !== "idle" && state.query === trimmedQuery
          ? state
          : ({ kind: "ready" } as const);
  const accent =
    mode === "listen"
      ? "border-[rgb(var(--listen-primary)/0.26)] focus-within:border-[rgb(var(--listen-primary)/0.62)] focus-within:ring-[rgb(var(--listen-primary)/0.14)]"
      : "border-primary-fixed-dim/30 focus-within:border-primary-fixed-dim/65 focus-within:ring-primary-fixed-dim/15";

  useEffect(() => {
    if (!focusSignal) {
      return;
    }

    inputRef.current?.focus();
  }, [focusSignal]);

  useEffect(() => {
    if (trimmedQuery.length < minQueryLength) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setState({ kind: "searching", query: trimmedQuery });

      void fetchYouTubeSearch({
        query: trimmedQuery,
        roomId,
        signal: controller.signal,
      })
        .then((response) => {
          if (controller.signal.aborted) {
            return;
          }

          if (response.status !== "available") {
            setState({
              kind: "error",
              query: trimmedQuery,
              reason: response.reason ?? "YouTube search is unavailable.",
            });
            return;
          }

          if (response.items.length === 0) {
            setState({
              kind: "empty-results",
              query: trimmedQuery,
              reason: response.reason ?? "No YouTube videos matched that search.",
            });
            return;
          }

          setState({ kind: "results", query: trimmedQuery, response });
        })
        .catch((error: unknown) => {
          if (
            controller.signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError")
          ) {
            return;
          }

          setState({
            kind: "error",
            query: trimmedQuery,
            reason: "YouTube search failed. Try again in a moment.",
          });
        });
    }, debounceMs);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [roomId, trimmedQuery]);

  const searchInput = (
      <label
        className={cx(
          "grid h-11 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border bg-background/35 px-3 ring-2 ring-transparent transition",
          accent,
          inputClassName,
        )}
      >
        <Search
          className={cx(
            "h-4 w-4",
            mode === "listen"
              ? "text-[rgb(var(--listen-primary))]"
              : "text-primary-fixed-dim",
            inputIconClassName,
          )}
          aria-hidden
        />
        <input
          aria-label="Search YouTube videos"
          className="min-w-0 bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/55"
          onChange={(event) => setQuery(event.currentTarget.value)}
          onFocus={onInputFocus}
          placeholder={placeholder}
          ref={inputRef}
          type="text"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear YouTube search"
            className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-on-surface-variant transition hover:bg-white/10 hover:text-on-surface"
            onClick={() => {
              setQuery("");
              setState({ kind: "idle" });
              onRequestClose?.();
            }}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : shortcutLabel ? (
          <span className="hidden rounded-sm border border-white/10 bg-background/55 px-1.5 py-0.5 text-[11px] font-semibold text-on-surface-variant min-[1200px]:inline-flex">
            {shortcutLabel}
          </span>
        ) : null}
      </label>
  );

  const searchBody = (
    <>
      {displayState.kind === "empty" ? (
        <p className="text-label-sm text-on-surface-variant">
          Search YouTube videos, then add a result to the queue without leaving
          the room.
        </p>
      ) : null}

      {displayState.kind === "typing" || displayState.kind === "ready" ? (
        <p className="text-label-sm text-on-surface-variant">
          {query.trim().length < minQueryLength
            ? "Type at least 3 characters to search."
            : "Searching starts when you stop typing."}
        </p>
      ) : null}

      {displayState.kind === "searching" ? <SearchSkeleton /> : null}

      {displayState.kind === "error" || displayState.kind === "empty-results" ? (
        <div className="rounded-sm border border-white/10 bg-background/35 p-3">
          <p className="text-label-sm text-on-surface-variant">
            {displayState.reason}
          </p>
        </div>
      ) : null}

      {displayState.kind === "results" ? (
        <div className="grid gap-2">
          {displayState.response.items.map((item) => (
            <SearchResultRow
              canAddQueue={canAddQueue}
              canLoadSource={canLoadSource}
              duplicate={duplicateVideoIds.has(item.youtubeVideoId)}
              item={item}
              key={item.youtubeVideoId}
              mode={mode}
              onAddResult={onAddResult}
              onLoadResult={onLoadResult}
              onPlayNextResult={onPlayNextResult}
            />
          ))}
        </div>
      ) : null}
    </>
  );

  if (presentation === "popover") {
    return (
      <section className="relative min-w-0">
        {searchInput}
        {popoverOpen && query ? (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 grid max-h-[min(34rem,calc(100dvh-13rem))] gap-3 overflow-y-auto rounded-md border border-[rgb(var(--listen-primary)/0.22)] bg-surface/88 p-3 shadow-[0_22px_54px_rgb(0_0_0_/_0.46),0_0_34px_rgb(var(--listen-shadow)/0.16)] backdrop-blur-xl">
            {searchBody}
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="grid gap-3 rounded-md border border-white/10 bg-surface-container-low/55 p-3">
      {searchInput}
      {searchBody}
    </section>
  );
}

function SearchSkeleton() {
  return (
    <div className="grid gap-2" aria-label="Searching YouTube">
      {[0, 1, 2].map((index) => (
        <div
          className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-3 rounded-sm border border-white/8 bg-white/[0.035] p-2"
          key={index}
        >
          <span className="aspect-video rounded-sm bg-white/10" />
          <span className="grid gap-2">
            <span className="h-3 w-4/5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2/5 rounded-full bg-white/8" />
          </span>
          <Loader2 className="h-4 w-4 animate-spin text-on-surface-variant" />
        </div>
      ))}
    </div>
  );
}

function SearchResultRow({
  canAddQueue,
  canLoadSource,
  duplicate,
  item,
  mode,
  onAddResult,
  onLoadResult,
  onPlayNextResult,
}: {
  canAddQueue: boolean;
  canLoadSource: boolean;
  duplicate: boolean;
  item: YouTubeSearchItem;
  mode: "listen" | "watch";
  onAddResult(item: YouTubeSearchItem): void;
  onLoadResult(item: YouTubeSearchItem): void;
  onPlayNextResult(item: YouTubeSearchItem): void;
}) {
  const unavailable = item.availability.playable === false;

  return (
    <article className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 rounded-sm border border-white/10 bg-background/35 p-2 min-[520px]:grid-cols-[5.5rem_minmax(0,1fr)_auto]">
      <div className="relative aspect-video overflow-hidden rounded-sm border border-white/10 bg-surface-container">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnails are external provider metadata.
          <img
            alt=""
            className="h-full w-full object-cover"
            src={item.thumbnailUrl}
          />
        ) : (
          <span className="grid h-full place-items-center text-on-surface-variant">
            <Play className="h-5 w-5" aria-hidden />
          </span>
        )}
      </div>
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge tone={mode === "listen" ? "amber" : "cyan"}>YouTube</Badge>
          {duplicate ? <Badge tone="amber">Duplicate</Badge> : null}
          {unavailable ? <Badge tone="neutral">Unavailable</Badge> : null}
        </div>
        <h4 className="mt-1 line-clamp-2 text-body-md font-semibold text-on-surface">
          {item.title}
        </h4>
        <p className="mt-0.5 truncate text-label-sm text-on-surface-variant">
          {item.channelTitle ?? "YouTube"}
          {item.durationSeconds ? ` / ${formatDuration(item.durationSeconds)}` : ""}
        </p>
        {unavailable ? (
          <p className="mt-1 text-label-sm text-error">
            {item.availability.reason}
          </p>
        ) : null}
      </div>
      <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 min-[520px]:col-span-1 min-[520px]:grid">
        <Button
          disabled={!canAddQueue || unavailable}
          onClick={() => onAddResult(item)}
          size="sm"
          type="button"
          variant={duplicate ? "secondary" : "primary"}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </Button>
        <Button
          disabled={!canAddQueue || unavailable}
          onClick={() => onPlayNextResult(item)}
          size="sm"
          type="button"
          variant="secondary"
        >
          <ListPlus className="h-4 w-4" aria-hidden />
          Next
        </Button>
        <Button
          disabled={!canLoadSource || unavailable}
          onClick={() => onLoadResult(item)}
          size="sm"
          type="button"
          variant="ghost"
        >
          <Play className="h-4 w-4" aria-hidden />
          Load
        </Button>
      </div>
    </article>
  );
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds,
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
