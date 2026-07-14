"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Shuffle, Sparkles, X } from "lucide-react";

import { Badge, Button } from "@/components/ui";
import type { QueueMode } from "@/lib/queue/model";
import { cx } from "@/lib/ui";

const queueModeOptions: Array<{ label: string; mode: QueueMode }> = [
  { label: "Normal", mode: "normal" },
  { label: "Shuffle", mode: "shuffle" },
  { label: "Smart Shuffle", mode: "smartShuffle" },
  { label: "Loop Queue", mode: "loop" },
  { label: "Autoplay Related", mode: "autoplayRelated" },
];

export function QueueControls({
  canManageQueue,
  hub,
  manageDisabled,
  mode,
  onClearQueue,
  onQueueModeChange,
  onShuffle,
  queuedItemsLength,
  queueMode,
}: {
  canManageQueue: boolean;
  hub: boolean;
  manageDisabled: boolean;
  mode: "listen" | "watch";
  onClearQueue?(): void;
  onQueueModeChange(mode: QueueMode): void;
  onShuffle(strategy: "shuffle" | "smart"): void;
  queuedItemsLength: number;
  queueMode: QueueMode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className={cx(
        "overflow-hidden rounded-md border border-white/10 bg-surface-container-low/80 transition-[max-height,background-color,border-color] duration-200",
        open ? (hub ? "max-h-56" : "max-h-72") : "max-h-9",
      )}
    >
      {open ? (
        <div className={cx("grid gap-3 p-3 pb-2", hub && "gap-2 p-2")}>
          <div className="flex items-center justify-between gap-2">
            <span className="technical-label text-on-surface-variant">
              Queue controls
            </span>
            {queueMode === "loop" ? (
              <Badge tone={mode === "listen" ? "amber" : "cyan"}>
                Loop Queue
              </Badge>
            ) : queueMode === "autoplayRelated" ? (
              <Badge tone="amber">Related</Badge>
            ) : null}
          </div>
          <div className={cx("grid gap-2", hub && "gap-1.5")}>
            <select
              className={cx(
                "rounded-md border border-white/10 bg-surface-container px-3 text-on-surface outline-none focus:border-primary-fixed-dim disabled:opacity-45",
                hub ? "h-9 text-label-sm" : "h-10 text-body-md",
              )}
              disabled={manageDisabled}
              onChange={(event) =>
                onQueueModeChange(event.target.value as QueueMode)
              }
              title={
                !canManageQueue ? "Host queue management required." : undefined
              }
              value={queueMode}
            >
              {queueModeOptions.map((option) => (
                <option key={option.mode} value={option.mode}>
                  {option.label}
                </option>
              ))}
            </select>
            {queueMode === "autoplayRelated" ? (
              <p className="text-label-sm text-on-surface-variant">
                Autoplay will add related tracks when provider recommendations
                are wired. No fake related items are generated.
              </p>
            ) : queueMode === "smartShuffle" ? (
              <p className="text-label-sm text-on-surface-variant">
                Smart Shuffle keeps current and history stable while varying
                upcoming artists, channels, and playlist sources.
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              disabled={manageDisabled || queuedItemsLength < 2}
              onClick={() => onShuffle("shuffle")}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Shuffle className="h-4 w-4" aria-hidden />
              Shuffle
            </Button>
            <Button
              disabled={manageDisabled || queuedItemsLength < 2}
              onClick={() => onShuffle("smart")}
              size="sm"
              type="button"
              variant="ghost"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Smart
            </Button>
            <Button
              disabled={manageDisabled || queuedItemsLength === 0}
              onClick={onClearQueue}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X className="h-4 w-4" aria-hidden />
              Clear
            </Button>
          </div>
        </div>
      ) : null}
      <button
        aria-expanded={open}
        aria-label={open ? "Hide queue controls" : "Show queue controls"}
        className={cx(
          "mx-auto flex h-9 w-full items-center justify-center border-t border-white/10 text-on-surface-variant transition hover:bg-surface-variant/25 hover:text-on-surface",
          !open && "border-t-0",
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="inline-flex h-6 w-12 items-center justify-center rounded-sm border border-white/10 bg-surface-container text-primary-fixed-dim">
          {open ? (
            <ChevronUp className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden />
          )}
        </span>
      </button>
    </div>
  );
}
