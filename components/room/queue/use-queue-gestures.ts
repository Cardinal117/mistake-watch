"use client";
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent,
} from "react";

import { QueueDragContext } from "./virtual-queue-list";

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
  const virtual = useContext(QueueDragContext);
  const virtualRef = useRef(virtual);
  useLayoutEffect(() => {
    virtualRef.current = virtual;
  }, [virtual]);
  const row = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    kind: "drag" | "swipe" | "surface" | "scroll";
    touch: boolean;
    scrollY: number;
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
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function clearHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  }
  function scroller() {
    let el = row.current?.parentElement ?? null;
    while (
      el &&
      !(
        el.scrollHeight > el.clientHeight &&
        /auto|scroll/.test(getComputedStyle(el).overflowY)
      )
    )
      el = el.parentElement;
    return el;
  }
  const suppressClick = useRef(false);
  const [revealed, setRevealed] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  function clear() {
    clearHold();
    virtualRef.current?.finish();
    cancelAnimationFrame(frame.current);
    row.current?.parentElement
      ?.querySelectorAll("[data-drop-target]")
      .forEach((el) => el.removeAttribute("data-drop-target"));
    if (row.current) row.current.style.translate = "";
    gesture.current = null;
    setDragging(false);
    setOffset(0);
  }
  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      cancelAnimationFrame(frame.current);
    },
    [],
  );
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
    g.target = virtualRef.current
      ? virtualRef.current.target(g.lastY)
      : Number(nearest.dataset.queueIndex);
    if (!virtualRef.current && g.highlighted !== nearest) {
      g.highlighted?.removeAttribute("data-drop-target");
      nearest.setAttribute("data-drop-target", "true");
      g.highlighted = nearest;
    }
    frame.current = requestAnimationFrame(updateDrag);
  }
  function activateDrag() {
    const g = gesture.current;
    if (!g) return;
    clearHold();
    g.kind = "drag";
    virtualRef.current?.begin(row.current?.dataset.queueId ?? "");
    setDragging(true);
    setRevealed(false);
    frame.current = requestAnimationFrame(updateDrag);
  }
  function start(
    event: PointerEvent<HTMLElement>,
    kind: "drag" | "swipe" | "surface",
  ) {
    if (disabled || event.button !== 0 || (kind === "drag" && index < 0))
      return;
    if (
      kind === "swipe" &&
      (event.target as HTMLElement).closest(
        "[data-queue-menu] button, [data-queue-handle]",
      )
    )
      return;
    clearHold();
    suppressClick.current = false;
    gesture.current = {
      kind,
      touch: event.pointerType === "touch",
      scrollY: event.clientY,
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
    if (kind === "drag" || kind === "surface") {
      event.currentTarget.setPointerCapture(event.pointerId);
      if (kind === "drag") activateDrag();
      else if (event.pointerType === "touch")
        holdTimer.current = setTimeout(() => {
          if (gesture.current?.kind === "surface") {
            suppressClick.current = true;
            activateDrag();
          }
        }, 280);
    }
  }

  const cancelDisabled = useEffectEvent(clear);
  useEffect(() => {
    if (disabled) {
      const frame = requestAnimationFrame(() => cancelDisabled());
      return () => cancelAnimationFrame(frame);
    }
  }, [disabled]);
  function move(event: PointerEvent<HTMLElement>) {
    const g = gesture.current;
    if (!g) return;
    g.lastY = event.clientY;
    g.dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    if (g.kind === "surface" && Math.max(Math.abs(g.dx), Math.abs(dy)) > 8) {
      clearHold();
      if (Math.abs(g.dx) > Math.abs(dy)) g.kind = "swipe";
      else if (g.touch) g.kind = "scroll";
      else {
        suppressClick.current = true;
        activateDrag();
      }
    }
    if (g.kind === "scroll") {
      const el = scroller();
      if (el) el.scrollTop -= event.clientY - g.scrollY;
      g.scrollY = event.clientY;
      suppressClick.current = true;
      return;
    }
    if (g.kind === "swipe") {
      if (
        Math.abs(event.clientY - g.y) > Math.abs(g.dx) &&
        !suppressClick.current
      ) {
        if (g.touch) {
          g.kind = "scroll";
          const el = scroller();
          if (el) el.scrollTop -= event.clientY - g.scrollY;
          g.scrollY = event.clientY;
          suppressClick.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
        } else gesture.current = null;
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
