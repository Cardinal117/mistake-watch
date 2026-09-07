"use client";
import { useRef, type TouchEvent } from "react";
import type { ListenStageView } from "@/lib/player/listen-visualization";

/** Observe Home swipes without capturing native scrolling or media-rail gestures. */
export function useListenWorkspaceSwipe(
  enabled: boolean,
  select: (view: ListenStageView) => void,
) {
  const start = useRef<{
    id: number;
    x: number;
    y: number;
    time: number;
  } | null>(null);
  return {
    onTouchStart(event: TouchEvent<HTMLElement>) {
      start.current = null;
      if (!enabled || event.touches.length !== 1) return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          'button,a,input,select,textarea,[role="slider"],.listen-discovery-rail,.listen-discovery-card',
        )
      )
        return;
      const point = event.touches[0];
      start.current = {
        id: point.identifier,
        x: point.clientX,
        y: point.clientY,
        time: event.timeStamp,
      };
    },
    onTouchEnd(event: TouchEvent<HTMLElement>) {
      const origin = start.current;
      start.current = null;
      if (!enabled || !origin) return;
      const point = Array.from(event.changedTouches).find(
        (point) => point.identifier === origin.id,
      );
      if (!point) return;
      const dx = point.clientX - origin.x;
      const dy = point.clientY - origin.y;
      if (
        Math.abs(dx) < 48 ||
        Math.abs(dx) < Math.abs(dy) * 1.5 ||
        event.timeStamp - origin.time > 800
      )
        return;
      select(dx < 0 ? "discover" : "visualizer");
    },
    onTouchCancel() {
      start.current = null;
    },
  };
}
