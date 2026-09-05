"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Heart, ListPlus, Play, Plus } from "lucide-react";
import type { RoomQueueItem } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import type { MediaPreferenceController } from "@/lib/recommendations/use-media-preferences";
import { parseUploadedAssetReference } from "@/lib/media/uploaded-playback-reference";
import { createUploadedPlaybackSessionReference } from "@/lib/media/uploaded-room-session-client";
import type { WatchMediaHubItem } from "../contracts";
import { parseDurationSeconds } from "../presentation";
import { LazyMediaPoster } from "../library/lazy-media-poster";

export function WatchMediaDetails({
  item,
  liveRoom,
  roomId,
  preferences,
  onClose,
}: {
  item: WatchMediaHubItem;
  liveRoom: LiveRoomState;
  roomId: string;
  preferences: MediaPreferenceController;
  onClose(): void;
}) {
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const mounted = useRef(true);
  const pendingSourceStart = useRef<string | null>(null);
  const current = useRef({ liveRoom, item });
  const titleRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    current.current = { liveRoom, item };
  }, [liveRoom, item]);
  useEffect(() => {
    mounted.current = true;
    titleRef.current?.focus();
    return () => {
      mounted.current = false;
    };
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
  useEffect(() => {
    const target = pendingSourceStart.current;
    if (!target) return;
    if (
      liveRoom.connectionStatus !== "connected" ||
      !liveRoom.canControlPlayback ||
      !liveRoom.canManageAuthority
    ) {
      pendingSourceStart.current = null;
      return;
    }
    if (liveRoom.snapshot.session?.sourceUrl === target) {
      pendingSourceStart.current = null;
      liveRoom.setPlaybackState({ positionSeconds: 0, status: "playing" });
    }
  }, [liveRoom]);
  const queueItem: RoomQueueItem = {
    ...item,
    status: item.status === "library" ? "queued" : item.status,
  };
  const preference = preferences.getPreference(queueItem);
  const connected = liveRoom.connectionStatus === "connected";
  const available = Boolean(
    item.sourceUrl && item.sourceType && !item.isUnavailable,
  );
  const queued = liveRoom.snapshot.queue.some(
    (q) => q.queueItemId === item.id && q.status === "queued",
  );
  const canPlay =
    connected &&
    available &&
    (item.status === "library"
      ? liveRoom.canManageAuthority && liveRoom.canControlPlayback
      : liveRoom.canControlPlayback);
  const canAdd = connected && available && liveRoom.canAddQueue && !queued;
  const canNext =
    connected &&
    available &&
    (queued ? liveRoom.canManageQueue : liveRoom.canAddQueue);

  async function act(action: "play" | "next" | "add") {
    if (
      pending ||
      !(action === "play" ? canPlay : action === "next" ? canNext : canAdd)
    )
      return;
    setPending(true);
    setNotice("");
    try {
      if (action === "play") {
        const assetId = parseUploadedAssetReference(item.sourceUrl);
        if (
          item.status !== "library" &&
          liveRoom.snapshot.queue.some((q) => q.queueItemId === item.id)
        ) {
          await liveRoom.playQueueItemNow(item.id);
        } else {
          const sourceUrl = assetId
            ? await createUploadedPlaybackSessionReference({ assetId, roomId })
            : item.sourceUrl!;
          // A session request may finish after authority was revoked.
          if (
            current.current.liveRoom.connectionStatus !== "connected" ||
            !current.current.liveRoom.canManageAuthority ||
            !current.current.liveRoom.canControlPlayback ||
            !mounted.current
          )
            return;
          pendingSourceStart.current = sourceUrl;
          current.current.liveRoom.loadMediaSource({
            sourceTitle: item.title,
            sourceType: item.sourceType!,
            sourceUrl,
          });
        }
      } else if (action === "next" && queued) {
        liveRoom.setQueueItemPriority(item.id, { isPlayNext: true });
      } else {
        liveRoom.addQueueItem({
          sourceTitle: item.title,
          sourceType: item.sourceType!,
          sourceUrl: item.sourceUrl!,
          thumbnailUrl: item.thumbnailUrl,
          durationSeconds:
            item.durationSeconds ?? parseDurationSeconds(item.duration),
          artist: item.artist,
          channelName: item.channelName,
          isPlayNext: action === "next",
        });
      }
      if (mounted.current)
        setNotice(
          action === "play"
            ? "Playback requested for the room."
            : action === "next"
              ? "Play next requested. Pinned-first ordering still applies."
              : "Add to queue requested.",
        );
    } catch (error) {
      if (mounted.current)
        setNotice(
          error instanceof Error
            ? error.message
            : "The room action could not be completed.",
        );
    } finally {
      if (mounted.current) setPending(false);
    }
  }

  return (
    <section className="watch-details" aria-label="Media details">
      <button className="watch-back" onClick={onClose}>
        <ArrowLeft />
        Back to results
      </button>
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
          {queued ? "In queue" : "Add to queue"}
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
