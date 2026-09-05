"use client";
import {
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import type { DockAnchor } from "./watch-navigation";
const corners: DockAnchor[] = ["right", "left", "top-left", "top-right"];
function animateMove(el: HTMLElement, from: DOMRect) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const to = el.getBoundingClientRect();
  el.animate(
    [
      { transform: `translate(${from.x - to.x}px,${from.y - to.y}px)` },
      { transform: "translate(0,0)" },
    ],
    { duration: 180, easing: "ease-out" },
  );
}
export function useWatchDock() {
  const [anchor, setAnchor] = useState<DockAnchor>("right");
  const [dragging, setDragging] = useState(false);
  const player = useRef<HTMLElement | null>(null);
  const previous = useRef<DOMRect | null>(null);
  const origin = useRef<{
    x: number;
    y: number;
    rect: DOMRect;
    top: number;
    bottom: number;
  } | null>(null);
  function place(next: DockAnchor) {
    previous.current = player.current?.getBoundingClientRect() ?? null;
    if (player.current) player.current.style.translate = "";
    if (next === anchor && player.current && previous.current) {
      animateMove(player.current, previous.current);
      previous.current = null;
    }
    setAnchor(next);
  }
  useLayoutEffect(() => {
    const el = player.current,
      from = previous.current;
    previous.current = null;
    if (el && from) animateMove(el, from);
  }, [anchor]);
  function startDrag(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    player.current = event.currentTarget.closest(".watch-player");
    if (!player.current) return;
    const shell = player.current.closest(".watch-redesign");
    origin.current = {
      x: event.clientX,
      y: event.clientY,
      rect: player.current.getBoundingClientRect(),
      top:
        (shell?.querySelector(".watch-viewbar")?.getBoundingClientRect()
          .bottom ?? 0) + 12,
      bottom:
        (shell?.querySelector(".watch-mobile-nav")?.getBoundingClientRect()
          .top ?? window.innerHeight) - 12,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function moveDrag(event: PointerEvent<HTMLElement>) {
    if (!origin.current || !player.current) return;
    const { rect, top, bottom } = origin.current;
    const x = Math.max(
      12 - rect.left,
      Math.min(
        window.innerWidth - 12 - rect.right,
        event.clientX - origin.current.x,
      ),
    );
    const y = Math.max(
      top - rect.top,
      Math.min(bottom - rect.bottom, event.clientY - origin.current.y),
    );
    player.current.style.translate = `${x}px ${y}px`;
  }
  function cancelDrag() {
    if (player.current) player.current.style.translate = "";
    origin.current = null;
    setDragging(false);
  }
  function endDrag(event: PointerEvent<HTMLElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const left = event.clientX < window.innerWidth / 2,
      top = event.clientY < window.innerHeight / 2;
    place(top ? (left ? "top-left" : "top-right") : left ? "left" : "right");
    origin.current = null;
    setDragging(false);
  }
  function cycle(event: { currentTarget: HTMLElement }) {
    player.current = event.currentTarget.closest(".watch-player");
    place(corners[(corners.indexOf(anchor) + 1) % 4]);
  }
  function keyDown(event: KeyboardEvent<HTMLElement>) {
    const left = anchor.endsWith("left"),
      top = anchor.startsWith("top");
    const next: DockAnchor | undefined =
      event.key === "ArrowUp"
        ? left
          ? "top-left"
          : "top-right"
        : event.key === "ArrowDown"
          ? left
            ? "left"
            : "right"
          : event.key === "ArrowLeft"
            ? top
              ? "top-left"
              : "left"
            : event.key === "ArrowRight"
              ? top
                ? "top-right"
                : "right"
              : undefined;
    if (next) {
      event.preventDefault();
      player.current = event.currentTarget.closest(".watch-player");
      place(next);
    }
  }
  const nextLabel = [
    "Move player left",
    "Move player top left",
    "Move player top right",
    "Move player bottom right",
  ][corners.indexOf(anchor)];
  return {
    anchor,
    dragging,
    startDrag,
    moveDrag,
    endDrag,
    cancelDrag,
    cycle,
    keyDown,
    nextLabel,
  };
}
