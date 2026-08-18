"use client";

import { useEffect, useState } from "react";
import type { ListenVisualizationMode } from "@/lib/player/listen-visualization";
import { cx } from "@/lib/ui";

type ListenVisualizationProps = {
  active: boolean;
  className?: string;
  mode: ListenVisualizationMode;
};

// Adapted from Jhey Tompkins' public MIT-licensed CodePen pattern:
// https://codepen.io/jh3y/pen/poEvKxo
export function ListenVisualization({
  active,
  className,
  mode,
}: ListenVisualizationProps) {
  const motionAllowed = useVisualizationMotion(active);

  return (
    <div
      aria-hidden
      className={cx(
        "listen-visualization pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      data-listen-visualization={mode}
      data-motion={motionAllowed ? "running" : "paused"}
    >
      {mode === "dynamic-horizon" ? (
        <>
          <div className="listen-horizon-layer listen-horizon-layer--back" />
          <div className="listen-horizon-layer listen-horizon-layer--middle" />
          <div className="listen-horizon-layer listen-horizon-layer--front" />
        </>
      ) : null}
      {mode === "signal-ribbon" ? (
        <div className="listen-signal-ribbon" />
      ) : null}
      {mode === "minimal-pulse" ? (
        <div className="listen-minimal-pulse" />
      ) : null}
    </div>
  );
}

function useVisualizationMotion(active: boolean) {
  const [documentVisible, setDocumentVisible] = useState(() =>
    typeof document === "undefined" ? true : !document.hidden,
  );
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    function handleMotionChange() {
      setReducedMotion(query.matches);
    }

    function handleVisibilityChange() {
      setDocumentVisible(!document.hidden);
    }

    handleMotionChange();
    handleVisibilityChange();
    query.addEventListener("change", handleMotionChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      query.removeEventListener("change", handleMotionChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return active && documentVisible && !reducedMotion;
}
