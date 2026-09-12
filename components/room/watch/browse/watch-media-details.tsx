"use client";
import { useEffect, useRef } from "react";
import { Heart, ListPlus, Play, Plus } from "lucide-react";
import type { RoomQueueItem } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import type { WatchMediaHubItem } from "../contracts";
import { LazyMediaPoster } from "../library/lazy-media-poster";
import {
  useWatchMediaActions,
  type WatchPlayCoordinator,
} from "./use-watch-media-actions";

export function WatchMediaDetails({
  item,
  liveRoom,
  roomId,
  preferences,
  playCoordinator,
  onClose,
}: {
  item: WatchMediaHubItem;
  liveRoom: LiveRoomState;
  roomId: string;
  preferences: MediaPreferenceController;
  playCoordinator: WatchPlayCoordinator;
  onClose(): void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { act, canAdd, canNext, canPlay, notice, pending } =
    useWatchMediaActions({ item, liveRoom, playCoordinator, roomId });
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const queueItem: RoomQueueItem = {
    ...item,
    status: item.status === "library" ? "queued" : item.status,
  };
  const preference = preferences.getPreference(queueItem);
  const connected = liveRoom.connectionStatus === "connected";
  return (
    <section className="watch-details" aria-label="Media details">
      <div className="watch-detail-art">
        {item.thumbnailUrl ? (
          <LazyMediaPoster src={item.thumbnailUrl} eager />
        ) : (
          <Play aria-hidden />
        )}
      </div>
      <p className="watch-source">
        {item.status === "library"
          ? "Library"
          : item.sourceType === "youtube"
            ? "YouTube"
            : "Room media"}{" "}
        · {item.duration}
      </p>
      <h2 ref={titleRef} tabIndex={-1}>
        {item.title}
      </h2>
      <p>
        {item.isUnavailable
          ? "This media is unavailable for playback."
          : "Choose what happens next in this room."}
      </p>
      <div className="watch-detail-actions">
        <button
          className="watch-primary-button"
          disabled={!canPlay || pending}
          onClick={() => void act("play")}
        >
          <Play />
          Play now
        </button>
        <button disabled={!canNext || pending} onClick={() => void act("next")}>
          <ListPlus />
          Play next
        </button>
        <button disabled={!canAdd || pending} onClick={() => void act("add")}>
          <Plus />
          Add to queue
        </button>
        <button
          aria-label={preference.liked ? "Unlike media" : "Like media"}
          aria-pressed={preference.liked}
          disabled={!preference.available || preference.pending || !connected}
          onClick={() => void preferences.togglePreference(queueItem)}
        >
          <Heart fill={preference.liked ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="watch-action-hint">
        Play now replaces the room’s current media. Browsing and Likes are
        personal.
      </p>
      {!canPlay && (
        <p className="watch-permission">
          Playback requires room control. Available queue actions are shown
          above.
        </p>
      )}
      {(notice || pending) && (
        <p role="status">{pending ? "Requesting room action…" : notice}</p>
      )}
      {(liveRoom.errorMessage || preference.error) && (
        <p role="alert" className="watch-error">
          {liveRoom.errorMessage || preference.error}
        </p>
      )}
    </section>
  );
}
