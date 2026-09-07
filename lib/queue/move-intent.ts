export type QueuePlacement = {
  edge: "before" | "after" | "start" | "end";
  anchorQueueItemId?: string;
};
export type MoveQueueAction = (
  id: string,
  position: number,
  actionId?: string,
  placement?: QueuePlacement,
) => void | Promise<void>;
export type QueueMoveIntent = QueuePlacement & { id: string; actionId: string };

export function queuePlacement(
  ids: string[],
  id: string,
  position: number,
): QueuePlacement | null {
  if (!ids.includes(id) || !Number.isFinite(position)) return null;
  const remaining = ids.filter((value) => value !== id);
  const target = Math.max(0, Math.min(remaining.length, Math.floor(position)));
  if (!target) return { edge: "start" };
  if (target === remaining.length) return { edge: "end" };
  return { edge: "before", anchorQueueItemId: remaining[target] };
}
export function projectQueueMove<T extends { id: string; status: string }>(
  items: T[],
  intent: QueueMoveIntent,
): T[] {
  const queued = items.filter((i) => i.status === "queued");
  const moving = queued.find((i) => i.id === intent.id);
  if (!moving) return items;
  const remaining = queued.filter((i) => i !== moving);
  const anchor = remaining.findIndex((i) => i.id === intent.anchorQueueItemId);
  if ((intent.edge === "before" || intent.edge === "after") && anchor < 0)
    return items;
  const index =
    intent.edge === "start"
      ? 0
      : intent.edge === "end"
        ? remaining.length
        : anchor + Number(intent.edge === "after");
  remaining.splice(index, 0, moving);
  let cursor = 0;
  return items.map((i) => (i.status === "queued" ? remaining[cursor++] : i));
}
