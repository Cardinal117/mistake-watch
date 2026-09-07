"use client";
import { useEffect, useRef, type RefObject, type PointerEvent } from "react";

export function useListenExpansion(
  onSettle: (expanded: boolean) => void,
  expanded: boolean,
  playerRef: RefObject<HTMLElement | null>,
) {
  const frame = useRef(0);
  const drag = useRef<{
    id: number;
    y: number;
    time: number;
    expanded: boolean;
    distance: number;
    travel: number;
  } | null>(null);
  const moved = useRef(false);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  function paint() {
    frame.current = 0;
    const active = drag.current;
    const player = playerRef.current;
    if (!active || !player || !moved.current) return;
    player.dataset.dragging = "true";
    player.style.setProperty(
      "--listen-expand",
      String(
        Math.min(
          1,
          Math.max(
            0,
            Number(active.expanded) + active.distance / active.travel,
          ),
        ),
      ),
    );
  }
  function start(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || !event.isPrimary || drag.current) return;
    const player = playerRef.current;
    if (!player) return;
    const style = getComputedStyle(player);
    const full =
      (player.parentElement?.clientHeight ?? window.innerHeight) -
      parseFloat(style.bottom);
    const shortYouTube =
      player.parentElement?.dataset.youtube === "true" &&
      window.matchMedia("(max-height: 500px) and (orientation: landscape)")
        .matches;
    const compact = shortYouTube
      ? full - 56
      : parseFloat(style.getPropertyValue("--listen-bar-height")) || 72;
    drag.current = {
      id: event.pointerId,
      y: event.clientY,
      time: performance.now(),
      expanded,
      distance: 0,
      travel: Math.max(1, full - compact),
    };
    moved.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    active.distance = active.y - event.clientY;
    moved.current ||= Math.abs(active.distance) > 6;
    if (moved.current && !frame.current)
      frame.current = requestAnimationFrame(paint);
  }
  function end(event: PointerEvent<HTMLElement>, cancelled = false) {
    const active = drag.current;
    if (!active || active.id !== event.pointerId) return;
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    const delta = active.distance * (active.expanded ? -1 : 1);
    const velocity = delta / Math.max(1, performance.now() - active.time);
    const change =
      !cancelled && (delta >= 64 || (delta >= 24 && velocity > 0.5));
    const next = change ? !active.expanded : active.expanded;
    const player = playerRef.current;
    if (player) {
      // Commit the final finger position before re-enabling the settle transition.
      paint();
      void player.offsetHeight;
      player.dataset.dragging = "false";
      player.style.setProperty("--listen-expand", String(Number(next)));
    }
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    onSettle(next);
  }
  return {
    handle: {
      onPointerDown: start,
      onPointerMove: move,
      onPointerUp: (event: PointerEvent<HTMLElement>) => end(event),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => end(event, true),
      onClick: (event: { detail: number }) => {
        if (event.detail === 0 || !moved.current) onSettle(!expanded);
        moved.current = false;
      },
    },
  };
}
