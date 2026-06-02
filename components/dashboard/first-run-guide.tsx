"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, X } from "lucide-react";

import { Button, Panel } from "@/components/ui";

const STORAGE_KEY = "mw_dashboard_first_run_dismissed";
const STORAGE_EVENT = "mw:first-run-guide";

export function FirstRunGuide() {
  const visible = useSyncExternalStore(
    subscribeToFirstRunStorage,
    readFirstRunVisible,
    () => false,
  );

  if (!visible) {
    return null;
  }

  return (
    <div
      aria-labelledby="first-run-heading"
      aria-modal="true"
      className="fixed inset-0 z-[80] grid place-items-center bg-background/78 px-margin-mobile py-8 backdrop-blur-md"
      role="dialog"
    >
      <Panel
        className="relative max-h-[min(90vh,42rem)] w-full max-w-3xl overflow-y-auto border-primary-fixed-dim/25 bg-surface-container-low shadow-screen-glow"
        tone="low"
      >
        <button
          aria-label="Dismiss first-run guide"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
          onClick={dismissFirstRunGuide}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="max-w-2xl pr-10">
          <p className="technical-label text-primary-fixed-dim">First Run</p>
          <h2
            className="mt-2 text-headline-md font-semibold text-on-surface"
            id="first-run-heading"
          >
            How Mistake Watch works
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            This is a private room dashboard for friends and family. Start a
            room, share the code, load media, and save rooms you want to reuse.
          </p>
          <div className="mt-5 grid gap-3 text-body-md text-on-surface-variant md:grid-cols-2">
            {[
              "Create a private watch or listen room.",
              "Share the invite link or room code.",
              "Load YouTube, direct video, audio, or HLS sources.",
              "Save rooms you want to reuse later.",
            ].map((item) => (
              <span
                className="inline-flex min-w-0 items-start gap-2 rounded-md border border-white/10 bg-surface-container p-3"
                key={item}
              >
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary-fixed-dim"
                  aria-hidden
                />
                <span>{item}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <Button onClick={dismissFirstRunGuide} size="sm" variant="secondary">
            Got it
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function subscribeToFirstRunStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function readFirstRunVisible() {
  return window.localStorage.getItem(STORAGE_KEY) !== "true";
}

function dismissFirstRunGuide() {
  window.localStorage.setItem(STORAGE_KEY, "true");
  window.dispatchEvent(new Event(STORAGE_EVENT));
}
