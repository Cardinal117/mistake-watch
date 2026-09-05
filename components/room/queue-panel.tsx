"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import { Badge, Button } from "@/components/ui";
import { deriveQueueState } from "@/lib/queue/derived";
import {
  shuffleUpcomingQueue,
  smartShuffleQueue,
  type QueueMode,
} from "@/lib/queue/model";
import { useQueueActionPerformance } from "@/lib/performance/use-queue-action-performance";
import { cx } from "@/lib/ui";
import { QueueContent } from "./queue/queue-content";
import { QueueControls } from "./queue/queue-controls";
import {
  QueueNotifications,
  useQueueNotifications,
} from "./queue/queue-notifications";
import { toSmartShuffleItem } from "./queue/queue-utils";
import type { QueuePanelProps } from "./queue/contracts";
import { AddMediaDialog } from "./shared/add-media/add-media-dialog";

export function QueuePanel({
  canAddQueue = false,
  canLoadSource = false,
  canManageQueue = false,
  connectionStatus,
  id,
  items,
  mode = "watch",
  onAddQueueItem,
  onClearQueue,
  onLoadSource,
  onMoveQueueItem,
  onPlayQueueItem,
  onQueueItemPriorityChange,
  onQueueModeChange,
  onRemoveQueueItem,
  presentation = "default",
  queueMode = "normal",
  roomErrors = [],
  roomId,
}: QueuePanelProps) {
  const [addMediaOpen, setAddMediaOpen] = useState(false);
  const queueState = useMemo(() => deriveQueueState(items), [items]);
  const {
    currentItem,
    playedItems: historyItems,
    playedItemsBySequence: previousItems,
    queuedIndexById,
    queuedItems,
    upcomingItems,
  } = queueState;
  const measureQueueAction = useQueueActionPerformance(items);
  const { notifications, notify } = useQueueNotifications(roomErrors);
  const isConnected = connectionStatus === "connected";
  const addDisabled = !canAddQueue || !isConnected;
  const loadDisabled = !canLoadSource || !isConnected;
  const manageDisabled = !canManageQueue || !isConnected;
  const hub = presentation === "hub";
  const workspace = presentation === "watch-workspace";

  function applyQueueShuffle(strategy: "shuffle" | "smart") {
    if (manageDisabled) {
      return;
    }

    const nextOrder =
      strategy === "smart"
        ? smartShuffleQueue(
            queuedItems.map(toSmartShuffleItem),
            [...historyItems, ...(currentItem ? [currentItem] : [])].map(
              toSmartShuffleItem,
            ),
          )
        : shuffleUpcomingQueue(queuedItems.map(toSmartShuffleItem));
    const clientActionId = crypto.randomUUID();

    nextOrder.forEach((item, index) => {
      onMoveQueueItem?.(item.queueItemId, index, clientActionId);
    });

    onQueueModeChange?.(strategy === "smart" ? "smartShuffle" : "shuffle");
  }

  function handleQueueModeChange(nextMode: QueueMode) {
    onQueueModeChange?.(nextMode);

    if (nextMode === "shuffle") {
      applyQueueShuffle("shuffle");
    }

    if (nextMode === "smartShuffle") {
      applyQueueShuffle("smart");
    }
  }

  return (
    <div className={cx("grid min-w-0", hub ? "gap-3" : "gap-4")} id={id}>
      {!workspace && (
        <div
          className={cx(
            hub
              ? "flex min-w-0 flex-wrap items-center justify-between gap-3"
              : undefined,
          )}
        >
          <div className="min-w-0">
            <Badge tone={mode === "listen" ? "amber" : "cyan"}>Queue</Badge>
            <h2
              className={cx(
                "font-semibold text-on-surface",
                hub ? "mt-2 text-body-lg" : "mt-3 text-headline-md",
              )}
            >
              Up next
            </h2>
          </div>
          {hub ? (
            <Button
              className="shrink-0"
              disabled={!isConnected || (!canAddQueue && !canLoadSource)}
              onClick={() => setAddMediaOpen(true)}
              size="sm"
              type="button"
              variant={mode === "listen" ? "secondary" : "primary"}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add Media
            </Button>
          ) : null}
        </div>
      )}

      {hub || workspace ? null : (
        <Button
          className="w-full"
          disabled={!isConnected || (!canAddQueue && !canLoadSource)}
          onClick={() => setAddMediaOpen(true)}
          type="button"
          variant={mode === "listen" ? "secondary" : "primary"}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Media
        </Button>
      )}

      {!workspace && (
        <AddMediaDialog
          addDisabled={addDisabled}
          canAddQueue={canAddQueue}
          canLoadSource={canLoadSource}
          historyItems={historyItems}
          isConnected={isConnected}
          items={items}
          loadDisabled={loadDisabled}
          mode={mode}
          notify={notify}
          onAddQueueItem={onAddQueueItem}
          onClose={() => setAddMediaOpen(false)}
          onLoadSource={onLoadSource}
          open={addMediaOpen}
          queueMode={queueMode}
          roomId={roomId}
        />
      )}

      <QueueNotifications notifications={notifications} />

      <QueueControls
        compact={workspace}
        canManageQueue={canManageQueue}
        hub={hub}
        manageDisabled={manageDisabled}
        mode={mode}
        onClearQueue={onClearQueue}
        onQueueModeChange={handleQueueModeChange}
        onShuffle={applyQueueShuffle}
        queuedItemsLength={queuedItems.length}
        queueMode={queueMode}
      />

      <QueueContent
        compact={workspace}
        manageDisabled={manageDisabled}
        measureQueueAction={measureQueueAction}
        mode={mode}
        onAddQueueItem={onAddQueueItem}
        onMoveQueueItem={onMoveQueueItem}
        onPlayQueueItem={onPlayQueueItem}
        onQueueItemPriorityChange={onQueueItemPriorityChange}
        onRemoveQueueItem={onRemoveQueueItem}
        previousItems={previousItems}
        queuedIndexById={queuedIndexById}
        queuedItemsLength={queuedItems.length}
        roomErrors={roomErrors}
        upcomingItems={upcomingItems}
      />
    </div>
  );
}
