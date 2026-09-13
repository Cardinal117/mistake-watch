"use client";
import { useEffect, useState, type CSSProperties } from "react";
import { SignalApertureMark } from "@/components/brand";
import { completeRoomTransition } from "@/lib/performance/room-transition";
import type { CompletedTransition } from "@/lib/room-transition/store";
/** Cosmetic only: readiness has already released focus and inert content. */
export function RoomLoadingReveal({
  active,
  completed,
}: {
  active: boolean;
  completed: CompletedTransition | null;
}) {
  const [expiredId, setExpiredId] = useState<number | null>(null);
  useEffect(() => {
    if (!completed) return;
    completeRoomTransition(completed.state.label);
    const timer = window.setTimeout(
      () => setExpiredId(completed.state.id),
      150,
    );
    return () => window.clearTimeout(timer);
  }, [completed]);
  if (
    !completed ||
    active ||
    expiredId === completed.state.id ||
    completed.state.error ||
    completed.finishedAt - completed.state.startedAt < 150
  )
    return null;
  const revealing = completed.state;
  const p = revealing.palette;
  return (
    <div
      aria-hidden
      className="room-loading-screen room-loading-reveal"
      style={
        p
          ? ({
              "--brand-primary": p.primary,
              "--brand-secondary": p.secondary,
              "--brand-background": p.background,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="room-loading-content">
        <div className="room-loading-mark" data-visible="true">
          <SignalApertureMark
            mode={revealing.target ?? "watch"}
            className="room-loading-aperture"
          />
        </div>
        <h1>{revealing.label}</h1>
        <p>{revealing.detail ?? "Preparing your room."}</p>
      </div>
    </div>
  );
}
