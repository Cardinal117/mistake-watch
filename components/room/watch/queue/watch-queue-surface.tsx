"use client";

import { Film } from "lucide-react";

import type { AccountSummary } from "@/lib/account/types";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { QueuePanel } from "../../queue-panel";
import type { WatchSurfaceId } from "../contracts";
import { WatchMediaHubDiscovery } from "../media-hub/watch-media-hub";
import { getQueueItems } from "../presentation";
import { WatchSurfaceHeader } from "../watch-surface-header";

export function WatchQueueSurface({
  account,
  activeSurface,
  liveRoom,
  onClose,
  room,
}: {
  account: AccountSummary;
  activeSurface: WatchSurfaceId | null;
  liveRoom: LiveRoomState;
  onClose(): void;
  room: RoomSnapshot;
}) {
  if (activeSurface !== "queue") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        aria-label="Close watch surface"
        className="watch-surface-scrim absolute inset-0 bg-background/45 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <WatchQueueSheet
        account={account}
        liveRoom={liveRoom}
        onClose={onClose}
        room={room}
      />
    </div>
  );
}

function WatchQueueSheet({
  account,
  liveRoom,
  onClose,
  room,
}: {
  account: AccountSummary;
  liveRoom: LiveRoomState;
  onClose(): void;
  room: RoomSnapshot;
}) {
  const queueItems = getQueueItems(liveRoom, room);
  const controllerMemberId =
    liveRoom.participants.find((participant) => participant.isController)?.id ??
    null;
  const canLoadSource =
    liveRoom.canManageAuthority && liveRoom.connectionStatus === "connected";

  return (
    <aside className="watch-queue-sheet absolute inset-x-2 bottom-2 grid max-h-[min(94dvh,56rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/10 bg-background/18 shadow-[0_22px_70px_rgb(0_0_0_/_0.42),inset_0_0_34px_rgb(0_219_233_/_0.04)] backdrop-blur-[3px] md:inset-x-6 md:bottom-auto md:top-2 md:mx-auto md:max-w-[92rem]">
      <div className="h-1 bg-primary-fixed-dim/65 shadow-[0_0_18px_rgb(0_219_233_/_0.28)]" />
      <WatchSurfaceHeader
        eyebrow="Watch media hub"
        icon={<Film className="h-4 w-4" aria-hidden />}
        onClose={onClose}
        title="Queue and media"
      />
      <div className="grid min-h-0 gap-3 overflow-hidden p-3 md:grid-cols-[minmax(28rem,1.25fr)_minmax(22rem,0.85fr)] md:p-4">
        <WatchMediaHubDiscovery
          canAddQueue={liveRoom.canAddQueue}
          canLoadSource={canLoadSource}
          canManageQueue={liveRoom.canManageQueue}
          isOwner={
            account.status === "signed-in" &&
            account.role === "owner" &&
            account.accountStatus === "active"
          }
          items={queueItems}
          onAddQueueItem={liveRoom.addQueueItem}
          onLoadSource={liveRoom.loadMediaSource}
          onPlayNext={(queueItemId) =>
            liveRoom.setQueueItemPriority(queueItemId, { isPlayNext: true })
          }
          onPlayQueueItem={liveRoom.playQueueItemNow}
          roomId={room.id}
        />
        <div className="min-h-0 overflow-y-auto rounded-md border border-white/10 bg-background/10 p-3 shadow-[inset_0_0_24px_rgb(229_226_227_/_0.018)] [scrollbar-color:rgb(0_219_233_/_0.32)_transparent] [scrollbar-width:thin]">
          <QueuePanel
            canAddQueue={liveRoom.canAddQueue}
            canLoadSource={canLoadSource}
            canManageQueue={liveRoom.canManageQueue}
            connectionStatus={liveRoom.connectionStatus}
            items={queueItems}
            mode={room.mode}
            onAddQueueItem={liveRoom.addQueueItem}
            onClearQueue={liveRoom.clearQueue}
            onLoadSource={liveRoom.loadMediaSource}
            onMoveQueueItem={liveRoom.moveQueueItem}
            onPlayQueueItem={liveRoom.playQueueItemNow}
            onQueueModeChange={liveRoom.setQueueMode}
            onQueueItemPriorityChange={liveRoom.setQueueItemPriority}
            onRemoveQueueItem={liveRoom.removeQueueItem}
            presentation="hub"
            queueMode={liveRoom.snapshot.session?.queueMode ?? "normal"}
            roomErrors={liveRoom.snapshot.errors}
            roomId={room.id}
          />
        </div>
        <span className="sr-only">
          Current controller: {controllerMemberId ?? "none"}
        </span>
      </div>
    </aside>
  );
}
