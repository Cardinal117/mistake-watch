"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { PLAYER_FULLSCREEN_EVENT } from "@/lib/player/local-controls";

export const WatchFullscreenContext = createContext({
  active: false,
  toggle: () => {},
});
export const useWatchFullscreenControls = () =>
  useContext(WatchFullscreenContext);

export function useWatchFullscreen(playing: boolean, provider?: string | null) {
  const playerRef = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [active, setActive] = useState(false);
  const [shown, setShown] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toggle = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;
    setError(null);
    try {
      if (document.fullscreenElement === player) {
        await document.exitFullscreen();
      } else {
        if (typeof player.requestFullscreen !== "function") {
          setError(
            "Fullscreen is unavailable in this browser. Open cinema for a larger player.",
          );
          return;
        }
        trigger.current = document.activeElement as HTMLElement;
        await player.requestFullscreen();
      }
    } catch {
      setError(
        "The browser could not open fullscreen. Try again, or use Open cinema.",
      );
    }
  }, []);
  const reveal = useCallback(() => {
    setShown(true);
    if (timer.current) clearTimeout(timer.current);
    if (!playing || provider === "youtube") return;
    const hide = () => {
      const controls = playerRef.current?.querySelector(".watch-transport");
      if (
        controls?.matches(":hover") ||
        controls?.querySelector(":focus-visible")
      ) {
        timer.current = setTimeout(hide, 3000);
        return;
      }
      setShown(false);
    };
    timer.current = setTimeout(hide, 3000);
  }, [playing, provider]);
  useEffect(() => {
    const frame = requestAnimationFrame(reveal);
    return () => {
      cancelAnimationFrame(frame);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [active, reveal]);
  useEffect(() => {
    function change() {
      const isActive = document.fullscreenElement === playerRef.current;
      setActive(isActive);
      if (!isActive && trigger.current) {
        const previous = trigger.current;
        trigger.current = null;
        requestAnimationFrame(() => previous.focus({ preventScroll: true }));
      }
    }
    function escape(event: KeyboardEvent) {
      if (
        event.key === "Escape" &&
        document.fullscreenElement === playerRef.current
      ) {
        event.preventDefault();
        event.stopPropagation();
        void toggle();
      }
    }
    function request() {
      void toggle();
    }
    document.addEventListener("fullscreenchange", change);
    document.addEventListener("keydown", escape);
    window.addEventListener(PLAYER_FULLSCREEN_EVENT, request);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      document.removeEventListener("keydown", escape);
      window.removeEventListener(PLAYER_FULLSCREEN_EVENT, request);
    };
  }, [toggle]);
  return {
    active,
    error,
    playerRef,
    reveal,
    shown: !playing || provider === "youtube" || shown,
    toggle,
  };
}
