"use client";
import {
  useLayoutEffect,
  useCallback,
  useRef,
  useState,
  type RefObject,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
type Point = { x: number; y: number };

// Local geometry only: moving the mounted provider must never publish room state.
export function useWatchDock(shellRef: RefObject<HTMLDivElement | null>) {
  const [dragging, setDragging] = useState(false);
  const position = useRef<Point | null>(null);
  const origin = useRef<{
    pointer: number;
    x: number;
    y: number;
    rect: DOMRect;
    previous: Point | null;
  } | null>(null);
  const getPlayer = useCallback(
    () => shellRef.current?.querySelector<HTMLElement>(".watch-player"),
    [shellRef],
  );
  const place = useCallback(
    (point: Point) => {
      const shell = shellRef.current,
        el = getPlayer();
      if (
        !shell ||
        !el ||
        shell.dataset.docked !== "true" ||
        document.fullscreenElement
      )
        return;
      const rect = el.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = (viewport?.offsetLeft ?? 0) + 12;
      const top = Math.max(
        (viewport?.offsetTop ?? 0) + 12,
        parseFloat(
          getComputedStyle(shell).getPropertyValue("--watch-dock-top"),
        ) || 12,
      );
      const nav = shell
        .querySelector(".watch-mobile-nav")
        ?.getBoundingClientRect();
      const right =
        (viewport?.offsetLeft ?? 0) +
        (viewport?.width ?? window.innerWidth) -
        12;
      const bottom =
        Math.min(
          (viewport?.offsetTop ?? 0) + (viewport?.height ?? window.innerHeight),
          nav?.height ? nav.top : window.innerHeight,
        ) - 12;
      const next = {
        x: Math.max(left, Math.min(point.x, right - rect.width)),
        y: Math.max(top, Math.min(point.y, bottom - rect.height)),
      };
      position.current = next;
      el.dataset.freeDock = "true";
      el.style.setProperty("--watch-free-left", `${next.x}px`);
      el.style.setProperty("--watch-free-top", `${next.y}px`);
    },
    [getPlayer, shellRef],
  );
  useLayoutEffect(() => {
    const shell = shellRef.current,
      el = getPlayer();
    if (!shell || !el) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (position.current) place(position.current);
      });
    };
    const resize = new ResizeObserver(update);
    resize.observe(shell);
    resize.observe(el);
    const mutation = new MutationObserver(update);
    mutation.observe(shell, {
      attributes: true,
      attributeFilter: ["data-docked", "data-minimized"],
    });
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    document.addEventListener("fullscreenchange", update);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutation.disconnect();
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      document.removeEventListener("fullscreenchange", update);
    };
  }, [shellRef, getPlayer, place]);
  function startDrag(event: PointerEvent<HTMLElement>) {
    const el = getPlayer();
    if (event.button !== 0 || !el) return;
    el.getAnimations().forEach((animation) => animation.cancel());
    origin.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rect: el.getBoundingClientRect(),
      previous: position.current,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function moveDrag(event: PointerEvent<HTMLElement>) {
    const start = origin.current;
    if (!start || start.pointer !== event.pointerId) return;
    place({
      x: start.rect.x + event.clientX - start.x,
      y: start.rect.y + event.clientY - start.y,
    });
  }
  function endDrag(event: PointerEvent<HTMLElement>) {
    if (!origin.current || origin.current.pointer !== event.pointerId) return;
    moveDrag(event);
    origin.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  }
  function cancelDrag() {
    const start = origin.current;
    if (!start) return;
    position.current = start.previous;
    if (start.previous) place(start.previous);
    else {
      const el = getPlayer();
      if (el) delete el.dataset.freeDock;
    }
    origin.current = null;
    setDragging(false);
  }
  function keyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      cancelDrag();
      return;
    }
    const directions: Record<string, Point> = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };
    const direction = directions[event.key],
      el = getPlayer();
    if (!direction || !el) return;
    event.preventDefault();
    const rect = el.getBoundingClientRect(),
      step = event.shiftKey ? 4 : 20;
    place({ x: rect.x + direction.x * step, y: rect.y + direction.y * step });
  }
  return {
    anchor: "right",
    dragging,
    startDrag,
    moveDrag,
    endDrag,
    cancelDrag,
    keyDown,
  };
}
