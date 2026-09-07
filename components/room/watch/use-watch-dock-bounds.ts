"use client";
import { useLayoutEffect, useRef } from "react";

// Measure chrome instead of assuming a fixed header height (text zoom, Home mode
// toggle, rotation and the software keyboard can all change the usable area).
export function useWatchDockBounds() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const shell = ref.current;
    if (!shell) return;
    const bar = shell.querySelector(".watch-viewbar");
    const nav = shell.querySelector(".watch-mobile-nav");
    const update = () => {
      const root = shell.getBoundingClientRect();
      const top = (bar?.getBoundingClientRect().bottom ?? root.top) + 12;
      const navRect = nav?.getBoundingClientRect();
      const bottom = (navRect?.height ? navRect.top : root.bottom) - 12;
      shell.style.setProperty("--watch-dock-top", `${top}px`);
      shell.style.setProperty(
        "--watch-dock-bottom",
        `${window.innerHeight - bottom}px`,
      );
      shell.style.setProperty(
        "--watch-dock-height",
        `${Math.max(0, bottom - top)}px`,
      );
    };
    const observer = new ResizeObserver(update);
    [shell, bar, nav].forEach((el) => {
      if (el) observer.observe(el);
    });
    update();
    return () => observer.disconnect();
  }, []);
  return ref;
}
