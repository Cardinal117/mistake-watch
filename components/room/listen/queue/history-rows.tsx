"use client";
import type { ComponentProps } from "react";
import type { QueueVirtualWindow } from "@/lib/queue/virtualization";
import type { RoomQueueItem } from "@/lib/rooms";
import { getQueueMetadataPriority } from "@/lib/queue/metadata-priority";
import { ListenQueueRow } from "./queue-row";
type RowProps = ComponentProps<typeof ListenQueueRow>;
export function ListenHistoryRows({
  items,
  window: virtualWindow,
  total,
  rowHeight,
  currentId,
  indices,
  rowProps,
}: {
  items: RoomQueueItem[];
  window: QueueVirtualWindow;
  total: number;
  rowHeight: number;
  currentId?: string;
  indices: Map<string, number>;
  rowProps: Omit<
    RowProps,
    "current" | "index" | "item" | "metadataPriority" | "queuedIndex"
  >;
}) {
  return (
    <div
      aria-label="Queue history"
      role="list"
      className="relative"
      style={{ height: virtualWindow.totalHeight }}
    >
      <div
        className="absolute inset-x-0 top-0"
        style={{ transform: `translateY(${virtualWindow.offsetTop}px)` }}
      >
        {items.map((item, localIndex) => {
          const index = virtualWindow.startIndex + localIndex,
            queuedIndex = indices.get(item.id) ?? -1;
          return (
            <div
              key={item.id}
              role="listitem"
              aria-posinset={index + 1}
              aria-setsize={total}
              data-queue-row-index={index}
              style={{ height: rowHeight }}
            >
              <ListenQueueRow
                {...rowProps}
                current={item.id === currentId}
                index={index}
                item={item}
                queuedIndex={queuedIndex}
                metadataPriority={getQueueMetadataPriority({
                  current: item.id === currentId,
                  firstVisibleIndex: virtualWindow.firstVisibleIndex,
                  itemIndex: index,
                  overscanEndIndex: virtualWindow.endIndex,
                  overscanStartIndex: virtualWindow.startIndex,
                  queuedIndex,
                  visibleEndIndex: virtualWindow.visibleEndIndex,
                })}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
