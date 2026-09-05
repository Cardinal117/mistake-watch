"use client";

import { useMemo, useState } from "react";

import type { RoomQueueItem } from "@/lib/rooms";
import type { LiveRoomError } from "@/lib/spacetime";
import type { QueueAddInput } from "./contracts";
import { useQueueMotion } from "./use-queue-motion";
import { QueueRow } from "./queue-row";

type MeasureQueueAction = (label: string, action: () => void) => void;

export function QueueContent({
  compact = false,
  manageDisabled,
  measureQueueAction,
  mode,
  onAddQueueItem,
  onMoveQueueItem,
  onPlayQueueItem,
  onQueueItemPriorityChange,
  onRemoveQueueItem,
  previousItems,
  queuedIndexById,
  queuedItemsLength,
  roomErrors,
  upcomingItems,
}: {
  compact?: boolean;
  manageDisabled: boolean;
  measureQueueAction: MeasureQueueAction;
  mode: "listen" | "watch";
  onAddQueueItem?(input: QueueAddInput): void;
  onMoveQueueItem?(queueItemId: string, position: number): void;
  onPlayQueueItem?(queueItemId: string): void;
  onQueueItemPriorityChange?(
    queueItemId: string,
    input: { isPinned?: boolean; isPlayNext?: boolean },
  ): void;
  onRemoveQueueItem?(queueItemId: string): void;
  previousItems: RoomQueueItem[];
  queuedIndexById: Map<string, number>;
  queuedItemsLength: number;
  roomErrors: LiveRoomError[];
  upcomingItems: RoomQueueItem[];
}) {
  const [activeQueueTab, setActiveQueueTab] = useState<"history" | "up-next">(
    "up-next",
  );
  const queueListRef = useQueueMotion(
    upcomingItems.map((item) => item.id).join("|"),
    compact,
  );
  const mediaEvents = useMemo(
    () =>
      roomErrors
        .filter((error) => error.eventType?.startsWith("media-"))
        .sort((left, right) => right.createdMs - left.createdMs)
        .slice(0, 10),
    [roomErrors],
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-surface-container-lowest p-1">
        {[
          { id: "up-next", label: "Up Next" },
          { id: "history", label: "History" },
        ].map((tab) => (
          <button
            className={`h-9 rounded-sm px-3 text-label-sm font-semibold transition ${
              activeQueueTab === tab.id
                ? mode === "listen"
                  ? "bg-secondary-fixed-dim/12 text-secondary-fixed-dim"
                  : "bg-primary-fixed-dim/12 text-primary-fixed-dim"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            key={tab.id}
            onClick={() =>
              setActiveQueueTab(tab.id === "history" ? "history" : "up-next")
            }
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeQueueTab === "up-next" ? (
        upcomingItems.length > 0 ? (
          <ol className="relative grid gap-2" ref={queueListRef}>
            {upcomingItems.map((item) => {
              const queuedIndex = queuedIndexById.get(item.id) ?? -1;

              return (
                <QueueRow
                  compact={compact}
                  item={item}
                  key={item.id}
                  manageDisabled={manageDisabled}
                  mode={mode}
                  onMoveQueueItem={(queueItemId, position) =>
                    measureQueueAction("move", () =>
                      onMoveQueueItem?.(queueItemId, position),
                    )
                  }
                  onPlayNext={(queueItem) => {
                    measureQueueAction("play-next", () =>
                      onQueueItemPriorityChange?.(queueItem.id, {
                        isPlayNext: !queueItem.isPlayNext,
                      }),
                    );
                  }}
                  onPin={(queueItem) => {
                    measureQueueAction("pin", () =>
                      onQueueItemPriorityChange?.(queueItem.id, {
                        isPinned: !queueItem.isPinned,
                      }),
                    );
                  }}
                  onPlayQueueItem={
                    onPlayQueueItem
                      ? (queueItemId) =>
                          measureQueueAction("play", () =>
                            onPlayQueueItem(queueItemId),
                          )
                      : undefined
                  }
                  onRemoveQueueItem={(queueItemId) =>
                    measureQueueAction("remove", () =>
                      onRemoveQueueItem?.(queueItemId),
                    )
                  }
                  queuedIndex={queuedIndex}
                  queuedItemsLength={queuedItemsLength}
                />
              );
            })}
          </ol>
        ) : (
          <div className="rounded-md border border-dashed border-white/10 bg-surface-container-low p-4 text-body-md text-on-surface-variant">
            {mode === "listen"
              ? "No queue items yet. Add YouTube, YouTube Music, direct audio, HLS, or playlist links."
              : "No queue items yet. Add a YouTube, playlist, direct media, or HLS URL."}
          </div>
        )
      ) : previousItems.length > 0 || mediaEvents.length > 0 ? (
        <QueueHistory
          compact={compact}
          manageDisabled={manageDisabled}
          measureQueueAction={measureQueueAction}
          mediaEvents={mediaEvents}
          mode={mode}
          onAddQueueItem={onAddQueueItem}
          onPlayQueueItem={onPlayQueueItem}
          onRemoveQueueItem={onRemoveQueueItem}
          previousItems={previousItems}
          queuedItemsLength={queuedItemsLength}
        />
      ) : (
        <div className="rounded-md border border-dashed border-white/10 bg-surface-container-low p-4 text-body-md text-on-surface-variant">
          No previous items yet. Played songs will appear here.
        </div>
      )}
    </>
  );
}

function QueueHistory({
  compact,
  manageDisabled,
  measureQueueAction,
  mediaEvents,
  mode,
  onAddQueueItem,
  onPlayQueueItem,
  onRemoveQueueItem,
  previousItems,
  queuedItemsLength,
}: {
  compact?: boolean;
  manageDisabled: boolean;
  measureQueueAction: MeasureQueueAction;
  mediaEvents: LiveRoomError[];
  mode: "listen" | "watch";
  onAddQueueItem?(input: QueueAddInput): void;
  onPlayQueueItem?(queueItemId: string): void;
  onRemoveQueueItem?(queueItemId: string): void;
  previousItems: RoomQueueItem[];
  queuedItemsLength: number;
}) {
  const toQueueInput = (queueItem: RoomQueueItem): QueueAddInput => ({
    artist: queueItem.artist,
    channelName: queueItem.channelName,
    playlistId: queueItem.playlistId,
    playlistTitle: queueItem.playlistTitle,
    sourceTitle: queueItem.title,
    sourceType: queueItem.sourceType ?? "youtube",
    sourceUrl: queueItem.sourceUrl ?? "",
    thumbnailUrl: queueItem.thumbnailUrl,
  });

  return (
    <div className="grid gap-2">
      <p className="text-label-sm text-on-surface-variant">
        Showing server-recorded playback history in played order.
      </p>
      {mediaEvents.length > 0 ? (
        <section aria-label="Playback events" className="grid gap-1.5">
          <p className="technical-label text-on-surface-variant">
            Playback events
          </p>
          <ol className="grid gap-1.5">
            {mediaEvents.map((event) => (
              <li
                className="grid gap-1 rounded-sm border border-white/10 bg-surface-container-low px-3 py-2"
                key={event.errorId}
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <span className="truncate text-label-sm font-semibold text-on-surface">
                    {event.title ?? "Playback failure"}
                  </span>
                  <time
                    className="technical-label shrink-0 text-on-surface-variant"
                    dateTime={new Date(event.createdMs).toISOString()}
                  >
                    {new Date(event.createdMs).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p className="text-label-sm text-on-surface-variant">
                  {event.message}
                </p>
                <span className="technical-label text-on-surface-variant/75">
                  {event.actorSource === "system" ? "System" : "Member"}
                  {event.sourceType ? ` / ${event.sourceType}` : ""}
                  {event.providerId ? ` / ${event.providerId}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      <ol className="grid gap-2">
        {previousItems.map((item) => (
          <QueueRow
            compact={compact}
            item={item}
            key={item.id}
            manageDisabled={manageDisabled}
            mode={mode}
            onPlayNext={(queueItem) => {
              measureQueueAction("history-play-next", () =>
                onAddQueueItem?.({
                  ...toQueueInput(queueItem),
                  isPlayNext: true,
                }),
              );
            }}
            onPlayQueueItem={
              onPlayQueueItem
                ? (queueItemId) =>
                    measureQueueAction("play-history", () =>
                      onPlayQueueItem(queueItemId),
                    )
                : undefined
            }
            onRequeue={(queueItem) => {
              measureQueueAction("history-requeue", () =>
                onAddQueueItem?.(toQueueInput(queueItem)),
              );
            }}
            onRemoveQueueItem={(queueItemId) =>
              measureQueueAction("remove-history", () =>
                onRemoveQueueItem?.(queueItemId),
              )
            }
            queuedIndex={-1}
            queuedItemsLength={queuedItemsLength}
          />
        ))}
      </ol>
    </div>
  );
}
