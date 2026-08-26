"use client";

import { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

export function VisualizerStatusInfo({
  fallbackActive,
  message,
  rendererLabel,
  statusLabel,
}: {
  fallbackActive: boolean;
  message: string;
  rendererLabel: string;
  statusLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const popoverId = "listen-visualizer-status-info";

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setPinned(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function closeTransientInfo() {
    if (!pinned) {
      setOpen(false);
    }
  }

  return (
    <div
      className="absolute right-4 top-4 z-20 sm:right-5 sm:top-5"
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget)) {
          closeTransientInfo();
        }
      }}
      onFocus={() => setOpen(true)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={closeTransientInfo}
      ref={rootRef}
    >
      <button
        aria-controls={popoverId}
        aria-expanded={open}
        aria-label={`About ${rendererLabel}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-background/72 text-on-surface-variant shadow-[0_10px_30px_rgb(0_0_0/0.28)] backdrop-blur-md transition hover:border-[rgb(var(--listen-primary)/0.45)] hover:text-[rgb(var(--listen-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--listen-primary))]"
        onClick={() => {
          const nextPinned = !pinned;
          setPinned(nextPinned);
          setOpen(nextPinned);
        }}
        type="button"
      >
        <Info className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-11 w-[min(20rem,calc(100vw-3rem))] rounded-md border border-white/12 bg-background/92 p-3 text-left shadow-[0_18px_48px_rgb(0_0_0/0.42)] backdrop-blur-xl"
          id={popoverId}
          role="tooltip"
        >
          <p className="text-label-sm font-semibold text-[rgb(var(--listen-primary))]">
            {rendererLabel}
          </p>
          <p className="mt-1 font-mono text-[11px] uppercase text-on-surface-variant">
            {statusLabel}
          </p>
          <p className="mt-2 text-label-sm leading-5 text-on-surface-variant">
            {message}
          </p>
        </div>
      ) : null}
      {fallbackActive ? (
        <span className="sr-only" role="status">
          {message}
        </span>
      ) : null}
    </div>
  );
}
