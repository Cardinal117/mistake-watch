"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  projectQueueMove,
  canonicalQueuePlacement,
  type MoveQueueAction,
  type QueueMoveIntent,
} from "@/lib/queue/move-intent";
import type { RoomQueueItem } from "@/lib/rooms";

const CONFIRMATION_TIMEOUT_MS = 8000;
export function useOptimisticQueue(
  items: RoomQueueItem[],
  disabled: boolean,
  onMove?: MoveQueueAction,
) {
  const [pending, setPending] = useState<QueueMoveIntent[]>([]);
  const [notice, setNotice] = useState("");
  const generation = useRef(0);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const projected = useMemo(
    () => (disabled ? items : pending.reduce(projectQueueMove, items)),
    [items, pending, disabled],
  );
  useEffect(() => {
    if (!disabled) return;
    generation.current++;
    const frame = requestAnimationFrame(() => {
      setPending([]);
    });
    for (const timer of timers.current.values()) clearTimeout(timer);
    timers.current.clear();
    return () => cancelAnimationFrame(frame);
  }, [disabled]);
  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      for (const timer of activeTimers.values()) clearTimeout(timer);
      activeTimers.clear();
    };
  }, []);
  function move(id: string, position: number) {
    if (disabled || !onMove) return;
    if (timers.current.size >= 32) {
      setNotice("Waiting for the room to confirm recent moves.");
      return;
    }
    const canonical = canonicalQueuePlacement(projected, id, position);
    if (!canonical) return;
    const { placement } = canonical;
    const actionId = crypto.randomUUID(),
      epoch = generation.current;
    const intent = { ...placement, id, actionId };
    setNotice("");
    setPending((current) => [...current, intent]);
    const settle = (message?: string) => {
      const timer = timers.current.get(actionId);
      if (!timer || epoch !== generation.current) return;
      clearTimeout(timer);
      timers.current.delete(actionId);
      setPending((current) =>
        current.filter((move) => move.actionId !== actionId),
      );
      if (message) setNotice(message);
    };
    timers.current.set(
      actionId,
      setTimeout(
        () => settle("Move confirmation timed out. Showing the room queue."),
        CONFIRMATION_TIMEOUT_MS,
      ),
    );
    try {
      const result = onMove(id, canonical.position, actionId, placement);
      if (result && typeof result.then === "function")
        result.then(
          () => settle(),
          (error) =>
            settle(
              error instanceof Error
                ? error.message
                : "The queue move failed. Showing the room queue.",
            ),
        );
      // Older callback adapters without an acknowledgement cannot claim success.
      else settle("Queue confirmation is unavailable. Showing the room queue.");
    } catch (error) {
      settle(error instanceof Error ? error.message : "The queue move failed.");
    }
  }
  return { items: projected, move, notice, pendingCount: pending.length };
}
