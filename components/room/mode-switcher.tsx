"use client";

import { Headphones, Video } from "lucide-react";
import { useState } from "react";

import { RoomTransitionOverlay } from "@/components/ui";
import type { RoomSnapshot } from "@/lib/rooms";
import { cx } from "@/lib/ui";

type ModeSwitcherProps = {
  canSwitch?: boolean;
  mode: RoomSnapshot["mode"];
  onSwitchMode?(mode: "listen" | "watch"): Promise<void>;
};

const modes = [
  { icon: Video, id: "watch", label: "Watch" },
  { icon: Headphones, id: "listen", label: "Listen" },
] as const;

export function ModeSwitcher({
  canSwitch = false,
  mode,
  onSwitchMode,
}: ModeSwitcherProps) {
  const [pendingMode, setPendingMode] = useState<"listen" | "watch" | null>(
    null,
  );

  async function handleSwitch(nextMode: "listen" | "watch") {
    if (!canSwitch || !onSwitchMode || nextMode === mode || pendingMode) {
      return;
    }

    setPendingMode(nextMode);

    try {
      await onSwitchMode(nextMode);
    } finally {
      window.setTimeout(() => setPendingMode(null), 300);
    }
  }

  return (
    <>
      <RoomTransitionOverlay
        active={Boolean(pendingMode)}
        detail="Updating the room stage for everyone."
        label={
          pendingMode === "listen"
            ? "Switching to listen mode"
            : "Switching to watch mode"
        }
        tone={pendingMode === "listen" ? "amber" : "cyan"}
      />
      <div
        aria-label="Room mode"
        className="grid grid-cols-2 gap-1 border-t border-white/10 bg-surface-container-lowest p-1"
        role="tablist"
      >
        {modes.map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;

          return (
            <button
              aria-disabled={!canSwitch || Boolean(pendingMode)}
              aria-selected={active}
              className={cx(
                "inline-flex h-9 items-center justify-center gap-2 rounded-sm px-3 text-label-sm font-semibold text-on-surface-variant transition hover:text-on-surface",
                active &&
                  (mode === "listen"
                    ? "bg-secondary-fixed-dim/12 text-secondary-fixed-dim"
                    : "bg-primary-fixed-dim/12 text-primary-fixed-dim"),
                (!canSwitch || pendingMode) &&
                  "cursor-not-allowed opacity-70 hover:text-on-surface-variant",
              )}
              disabled={!canSwitch || Boolean(pendingMode)}
              key={item.id}
              onClick={() => handleSwitch(item.id)}
              role="tab"
              type="button"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </button>
          );
        })}
      </div>
    </>
  );
}
