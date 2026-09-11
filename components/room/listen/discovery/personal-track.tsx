"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Copy,
  Heart,
  ListPlus,
  MoreHorizontal,
  Play,
  Plus,
  X,
} from "lucide-react";
import type { PersonalTrack } from "@/lib/recommendations/personal-discovery-model";
import type {
  DiscoverFeedbackState,
  DiscoverSurface,
} from "@/lib/recommendations/discover-contracts";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import { QueueArtwork } from "./media-cards";
import { useRegularExpansion } from "./use-regular-expansion";
import { artistLabel } from "@/lib/ui/artist-label";
import { getListenTheme, useArtworkTheme } from "../theme/listen-theme";
import { readableWatchAccent } from "@/components/room/watch/watch-accent";

export function PersonalTrackView({
  item,
  surface,
  regular = false,
  reason,
  queued,
  pending,
  added,
  canPlay,
  canAdd,
  busy,
  preferences,
  onPlay,
  onAdd,
  onFeedback,
  onShown,
  observationKey,
}: {
  item: PersonalTrack;
  surface: DiscoverSurface;
  regular?: boolean;
  reason?: string;
  queued: boolean;
  pending: boolean;
  added: boolean;
  canPlay: boolean;
  canAdd: boolean;
  busy: boolean;
  preferences: MediaPreferenceController;
  onPlay(): void;
  onAdd(next?: boolean): void;
  onFeedback(state: DiscoverFeedbackState): void;
  onShown(): void;
  observationKey?: string;
}) {
  const article = useRef<HTMLElement>(null);
  const artworkTheme = useArtworkTheme(
    regular ? item.thumbnailUrl : null,
    getListenTheme(item.videoId),
  );
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const preview = useRef<HTMLButtonElement>(null);
  const expansion = useRegularExpansion(article, menu, preview);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [likeError, setLikeError] = useState<string | null>(null);
  const preference = preferences.getPreference(item);
  const liked = preference.loaded ? preference.liked : item.liked;
  const shown = useRef(onShown);
  useEffect(() => {
    shown.current = onShown;
  }, [onShown]);
  useEffect(() => {
    const node = article.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5) &&
          document.visibilityState === "visible"
        )
          shown.current();
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [observationKey]);
  useLayoutEffect(() => {
    if (!open) return;
    const anchor = trigger.current!.getBoundingClientRect();
    const height = menu.current?.offsetHeight ?? 300;
    setPosition({
      left: Math.max(8, Math.min(innerWidth - 264, anchor.right - 256)),
      top: Math.max(8, Math.min(innerHeight - height - 8, anchor.bottom + 4)),
    });
    menu.current
      ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
      ?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (e: Event) => {
      if (
        e.target instanceof Node &&
        !menu.current?.contains(e.target) &&
        !trigger.current?.contains(e.target)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, [open]);
  function close() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  function action(callback: () => void) {
    close();
    callback();
  }
  const label = pending ? "Adding…" : "Add to queue";
  function queueTrack(next = false) {
    const node = article.current;
    if (surface === "recommended" && node?.contains(document.activeElement)) {
      const neighbour = node.nextElementSibling ?? node.previousElementSibling;
      const target =
        neighbour?.querySelector<HTMLButtonElement>("button:not(:disabled)") ??
        node
          .closest(".personal-discovery")
          ?.querySelector<HTMLButtonElement>(
            ".personal-back, #personal-view-recommended",
          );
      requestAnimationFrame(
        () => target?.isConnected && target.focus({ preventScroll: true }),
      );
    }
    onAdd(next);
  }
  return (
    <article
      ref={article}
      style={
        regular
          ? ({
              "--personal-artwork-accent": readableWatchAccent(
                artworkTheme.primary,
              ),
            } as CSSProperties)
          : undefined
      }
      className={regular ? "personal-regular" : "personal-track-row"}
      data-media-id={item.videoId}
      data-expanded={
        regular ? expansion.expanded || expansion.closing : undefined
      }
      data-closing={regular ? expansion.closing : undefined}
    >
      {regular && (
        <span
          className="personal-play-count-badge"
          role="img"
          aria-label={`${item.completedPlayCount ?? 0} recorded plays`}
          title={`${item.completedPlayCount ?? 0} recorded completed plays in this Personal room over the last 180 days`}
        >
          {item.completedPlayCount ?? 0}
        </span>
      )}
      {regular && (
        <button
          ref={preview}
          className="personal-regular-preview"
          hidden={expansion.expanded}
          aria-label={`Show actions for ${item.title}`}
          aria-expanded={expansion.expanded}
          onClick={expansion.expand}
          type="button"
        >
          <QueueArtwork thumbnailUrl={item.thumbnailUrl} title={item.title} />
          <span className="personal-track-title">{item.title}</span>
          {queued && (
            <span
              title="Already in queue; you can add another copy"
              aria-label="Already in queue"
            >
              <Copy size={14} aria-hidden />
            </span>
          )}
        </button>
      )}
      <div
        className={
          regular ? "personal-regular-details" : "personal-row-details"
        }
        inert={regular && !expansion.expanded}
        aria-hidden={regular && !expansion.expanded ? true : undefined}
      >
        <button
          className="personal-artwork"
          aria-label={`Play ${item.title}`}
          disabled={!canPlay || item.isUnavailable}
          onClick={onPlay}
          type="button"
        >
          <QueueArtwork
            thumbnailUrl={item.thumbnailUrl}
            title={item.title}
            className="h-full w-full rounded-none border-0"
          />
          <span className="personal-artwork-play">
            <Play size={18} fill="currentColor" aria-hidden />
          </span>
        </button>
        <div className="personal-track-text">
          <p className="personal-track-title" title={item.title}>
            {item.title}
          </p>
          <p
            className="personal-track-artist"
            title={artistLabel(item.artist ?? item.channelName)}
          >
            {artistLabel(item.artist ?? item.channelName ?? "YouTube")}
          </p>
          {!regular && surface === "regulars" && (
            <p className="personal-track-count">
              {item.completedPlayCount ?? 0} recorded plays
            </p>
          )}
        </div>
        {!regular && reason && (
          <p className="personal-track-reason">{reason}</p>
        )}
        {(regular || surface === "regulars") && (
          <button
            className="personal-like"
            aria-label={`${liked ? "Remove Like from" : "Like"} ${item.title}`}
            aria-pressed={!!liked}
            disabled={
              !preference.available || !preference.loaded || preference.pending
            }
            onClick={() => {
              setLikeError(null);
              void preferences
                .togglePreference(
                  item,
                  preference.loaded ? preference.liked : item.liked,
                )
                .catch(() => setLikeError("Like was not saved."));
            }}
            type="button"
          >
            <Heart
              size={17}
              fill={liked ? "currentColor" : "none"}
              aria-hidden
            />
          </button>
        )}
        {!regular && (
          <span className="personal-duration">
            <span>
              {item.durationSeconds
                ? `${Math.floor(item.durationSeconds / 60)}:${String(Math.floor(item.durationSeconds % 60)).padStart(2, "0")}`
                : ""}
            </span>
            <span className="personal-duplicate-slot">
              {queued && (
                <span
                  title="Already in queue; you can add another copy"
                  aria-label="Already in queue"
                >
                  <Copy size={14} aria-hidden />
                </span>
              )}
            </span>
          </span>
        )}
        <div className="personal-queue-actions">
          {regular && queued && (
            <span
              title="Already in queue; you can add another copy"
              aria-label="Already in queue"
            >
              <Copy size={14} aria-hidden />
            </span>
          )}
          <button
            className="personal-add"
            onClick={() => queueTrack()}
            disabled={!canAdd || pending || item.isUnavailable}
            type="button"
            aria-label={`${label} · ${item.title}`}
            title={label}
          >
            {added && !pending ? (
              <Check size={15} aria-hidden />
            ) : (
              <Plus size={15} aria-hidden />
            )}
            {regular && <span>{label}</span>}
          </button>
          <button
            className="personal-next"
            type="button"
            aria-label={`Add next · ${item.title}`}
            title="Add next"
            onClick={() => queueTrack(true)}
            disabled={!canAdd || pending || item.isUnavailable}
          >
            <ListPlus size={17} aria-hidden />
            {regular && <span>Add next</span>}
          </button>
        </div>
        <button
          ref={trigger}
          className="personal-more"
          type="button"
          aria-label={`More options for ${item.title}`}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <MoreHorizontal size={18} aria-hidden />
        </button>
        {(likeError || preference.error) && (
          <span className="personal-track-error" role="status">
            {likeError ?? preference.error}
          </span>
        )}
      </div>
      {open &&
        createPortal(
          <div
            ref={menu}
            className="personal-track-menu"
            style={{ left: position.left, top: position.top }}
            role="menu"
            aria-label={`Options for ${item.title}`}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                close();
              }
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                const buttons = [
                  ...menu.current!.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  ),
                ];
                const at = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                const index =
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? buttons.length - 1
                      : (at +
                          (event.key === "ArrowUp" ? -1 : 1) +
                          buttons.length) %
                        buttons.length;
                buttons[index]?.focus();
              }
            }}
          >
            <button
              role="menuitem"
              disabled={!canPlay || item.isUnavailable}
              onClick={() => action(onPlay)}
            >
              <Play size={16} aria-hidden />
              Play now
            </button>
            <button
              role="menuitem"
              disabled={!canAdd || pending || item.isUnavailable}
              onClick={() => action(() => queueTrack())}
            >
              <Plus size={16} aria-hidden />
              Add to queue
            </button>
            <button
              role="menuitem"
              disabled={!canAdd || pending || item.isUnavailable}
              onClick={() => action(() => queueTrack(true))}
            >
              <Play size={16} aria-hidden />
              Play next
            </button>
            <div role="separator" />
            <button
              role="menuitem"
              disabled={busy}
              onClick={() => action(() => onFeedback("not_now"))}
            >
              <X size={16} aria-hidden />
              Not now · 7 days
            </button>
            <button
              role="menuitem"
              disabled={busy}
              onClick={() => action(() => onFeedback("do_not_suggest"))}
            >
              Don&apos;t suggest this track
            </button>
            <button
              role="menuitem"
              disabled={busy}
              onClick={() => action(() => onFeedback("wrong_version"))}
            >
              Wrong version
            </button>
          </div>,
          document.body,
        )}
    </article>
  );
}
