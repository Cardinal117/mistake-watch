export const GRID_CATALOGUE_BATCH_SIZE = 24;
export const LIST_CATALOGUE_BATCH_SIZE = 12;

export type CatalogueViewMode = "grid" | "list";

export function getCatalogueResultRevision(items: Array<{ id: string }>) {
  return items.map((item) => item.id).join("|");
}

export function summarizeCatalogue<
  T extends {
    folderId?: string | null;
    visibility?: string;
  },
>(items: T[], isLive: (item: T) => boolean) {
  const folderCounts = new Map<string, number>();
  let hiddenCount = 0;
  let liveCount = 0;
  let unsortedCount = 0;

  for (const item of items) {
    if (item.folderId) {
      folderCounts.set(
        item.folderId,
        (folderCounts.get(item.folderId) ?? 0) + 1,
      );
    } else {
      unsortedCount += 1;
    }

    if (item.visibility === "owner_only") {
      hiddenCount += 1;
    }

    if (isLive(item)) {
      liveCount += 1;
    }
  }

  return { folderCounts, hiddenCount, liveCount, unsortedCount };
}

export function getCatalogueBatchSize(viewMode: CatalogueViewMode) {
  return viewMode === "grid"
    ? GRID_CATALOGUE_BATCH_SIZE
    : LIST_CATALOGUE_BATCH_SIZE;
}

export function getProgressiveCatalogueWindow({
  itemCount,
  requestedCount,
  viewMode,
}: {
  itemCount: number;
  requestedCount: number;
  viewMode: CatalogueViewMode;
}) {
  const batchSize = getCatalogueBatchSize(viewMode);
  const safeItemCount = Number.isFinite(itemCount)
    ? Math.max(0, Math.floor(itemCount))
    : 0;
  const safeRequestedCount = Number.isFinite(requestedCount)
    ? Math.max(batchSize, Math.floor(requestedCount))
    : batchSize;
  const visibleCount = Math.min(safeItemCount, safeRequestedCount);

  return {
    batchSize,
    hasMore: visibleCount < safeItemCount,
    visibleCount,
  };
}

export function getNextCatalogueCount({
  currentCount,
  itemCount,
  viewMode,
}: {
  currentCount: number;
  itemCount: number;
  viewMode: CatalogueViewMode;
}) {
  return getProgressiveCatalogueWindow({
    itemCount,
    requestedCount: currentCount + getCatalogueBatchSize(viewMode),
    viewMode,
  }).visibleCount;
}
