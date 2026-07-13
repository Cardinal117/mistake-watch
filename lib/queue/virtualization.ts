export const MAX_VIRTUAL_QUEUE_ROWS = 30;
export const QUEUE_VIRTUAL_OVERSCAN_ROWS = 4;

type QueueVirtualWindowInput = {
  itemCount: number;
  maxMountedItems?: number;
  overscan?: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
};

export type QueueVirtualWindow = {
  endIndex: number;
  firstVisibleIndex: number;
  mountedItemCount: number;
  offsetTop: number;
  startIndex: number;
  totalHeight: number;
  visibleEndIndex: number;
};

function toNonNegativeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function toPositiveNumber(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getQueueVirtualWindow({
  itemCount,
  maxMountedItems = MAX_VIRTUAL_QUEUE_ROWS,
  overscan = QUEUE_VIRTUAL_OVERSCAN_ROWS,
  rowHeight,
  scrollTop,
  viewportHeight,
}: QueueVirtualWindowInput): QueueVirtualWindow {
  const safeItemCount = toNonNegativeInteger(itemCount);
  const safeRowHeight = toPositiveNumber(rowHeight, 1);
  const safeViewportHeight = toPositiveNumber(
    viewportHeight,
    safeRowHeight * 8,
  );
  const safeOverscan = toNonNegativeInteger(overscan);
  const safeMaxMountedItems = Math.max(
    1,
    toNonNegativeInteger(maxMountedItems),
  );
  const totalHeight = safeItemCount * safeRowHeight;

  if (safeItemCount === 0) {
    return {
      endIndex: 0,
      firstVisibleIndex: 0,
      mountedItemCount: 0,
      offsetTop: 0,
      startIndex: 0,
      totalHeight: 0,
      visibleEndIndex: 0,
    };
  }

  const maxScrollTop = Math.max(0, totalHeight - safeViewportHeight);
  const safeScrollTop = Math.min(
    maxScrollTop,
    Math.max(0, Number.isFinite(scrollTop) ? scrollTop : 0),
  );
  const firstVisibleIndex = Math.min(
    safeItemCount - 1,
    Math.floor(safeScrollTop / safeRowHeight),
  );
  const visibleItemCount = Math.min(
    safeItemCount,
    Math.max(1, Math.ceil(safeViewportHeight / safeRowHeight) + 1),
  );
  const visibleEndIndex = Math.min(
    safeItemCount,
    firstVisibleIndex + visibleItemCount,
  );
  const desiredStartIndex = Math.max(0, firstVisibleIndex - safeOverscan);
  const desiredEndIndex = Math.min(
    safeItemCount,
    firstVisibleIndex + visibleItemCount + safeOverscan,
  );
  const startIndex = desiredStartIndex;
  const endIndex = Math.min(desiredEndIndex, startIndex + safeMaxMountedItems);

  return {
    endIndex,
    firstVisibleIndex,
    mountedItemCount: endIndex - startIndex,
    offsetTop: startIndex * safeRowHeight,
    startIndex,
    totalHeight,
    visibleEndIndex,
  };
}

export function getQueueScrollTopForIndex({
  index,
  itemCount,
  rowHeight,
  viewportHeight,
}: {
  index: number;
  itemCount: number;
  rowHeight: number;
  viewportHeight: number;
}) {
  const safeItemCount = toNonNegativeInteger(itemCount);
  const safeRowHeight = toPositiveNumber(rowHeight, 1);
  const safeViewportHeight = toPositiveNumber(viewportHeight, safeRowHeight);

  if (safeItemCount === 0) {
    return 0;
  }

  const safeIndex = Math.min(safeItemCount - 1, toNonNegativeInteger(index));
  const centeredScrollTop =
    safeIndex * safeRowHeight -
    Math.max(0, (safeViewportHeight - safeRowHeight) / 2);
  const maxScrollTop = Math.max(
    0,
    safeItemCount * safeRowHeight - safeViewportHeight,
  );

  return Math.min(maxScrollTop, Math.max(0, centeredScrollTop));
}
