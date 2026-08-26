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
  variant = "compact",
}: {
  className?: string;
  item: RoomQueueItem;
  onToggle(): void;
  preference: MediaPreferenceView;
  variant?: "circular" | "compact" | "inline";
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
        "inline-flex shrink-0 items-center justify-center text-on-surface-variant transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--listen-primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-35",
        variant === "compact" && "h-8 w-8 rounded-sm border border-white/10",
        variant === "circular" &&
          "h-10 w-10 rounded-full border border-white/10 bg-background/56",
        variant === "inline" &&
          "h-10 w-10 rounded-full border border-transparent bg-transparent",
        preference.liked &&
          "text-[rgb(var(--listen-primary))] shadow-[0_0_14px_rgb(var(--listen-shadow)/0.12)]",
        preference.liked &&
          variant !== "inline" &&
          "border-[rgb(var(--listen-primary)/0.45)] bg-[rgb(var(--listen-primary)/0.12)]",
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
        className={cx(
          variant === "compact" ? "h-4 w-4" : "h-5 w-5",
          preference.liked && "fill-current",
        )}
      />
      {preference.error ? (
        <span className="sr-only" id={errorId} role="status">
          {preference.error}
        </span>
      ) : null}
    </button>
  );
}
