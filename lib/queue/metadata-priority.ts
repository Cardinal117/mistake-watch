export const INITIAL_QUEUE_METADATA_COUNT = 10;

const CURRENT_PRIORITY = 0;
const NEXT_PRIORITY = 1;
const INITIAL_PRIORITY = 10;
const VISIBLE_PRIORITY = 100;
const OVERSCAN_PRIORITY = 200;
const BACKGROUND_PRIORITY = 1_000;

export function getQueueMetadataPriority({
  current = false,
  firstVisibleIndex = -1,
  itemIndex,
  overscanEndIndex = -1,
  overscanStartIndex = -1,
  queuedIndex = -1,
  visibleEndIndex = -1,
}: {
  current?: boolean;
  firstVisibleIndex?: number;
  itemIndex: number;
  overscanEndIndex?: number;
  overscanStartIndex?: number;
  queuedIndex?: number;
  visibleEndIndex?: number;
}) {
  if (current) {
    return CURRENT_PRIORITY;
  }

  if (queuedIndex === 0) {
    return NEXT_PRIORITY;
  }

  if (queuedIndex > 0 && queuedIndex < INITIAL_QUEUE_METADATA_COUNT) {
    return INITIAL_PRIORITY + queuedIndex;
  }

  if (itemIndex >= firstVisibleIndex && itemIndex < visibleEndIndex) {
    return VISIBLE_PRIORITY + Math.max(0, itemIndex - firstVisibleIndex);
  }

  if (itemIndex >= overscanStartIndex && itemIndex < overscanEndIndex) {
    return OVERSCAN_PRIORITY + Math.max(0, itemIndex - overscanStartIndex);
  }

  return BACKGROUND_PRIORITY + Math.max(0, queuedIndex, itemIndex);
}
