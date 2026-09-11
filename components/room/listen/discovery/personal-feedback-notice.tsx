"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { DiscoverFeedback } from "@/lib/recommendations/discover-contracts";

export function PersonalFeedbackNotice({
  feedback,
  busy,
  onUndo,
  onDismiss,
}: {
  feedback: DiscoverFeedback;
  busy: boolean;
  onUndo(): void;
  onDismiss(): void;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(
    () =>
      typeof document !== "undefined" && document.visibilityState !== "visible",
  );
  const remaining = useRef(10_000);
  useEffect(() => {
    const update = () => setHidden(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  const paused = hovered || focused || hidden || busy;
  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(onDismiss, remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - started),
      );
    };
  }, [paused, onDismiss]);
  return (
    <div
      className="personal-feedback-notice"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <span role="status">
        {feedback.state === "not_now"
          ? "Hidden from suggestions for 7 days."
          : feedback.state === "wrong_version"
            ? "This video version is hidden from suggestions."
            : "This track is hidden from suggestions."}
      </span>
      <button disabled={busy} onClick={onUndo} type="button">
        Undo
      </button>
      <button
        disabled={busy}
        onClick={onDismiss}
        type="button"
        aria-label="Dismiss confirmation"
        title="Dismiss confirmation"
      >
        <X size={16} aria-hidden />
      </button>
    </div>
  );
}
