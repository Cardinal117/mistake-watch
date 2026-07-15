"use client";

import { useId } from "react";
import { Heart } from "lucide-react";

import type { RoomQueueItem } from "@/lib/rooms";
import type { MediaPreferenceView } from "@/lib/recommendations/use-media-preferences";
import { cx } from "@/lib/ui";

export function PreferenceHeartButton({
  className,
  item,
  preference,
  onToggle,
}: {
  className?: string;
  item: RoomQueueItem;
  onToggle(): void;
  preference: MediaPreferenceView;
}) {
  const errorId = useId();
  const actionLabel = preference.liked
    ? `Remove Like from ${item.title}`
    : `Like ${item.title}`;
  const title = preference.pending
    ? `Updating Like for ${item.title}`
    : !preference.available
      ? (preference.error ?? `Like unavailable for ${item.title}`)
      : preference.error
        ? `${preference.error} ${actionLabel}`
        : actionLabel;

  return (
    <button
      aria-label={title}
      aria-pressed={preference.liked}
      aria-describedby={preference.error ? errorId : undefined}
      className={cx(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--listen-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-35",
        preference.liked &&
          "border-[rgb(var(--listen-primary)/0.45)] bg-[rgb(var(--listen-primary)/0.12)] text-[rgb(var(--listen-primary))] shadow-[0_0_14px_rgb(var(--listen-shadow)/0.12)]",
        !preference.liked &&
          preference.available &&
          "hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-[rgb(var(--listen-primary))]",
        className,
      )}
      disabled={!preference.available || preference.pending}
      onClick={onToggle}
      title={title}
      type="button"
    >
      <Heart
        aria-hidden
        className={cx("h-4 w-4", preference.liked && "fill-current")}
      />
      {preference.error ? (
        <span className="sr-only" id={errorId} role="status">
          {preference.error}
        </span>
      ) : null}
    </button>
  );
}
