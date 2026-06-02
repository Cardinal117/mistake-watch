"use client";

import { useState } from "react";
import { BookmarkCheck, CircleAlert, X } from "lucide-react";

import { Button, Panel } from "@/components/ui";

type DashboardRoomNoticeProps = {
  notice?: "closed" | "removed";
};

export function DashboardRoomNotice({ notice }: DashboardRoomNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!notice || dismissed) {
    return null;
  }

  const removed = notice === "removed";

  return (
    <div
      aria-labelledby="room-notice-heading"
      aria-modal="true"
      className="fixed inset-0 z-[85] grid place-items-center bg-background/78 px-margin-mobile py-8 backdrop-blur-md"
      role="dialog"
    >
      <Panel
        className="relative w-full max-w-xl border-primary-fixed-dim/25 bg-surface-container-low shadow-screen-glow"
        tone="low"
      >
        <button
          aria-label="Dismiss room notice"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
          onClick={() => setDismissed(true)}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="max-w-lg pr-10">
          <p className="technical-label text-primary-fixed-dim">
            {removed ? "Room access ended" : "Room unavailable"}
          </p>
          <h2
            className="mt-2 text-headline-md font-semibold text-on-surface"
            id="room-notice-heading"
          >
            {removed
              ? "You were removed from the room."
              : "That room was closed."}
          </h2>
          <p className="mt-3 text-body-md text-on-surface-variant">
            {removed
              ? "The host removed your live room access. Playback was stopped on this device and you were returned to the dashboard."
              : "Unsaved rooms close after they have been idle for about an hour. You were returned to the dashboard instead of an empty error page."}
          </p>

          <div className="mt-5 grid gap-3 text-body-md text-on-surface-variant">
            {removed ? null : (
              <span className="inline-flex min-w-0 items-start gap-3 rounded-md border border-white/10 bg-surface-container p-3">
                <BookmarkCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary-fixed-dim"
                  aria-hidden
                />
                <span>
                  Save rooms you want to keep. Saved rooms stay available for
                  later watch nights and keep their queue.
                </span>
              </span>
            )}
            <span className="inline-flex min-w-0 items-start gap-3 rounded-md border border-white/10 bg-surface-container p-3">
              <CircleAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-secondary-fixed-dim"
                aria-hidden
              />
              <span>
                {removed
                  ? "Ask the host for a new invite if you should be let back in."
                  : "If this was a fresh invite, ask the host to create or reopen a room and share a new invite."}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-5">
          <Button onClick={() => setDismissed(true)} size="sm">
            Back to dashboard
          </Button>
        </div>
      </Panel>
    </div>
  );
}
