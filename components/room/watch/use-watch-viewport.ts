"use client";
import { useEffect, useState, type CSSProperties } from "react";

export function useWatchViewport() {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    let frame = 0;
    const viewport = window.visualViewport;
    const compact = window.matchMedia(
      "(max-width: 767px), (max-width: 950px) and (max-height: 600px)",
    );
    document.documentElement.classList.add("watch-room-active");
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setHeight(
          compact.matches ? (viewport?.height ?? window.innerHeight) : null,
        ),
      );
    }
    update();
    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.documentElement.classList.remove("watch-room-active");
    };
  }, []);
  return {
    style: (height ? { height: height + "px" } : {}) as CSSProperties,
    short: height !== null && height <= 600,
  };
}
