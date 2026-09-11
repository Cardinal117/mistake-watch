"use client";
import { useContext, useEffect, useRef, useState } from "react";
import { QueueDragContext } from "./virtual-queue-list";
import { OptimisticQueueContext } from "./use-optimistic-adds";
import {
  GripVertical,
  ListPlus,
  MoreHorizontal,
  Pin,
  Play,
  Trash2,
} from "lucide-react";
import type { RoomQueueItem } from "@/lib/rooms";
import { QueueImage } from "./queue-row";
import { QueueDuplicateIndicator } from "./queue-duplicate-indicator";
import { useQueueGestures } from "./use-queue-gestures";

export function CompactQueueRow({
  item,
  duplicateCount = 0,
  title,
  channel,
  thumbnailUrl,
  duration,
  blocked,
  disabled,
  index,
  count,
  onMove,
  onPin,
  onNext,
  onPlay,
  onRemove,
  onRequeue,
}: {
  item: RoomQueueItem;
  duplicateCount?: number;
  title: string;
  channel?: string | null;
  thumbnailUrl?: string | null;
  duration: string;
  blocked: boolean;
  disabled: boolean;
  index: number;
  count: number;
  onMove?(id: string, position: number): void;
  onPin?(item: RoomQueueItem): void;
  onNext?(item: RoomQueueItem): void;
  onPlay?(id: string): void;
  onRemove?(id: string): void;
  onRequeue?(item: RoomQueueItem): void;
}) {
  const {
    row,
    revealed,
    reveal,
    close,
    offset,
    dragging,
    start,
    move,
    end,
    cancel,
    captureClick,
  } = useQueueGestures({
    disabled,
    index,
    onMove: (position) => onMove?.(item.id, position),
    onRemove: () => onRemove?.(item.id),
  });
  const virtual = useContext(QueueDragContext);
  const optimistic = useContext(OptimisticQueueContext);
  const queued = item.status === "queued";
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    function dismiss(event: Event) {
      const menu = menuRef.current;
      if (menu && event.target instanceof Node && !menu.contains(event.target))
        menu.open = false;
    }
    document.addEventListener("pointerdown", dismiss, true);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss, true);
      document.removeEventListener("focusin", dismiss);
    };
  }, [menuOpen]);

  return (
    <div
      role={virtual ? "presentation" : "listitem"}
      ref={row}
      className="watch-queue-row"
      data-queue-id={item.id}
      data-pending-add={Boolean(item.pendingAdd)}
      data-queue-index={index}
      data-active={item.status === "now"}
      data-dragging={dragging}
    >
      <button
        className="watch-queue-remove"
        disabled={disabled || !revealed}
        tabIndex={revealed ? 0 : -1}
        aria-hidden={!revealed}
        aria-label={`Remove ${title}`}
        onClick={() => {
          if (!disabled) onRemove?.(item.id);
          close();
        }}
      >
        <Trash2 aria-hidden />
      </button>
      <div
        className="watch-queue-face"
        style={{
          transform: `translateX(${(revealed ? -72 : 0) + offset}px)`,
          touchAction: disabled ? "pan-y" : undefined,
        }}
        onPointerDown={(e) => {
          const target = e.target as HTMLElement;
          if (
            target.closest("[data-queue-menu] button, [data-queue-menu][open]")
          )
            return;
          start(
            e,
            target.closest(".watch-queue-play, .watch-queue-next, summary") ||
              !queued
              ? "swipe"
              : "surface",
          );
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={cancel}
        onClickCapture={captureClick}
      >
        <button
          data-queue-handle
          className="watch-queue-grip"
          aria-label={`Drag ${title} to reorder`}
          disabled={disabled || !queued}
          onPointerDown={(e) => {
            e.stopPropagation();
            start(e, "drag");
          }}
          onKeyDown={(e) => {
            if (disabled || !queued) return;
            const position =
              e.key === "ArrowUp"
                ? index - 1
                : e.key === "ArrowDown"
                  ? index + 1
                  : e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? count - 1
                      : null;
            if (position !== null) {
              e.preventDefault();
              onMove?.(item.id, Math.max(0, Math.min(count - 1, position)));
            }
          }}
        >
          <GripVertical aria-hidden />
        </button>
        <button
          className="watch-queue-play"
          disabled={disabled || blocked || !onPlay || item.status === "now"}
          aria-label={
            item.status === "now"
              ? `${title} is playing`
              : `Play ${title} ${item.status === "played" ? "again" : "now"}`
          }
          onClick={() => onPlay?.(item.id)}
        >
          <span className="watch-queue-art">
            <QueueImage thumbnailUrl={thumbnailUrl} />
            <Play aria-hidden />
          </span>
        </button>
        <div
          className="watch-queue-copy"
          title={queued ? "Drag to reorder; hold on touch" : undefined}
        >
          <strong className="flex items-center gap-2">
            <span className="min-w-0 truncate" title={title}>
              {title}
            </span>
            {item.status !== "played" && (
              <QueueDuplicateIndicator count={duplicateCount} />
            )}
          </strong>
          <small>
            {item.pendingAdd
              ? item.pendingAdd === "sending"
                ? "Adding… · "
                : "Not confirmed · "
              : ""}
            {item.status === "now"
              ? "Now playing · "
              : index === 0
                ? "Next · "
                : ""}
            {channel || "Room source"}
            <span className="compact-queue-inline-duration"> · {duration}</span>
            {blocked && !item.pendingAdd ? " · Unavailable" : ""}
            {item.isPinned ? " · Pinned" : ""}
            {item.isPlayNext ? " · Play next" : ""}
          </small>
        </div>
        <span className="desktop-queue-duration">{duration}</span>
        {item.status === "now" && (
          <span className="desktop-queue-next-space" aria-hidden />
        )}
        {item.pendingAdd && optimistic ? (
          <>
            <button
              className="watch-queue-next"
              disabled={item.pendingAdd === "sending"}
              title="Retry the same addition"
              aria-label={`Retry adding ${title}`}
              onClick={() => optimistic.retry(item.id)}
            >
              Retry
            </button>
            <button
              className="watch-queue-next"
              disabled={item.pendingAdd === "sending"}
              title="Hide this pending status; a delayed addition can still arrive"
              aria-label={`Hide pending status for ${title}`}
              onClick={() => optimistic.dismiss(item.id)}
            >
              <Trash2 aria-hidden />
            </button>
          </>
        ) : null}
        {!item.pendingAdd && item.status !== "now" && (
          <button
            className="watch-queue-next"
            disabled={disabled}
            aria-pressed={Boolean(item.isPlayNext)}
            aria-label={`Play ${title} next`}
            title="Play next"
            onClick={() => onNext?.(item)}
          >
            <ListPlus aria-hidden />
            <span>Next</span>
          </button>
        )}
        <details
          hidden={Boolean(item.pendingAdd)}
          className="watch-queue-menu"
          data-queue-menu
          ref={menuRef}
          onToggle={(event) => setMenuOpen(event.currentTarget.open)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.currentTarget.open = false;
              e.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary aria-label={`More actions for ${title}`}>
            <MoreHorizontal aria-hidden />
          </summary>
          <div
            onClick={(e) =>
              ((e.currentTarget.parentElement as HTMLDetailsElement).open =
                false)
            }
          >
            {queued && (
              <>
                <button disabled={disabled} onClick={() => onPin?.(item)}>
                  <Pin aria-hidden />
                  {item.isPinned ? "Unpin" : "Pin"} item
                </button>
                <button
                  disabled={disabled || index === 0}
                  onClick={() => onMove?.(item.id, 0)}
                >
                  Move to top
                </button>
                <button
                  disabled={disabled || index === count - 1}
                  onClick={() => onMove?.(item.id, count - 1)}
                >
                  Move to bottom
                </button>
              </>
            )}
            {item.status === "played" && (
              <button disabled={disabled} onClick={() => onRequeue?.(item)}>
                Add to queue again
              </button>
            )}
            <button disabled={disabled} onClick={reveal}>
              <Trash2 aria-hidden />
              Remove…
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
