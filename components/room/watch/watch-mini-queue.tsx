"use client";

import { ArrowRight } from "lucide-react";
import type { RoomQueueItem } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { QueuePanel } from "../queue-panel";
import type { WatchMediaHubItem } from "./contracts";
import "./watch-mini-queue.css";

export function WatchMiniQueue({
  items,
  liveRoom,
  onOpenQueue,
  roomId,
}: {
  items: WatchMediaHubItem[];
  liveRoom: LiveRoomState;
  onOpenQueue(): void;
  roomId: string;
}) {
  const queueItems = items.filter(
    (item): item is RoomQueueItem => item.status !== "library",
  );
  const queuedCount = queueItems.filter(
    (item) => item.status === "queued",
  ).length;
  const connected = liveRoom.connectionStatus === "connected";

  return (
    <section className="watch-mini-queue" aria-label="Queue">
      <header className="watch-mini-queue-heading">
        <h2>Queue</h2>
        <span>{queuedCount}</span>
      </header>
      <div className="watch-mini-queue-body">
        <QueuePanel
          canAddQueue={liveRoom.canAddQueue}
          canLoadSource={liveRoom.canManageAuthority && connected}
          canManageQueue={liveRoom.canManageQueue}
          connectionStatus={liveRoom.connectionStatus}
          items={queueItems}
          mode="watch"
          onAddQueueItem={liveRoom.addQueueItem}
          onClearQueue={liveRoom.clearQueue}
          onLoadSource={liveRoom.loadMediaSource}
          onMoveQueueItem={liveRoom.moveQueueItem}
          onPlayQueueItem={
            liveRoom.canControlPlayback ? liveRoom.playQueueItemNow : undefined
          }
          onQueueItemPriorityChange={liveRoom.setQueueItemPriority}
          onQueueModeChange={liveRoom.setQueueMode}
          onRemoveQueueItem={liveRoom.removeQueueItem}
          presentation="watch-rail"
          queueMode={liveRoom.snapshot.session?.queueMode ?? "normal"}
          roomErrors={liveRoom.snapshot.errors}
          roomId={roomId}
        />
      </div>
      <button className="watch-mini-queue-open" onClick={onOpenQueue}>
        Open full queue
        <ArrowRight aria-hidden />
      </button>
    </section>
  );
}
