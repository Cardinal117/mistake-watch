"use client";

import type { RefObject } from "react";
import { EllipsisVertical, Monitor, UsersRound } from "lucide-react";

export function ListenTvModeTopBar({
  onExit,
  onOpenSettings,
  onlineCount,
  roomName,
  settingsButtonRef,
  settingsOpen,
}: {
  onExit(): void;
  onOpenSettings(): void;
  onlineCount: number;
  roomName: string;
  settingsButtonRef: RefObject<HTMLButtonElement | null>;
  settingsOpen: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 sm:gap-4">
      <div className="pointer-events-auto inline-flex min-w-0 items-center gap-3 rounded-md border border-white/10 bg-black/36 px-3 py-3 shadow-[0_0_32px_rgb(var(--listen-shadow)/0.16)] backdrop-blur-xl sm:px-4">
        <UsersRound
          className="h-5 w-5 text-[rgb(var(--listen-primary))]"
          aria-hidden
        />
        <div className="min-w-0">
          <p className="max-w-[18rem] truncate text-title-sm font-semibold text-on-surface">
            {roomName}
          </p>
          <p className="text-label-sm text-on-surface-variant">
            {onlineCount} listening
          </p>
        </div>
      </div>
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          aria-controls="listen-room-settings-dialog"
          aria-expanded={settingsOpen}
          aria-haspopup="dialog"
          aria-label="Open TV settings"
          className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-black/36 text-on-surface-variant shadow-[0_0_32px_rgb(var(--listen-shadow)/0.14)] backdrop-blur-xl transition hover:border-[rgb(var(--listen-primary)/0.52)] hover:text-[rgb(var(--listen-primary))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--listen-primary))]"
          onClick={onOpenSettings}
          ref={settingsButtonRef}
          title="TV settings"
          type="button"
        >
          <EllipsisVertical className="h-5 w-5" aria-hidden />
        </button>
        <button
          aria-label="Exit TV mode"
          className="inline-flex h-12 w-12 items-center justify-center gap-3 rounded-md border border-white/10 bg-black/36 text-label-md font-semibold text-on-surface shadow-[0_0_32px_rgb(var(--listen-shadow)/0.14)] backdrop-blur-xl transition hover:border-[rgb(var(--listen-primary)/0.52)] hover:text-[rgb(var(--listen-primary))] sm:w-auto sm:px-4"
          onClick={onExit}
          type="button"
        >
          <Monitor className="h-5 w-5" aria-hidden />
          <span className="hidden sm:inline">Exit TV Mode</span>
          <span className="hidden rounded-sm border border-white/10 bg-white/8 px-2 py-1 text-[11px] text-on-surface-variant sm:inline">
            T
          </span>
        </button>
      </div>
    </div>
  );
}
