"use client";

import { ListMusic } from "lucide-react";
import type { RoomQueueItem } from "@/lib/rooms";
import { cx } from "@/lib/ui";
import { QueueArtwork } from "@/components/room/listen/discovery/media-cards";
import { formatQueueRemainingDuration } from "@/components/room/listen/helpers";
import { deriveListenUpNextPreview } from "@/components/room/listen/now-playing/up-next-presentation";

export function ListenUpNextPreview({
  items,
  onOpenQueue,
  remainingSeconds,
}: {
  items: RoomQueueItem[];
  onOpenQueue(): void;
  remainingSeconds: number | null;
}) {
  const previewItems = deriveListenUpNextPreview(items);

  return (
    <section className="mt-auto grid gap-2 border-t border-white/8 pt-3">
      <div className="flex items-center justify-between gap-3">
        <span className="technical-label border-0 p-0 text-[rgb(var(--listen-primary))]">
          Up Next
        </span>
        <button
          className="inline-flex min-h-8 items-center gap-2 rounded-md px-2 text-label-sm text-on-surface-variant outline-none transition hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-on-surface focus-visible:ring-2 focus-visible:ring-[rgb(var(--listen-primary)/0.72)]"
          onClick={onOpenQueue}
          type="button"
        >
          <span>
            Queue {items.length}
            {remainingSeconds
              ? ` / ${formatQueueRemainingDuration(remainingSeconds)}`
              : ""}
          </span>
          <ListMusic className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {previewItems.length > 0 ? (
        <div className="grid gap-1.5">
          {previewItems.map((item, index) => (
            <button
              aria-label={`Open queue. Up next: ${item.title}`}
              className={cx(
                "group grid h-12 min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg px-1 text-left outline-none transition hover:bg-[rgb(var(--listen-primary)/0.08)] focus-visible:ring-2 focus-visible:ring-[rgb(var(--listen-primary)/0.72)]",
                index === 1 && "hidden min-[640px]:grid",
                index === 2 && "hidden min-[1200px]:grid",
              )}
              key={item.id}
              onClick={onOpenQueue}
              type="button"
            >
              <QueueArtwork
                className="h-10 w-10 rounded-md"
                thumbnailUrl={item.thumbnailUrl}
                title={item.title}
              />
              <span className="min-w-0">
                <span className="block truncate text-label-sm font-semibold text-on-surface transition-colors group-hover:text-[rgb(var(--listen-primary))]">
                  {item.title}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-on-surface-variant">
                  {item.artist ?? item.channelName ?? "Room source"}
                </span>
              </span>
              <span className="text-[11px] tabular-nums text-on-surface-variant">
                {item.duration && item.duration !== "-" ? item.duration : ""}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button
          className="grid min-h-14 gap-1 rounded-lg border border-dashed border-white/10 px-3 py-2 text-left outline-none transition hover:border-[rgb(var(--listen-primary)/0.3)] hover:bg-[rgb(var(--listen-primary)/0.06)] focus-visible:ring-2 focus-visible:ring-[rgb(var(--listen-primary)/0.72)]"
          onClick={onOpenQueue}
          type="button"
        >
          <span className="text-label-sm font-semibold text-on-surface">
            Build the next run
          </span>
          <span className="text-[11px] text-on-surface-variant">
            Open the queue or add media to keep the session moving.
          </span>
        </button>
      )}
    </section>
  );
}
