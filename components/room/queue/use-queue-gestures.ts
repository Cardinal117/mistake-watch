"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";

/** Pointer-local feedback; only the final drop/remove issues a room command. */
export function useQueueGestures({
  disabled,
  index,
  onMove,
  onRemove,
}: {
  disabled: boolean;
  index: number;
  onMove(position: number): void;
  onRemove(): void;
}) {
  const row = useRef<HTMLLIElement>(null);
  const gesture = useRef<{
    kind: "drag" | "swipe";
    x: number;
    y: number;
    lastY: number;
    dx: number;
    open: boolean;
    target: number;
    targets: Array<{ element: HTMLElement; center: number }>;
    highlighted: HTMLElement | null;
  } | null>(null);
  const frame = useRef(0);
  const suppressClick = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  function clear() {
    cancelAnimationFrame(frame.current);
    row.current?.parentElement
      ?.querySelectorAll("[data-drop-target]")
      .forEach((el) => el.removeAttribute("data-drop-target"));
    if (row.current) row.current.style.translate = "";
    gesture.current = null;
    setDragging(false);
    setOffset(0);
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  function updateDrag() {
    const g = gesture.current,
      el = row.current;
    if (!g || g.kind !== "drag" || !el) return;
    let scroller = el.parentElement;
    while (
      scroller &&
      !(
        scroller.scrollHeight > scroller.clientHeight &&
        /auto|scroll/.test(getComputedStyle(scroller).overflowY)
      )
    )
      scroller = scroller.parentElement;
    if (scroller) {
      const b = scroller.getBoundingClientRect();
      const delta =
        g.lastY < b.top + 48 ? -12 : g.lastY > b.bottom - 48 ? 12 : 0;
      const before = scroller.scrollTop;
      scroller.scrollTop += delta;
      const moved = scroller.scrollTop - before;
      g.y -= moved;
      for (const target of g.targets) target.center -= moved;
    }
    el.style.translate = `0 ${g.lastY - g.y}px`;
    let nearest: HTMLElement = el,
      distance = Infinity;
    for (const target of g.targets) {
      if (!target.element.isConnected) continue;
      const difference = Math.abs(g.lastY - target.center);
      if (difference < distance) {
        distance = difference;
        nearest = target.element;
      }
    }
    g.target = Number(nearest.dataset.queueIndex);
    if (g.highlighted !== nearest) {
      g.highlighted?.removeAttribute("data-drop-target");
      nearest.setAttribute("data-drop-target", "true");
      g.highlighted = nearest;
    }
    frame.current = requestAnimationFrame(updateDrag);
  }
  function start(event: PointerEvent<HTMLElement>, kind: "drag" | "swipe") {
    if (disabled || event.button !== 0 || (kind === "drag" && index < 0))
      return;
    if (
      kind === "swipe" &&
      (event.target as HTMLElement).closest(
        "summary, [data-queue-menu], [data-queue-handle]",
      )
    )
      return;
    suppressClick.current = false;
    gesture.current = {
      kind,
      x: event.clientX,
      y: event.clientY,
      lastY: event.clientY,
      dx: 0,
      open: revealed,
      target: index,
      targets: Array.from(
        row.current?.parentElement?.querySelectorAll<HTMLElement>(
          "[data-queue-index]",
        ) ?? [],
      )
        .filter((target) => Number(target.dataset.queueIndex) >= 0)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { element, center: rect.top + rect.height / 2 };
        }),
      highlighted: null,
    };
    if (kind === "drag") {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDragging(true);
      setRevealed(false);
      frame.current = requestAnimationFrame(updateDrag);
    }
  }
  function move(event: PointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g) return;
    g.lastY = event.clientY;
    g.dx = event.clientX - g.x;
    if (g.kind === "swipe") {
      if (
        Math.abs(event.clientY - g.y) > Math.abs(g.dx) &&
        !suppressClick.current
      ) {
        gesture.current = null;
        return;
      }
      if (Math.abs(g.dx) > 12) {
        suppressClick.current = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        setOffset(Math.max(-144, Math.min(72, g.dx)));
      }
    } else if (Math.abs(event.clientY - g.y) > 5) suppressClick.current = true;
  }
  function end(event: PointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (g && !disabled) {
      if (g.kind === "drag" && g.target >= 0 && g.target !== index)
        onMove(g.target);
      if (g.kind === "swipe" && g.dx < -64) {
        if (g.open) {
          onRemove();
          setRevealed(false);
        } else setRevealed(true);
      } else if (g.kind === "swipe" && g.dx > 32) setRevealed(false);
    }
    clear();
  }
  return {
    row,
    revealed: revealed && !disabled,
    reveal: () => setRevealed(true),
    close: () => setRevealed(false),
    offset,
    dragging,
    start,
    move,
    end,
    cancel: clear,
    captureClick(event: { preventDefault(): void; stopPropagation(): void }) {
      if (suppressClick.current) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }
    },
  };
}
