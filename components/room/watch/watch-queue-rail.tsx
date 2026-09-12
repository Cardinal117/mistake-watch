"use client";
import { ListMusic, ListPlus } from "lucide-react";
import type { RoomQueueItem } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { artistLabel } from "@/lib/ui/artist-label";
import { QueueArtwork } from "../listen/discovery/media-cards";
import { deriveListenUpNextPreview } from "../listen/now-playing/up-next-presentation";

/** A bounded navigation preview; all queue management stays in the full queue. */
export function WatchQueueRail({
  items,
  liveRoom,
  onOpenQueue,
}: {
  items: RoomQueueItem[];
  liveRoom: LiveRoomState;
  onOpenQueue(): void;
}) {
  const upcoming = items.filter((item) => item.status === "queued");
  const preview = deriveListenUpNextPreview(upcoming);
  return (
    <section className="watch-next-preview" aria-label="Up next preview">
      <button
        className="watch-next-heading"
        onClick={onOpenQueue}
        aria-label="Open full queue"
      >
        <strong>Up next</strong>
        <span>
          Queue {upcoming.length} <ListMusic aria-hidden />
        </span>
      </button>
      {preview.map((item) => (
        <div className="watch-next-row" key={item.id}>
          <button
            className="watch-next-link"
            onClick={onOpenQueue}
            aria-label={`Open queue. Up next: ${item.title}`}
          >
            <QueueArtwork
              className="h-10 w-10 rounded-md"
              thumbnailUrl={item.thumbnailUrl}
              title={item.title}
            />
            <span className="watch-next-copy">
              <strong>{item.title}</strong>
              <small>
                {artistLabel(item.artist ?? item.channelName ?? "Room source")}
              </small>
            </span>
            <span>{item.duration}</span>
          </button>
          <button
            className="watch-next-action"
            title="Play next"
            aria-label={`Play ${item.title} next`}
            disabled={
              liveRoom.connectionStatus !== "connected" ||
              !liveRoom.canManageQueue
            }
            onClick={() =>
              liveRoom.setQueueItemPriority(item.id, { isPlayNext: true })
            }
          >
            <ListPlus aria-hidden />
          </button>
        </div>
      ))}
      {!preview.length && (
        <button className="watch-next-empty" onClick={onOpenQueue}>
          Choose what plays next
        </button>
      )}
    </section>
  );
}
