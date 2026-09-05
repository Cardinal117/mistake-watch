"use client";
import { useLayoutEffect, useRef } from "react";
/** Animate only measured queue movement after canonical order changes. */
export function useQueueMotion(order: string, enabled: boolean) {
  const listRef = useRef<HTMLOListElement>(null);
  const positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !enabled) return;
    const next = new Map<string, number>();
    for (const row of list.querySelectorAll<HTMLElement>("[data-queue-id]")) {
      const id = row.dataset.queueId!,
        top = row.offsetTop;
      next.set(id, top);
      const before = positions.current.get(id);
      if (
        before !== undefined &&
        before !== top &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        row.animate(
          [
            { transform: `translateY(${before - top}px)` },
            { transform: "translateY(0)" },
          ],
          { duration: 180, easing: "ease-out" },
        );
      }
    }
    positions.current = next;
  }, [order, enabled]);
  return listRef;
}
