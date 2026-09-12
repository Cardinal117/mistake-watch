import type { WatchMediaHubItem } from "../contracts";
import { parseDurationSeconds } from "../presentation";

export type WatchCatalogueSort =
  | "natural"
  | "title-desc"
  | "recent"
  | "oldest"
  | "shortest"
  | "longest";

const naturalTitleCollator = new Intl.Collator("en", {
  numeric: true,
  sensitivity: "base",
});

export function compareCatalogueTitles(
  first: Pick<WatchMediaHubItem, "title">,
  second: Pick<WatchMediaHubItem, "title">,
) {
  return naturalTitleCollator.compare(first.title, second.title);
}

export function sortWatchCatalogueItems(
  items: WatchMediaHubItem[],
  sort: WatchCatalogueSort,
) {
  return [...items].sort((first, second) => {
    const titleOrder = compareCatalogueTitles(first, second);
    if (sort === "natural") return titleOrder;
    if (sort === "title-desc") return -titleOrder;

    if (sort === "recent" || sort === "oldest") {
      const firstAdded = Date.parse(first.addedAt ?? "");
      const secondAdded = Date.parse(second.addedAt ?? "");
      if (!Number.isFinite(firstAdded) && !Number.isFinite(secondAdded))
        return titleOrder;
      if (!Number.isFinite(firstAdded)) return 1;
      if (!Number.isFinite(secondAdded)) return -1;
      const addedOrder = firstAdded - secondAdded;
      return (sort === "recent" ? -addedOrder : addedOrder) || titleOrder;
    }

    const firstDuration = parseDurationSeconds(first.duration);
    const secondDuration = parseDurationSeconds(second.duration);
    if (firstDuration === undefined && secondDuration === undefined)
      return titleOrder;
    if (firstDuration === undefined) return 1;
    if (secondDuration === undefined) return -1;
    const durationOrder = firstDuration - secondDuration;
    return (sort === "longest" ? -durationOrder : durationOrder) || titleOrder;
  });
}
