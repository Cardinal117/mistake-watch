"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { Pause, X } from "lucide-react";
import { IconButton } from "@/components/ui";
import type { RoomQueueItem } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { MembersPanel } from "@/components/room/members-panel";
import { useNextItemPreparation } from "@/components/room/use-next-item-preparation";
import { type ListenTvSettings } from "@/components/room/listen/shared";
import {
  SmallMediaCard,
  QueueArtwork,
} from "@/components/room/listen/discovery/media-cards";
import {
  formatListenPreparationStatus,
  formatQueueRemainingDuration,
} from "@/components/room/listen/helpers";

export function ListenRoomSettingsDialog({
  onChange,
  onClose,
  open,
  settings,
}: {
  onChange: Dispatch<SetStateAction<ListenTvSettings>>;
  onClose(): void;
  open: boolean;
  settings: ListenTvSettings;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  function updateSetting<Key extends keyof ListenTvSettings>(
    key: Key,
    value: ListenTvSettings[Key],
  ) {
    onChange((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/48 px-4 backdrop-blur-md">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-md border border-white/10 bg-surface/94 shadow-[0_28px_80px_rgb(0_0_0_/_0.58),0_0_46px_rgb(var(--listen-shadow)/0.16)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="listen-room-settings-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="technical-label border-0 p-0 text-[rgb(var(--listen-primary))]">
              Room settings
            </p>
            <h2
              className="mt-1 text-title-lg font-semibold text-on-surface"
              id="listen-room-settings-title"
            >
              TV mode display
            </h2>
          </div>
          <IconButton
            label="Close room settings"
            onClick={onClose}
            variant="ghost"
          >
            <X className="h-5 w-5" aria-hidden />
          </IconButton>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="grid gap-5">
            <ListenTvSettingsSlider
              label="Background dimness"
              max={80}
              min={0}
              onChange={(value) => updateSetting("dimness", value)}
              suffix="%"
              value={settings.dimness}
            />
            <ListenTvSettingsSlider
              label="UI brightness"
              max={120}
              min={45}
              onChange={(value) => updateSetting("uiBrightness", value)}
              suffix="%"
              value={settings.uiBrightness}
            />
            <label className="flex items-start gap-3 rounded-md border border-white/10 bg-background/34 p-4">
              <input
                checked={settings.hideUiOnIdle}
                className="mt-1 h-4 w-4 accent-[rgb(var(--listen-primary))]"
                onChange={(event) =>
                  updateSetting("hideUiOnIdle", event.currentTarget.checked)
                }
                type="checkbox"
              />
              <span>
                <span className="block text-label-md font-semibold text-on-surface">
                  Hide all TV UI on inactivity
                </span>
                <span className="mt-1 block text-label-sm text-on-surface-variant">
                  After the idle timer, the overlay and cursor disappear until
                  mouse, touch, or keyboard activity returns.
                </span>
              </span>
            </label>
          </div>

          <div className="overflow-hidden rounded-md border border-white/10 bg-black">
            <div className="relative h-56">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgb(var(--listen-primary)_/_0.42),transparent_28%),linear-gradient(140deg,rgb(26_26_28),rgb(8_8_9))]" />
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: `rgb(0 0 0 / ${settings.dimness / 100})`,
                }}
              />
              <div
                className="absolute inset-x-4 bottom-4 grid gap-3"
                style={{ opacity: settings.uiBrightness / 100 }}
              >
                <p className="technical-label border-0 p-0 text-[rgb(var(--listen-primary))]">
                  Preview
                </p>
                <div className="h-2 rounded-full bg-white/20">
                  <div className="h-full w-2/5 rounded-full bg-[rgb(var(--listen-primary))]" />
                </div>
                <div className="flex items-center justify-center">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[rgb(var(--listen-primary))] text-background shadow-[0_0_28px_rgb(var(--listen-shadow)/0.38)]">
                    <Pause className="h-6 w-6" aria-hidden />
                  </span>
                </div>
              </div>
            </div>
            <p className="border-t border-white/10 px-4 py-3 text-label-sm text-on-surface-variant">
              Settings persist on this browser.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
export function ListenTvSettingsSlider({
  label,
  max,
  min,
  onChange,
  suffix,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange(value: number): void;
  suffix: string;
  value: number;
}) {
  return (
    <label className="grid gap-2 rounded-md border border-white/10 bg-background/34 p-4">
      <span className="flex items-center justify-between gap-3">
        <span className="text-label-md font-semibold text-on-surface">
          {label}
        </span>
        <span className="technical-label border-[rgb(var(--listen-primary)/0.28)] bg-[rgb(var(--listen-primary)/0.08)] text-[rgb(var(--listen-primary))]">
          {value}
          {suffix}
        </span>
      </span>
      <input
        className="h-2 accent-[rgb(var(--listen-primary))]"
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        type="range"
        value={value}
      />
    </label>
  );
}
export function getCopyableRoomLink(inviteUrl: string | null, roomId: string) {
  if (inviteUrl) {
    return inviteUrl;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return `${window.location.origin}/rooms/${roomId}`;
}
export function ListenPermissionsDialog({
  controllerMemberId,
  currentMemberId,
  liveRoom,
  onClose,
  open,
}: {
  controllerMemberId: string | null;
  currentMemberId?: string | null;
  liveRoom: LiveRoomState;
  onClose(): void;
  open: boolean;
}) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[135] grid place-items-center bg-background/62 p-4 backdrop-blur-xl">
      <section className="grid max-h-[min(44rem,calc(100dvh-2rem))] w-full max-w-3xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-white/10 bg-surface/92 shadow-[0_0_56px_rgb(0_0_0_/_0.52),0_0_42px_rgb(var(--listen-shadow)/0.14)] backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4">
          <div>
            <p className="technical-label border-0 p-0 text-[rgb(var(--listen-primary))]">
              Permissions
            </p>
            <h3 className="mt-1 text-title-md font-semibold text-on-surface">
              Room members and controls
            </h3>
          </div>
          <button
            aria-label="Close permissions"
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4 [scrollbar-color:rgb(var(--listen-primary)/0.34)_transparent] [scrollbar-width:thin]">
          <MembersPanel
            canManageAuthority={liveRoom.canManageAuthority}
            connectionStatus={liveRoom.connectionStatus}
            controllerMemberId={controllerMemberId}
            currentMemberId={currentMemberId}
            errorMessage={liveRoom.errorMessage}
            grantControl={liveRoom.grantControl}
            kickMember={liveRoom.kickMember}
            onPermissionChange={liveRoom.setPermission}
            participants={liveRoom.participants}
            removeIdleMember={liveRoom.removeIdleMember}
            revokeControl={liveRoom.revokeControl}
          />
        </div>
      </section>
    </div>,
    document.body,
  );
}
export function ListenPreparingNextStrip({
  nextPreparation,
}: {
  nextPreparation: ReturnType<typeof useNextItemPreparation>;
}) {
  const target = nextPreparation.target;

  if (!target) {
    return null;
  }

  return (
    <div className="relative z-10 grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 border-t border-[rgb(var(--listen-primary)/0.22)] bg-[rgb(var(--listen-primary)/0.08)] px-4 py-3">
      <QueueArtwork
        className="h-12 w-12 rounded-sm"
        thumbnailUrl={target.thumbnailUrl}
        title={target.title}
      />
      <div className="min-w-0">
        <p className="technical-label border-0 p-0 text-[rgb(var(--listen-primary))]">
          {formatListenPreparationStatus(nextPreparation.status)}
        </p>
        <p className="mt-1 truncate text-label-sm font-semibold text-on-surface">
          {target.title}
        </p>
      </div>
    </div>
  );
}
export function ListenRailQueueSummary({
  nextItem,
  queueCount,
  remainingSeconds,
}: {
  nextItem: RoomQueueItem | null;
  queueCount: number;
  remainingSeconds: number | null;
}) {
  return (
    <section className="mt-auto grid gap-3.5 border-t border-white/8 pt-5">
      <div className="flex items-center justify-between gap-3">
        <span className="technical-label border-0 p-0 text-[rgb(var(--listen-primary))]">
          Up Next
        </span>
        <span className="text-label-sm text-on-surface-variant">
          Queue {queueCount}
          {remainingSeconds
            ? ` / ${formatQueueRemainingDuration(remainingSeconds)}`
            : ""}
        </span>
      </div>
      {nextItem ? (
        <SmallMediaCard item={nextItem} label="Up next" />
      ) : (
        <div className="border-l border-[rgb(var(--listen-primary)/0.34)] py-1 pl-3">
          <p className="text-label-sm font-semibold text-on-surface">
            Build the next run
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Use Room Picks, search, or Add Media to keep the session moving.
          </p>
        </div>
      )}
    </section>
  );
}
