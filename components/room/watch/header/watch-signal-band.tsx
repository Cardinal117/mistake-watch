"use client";

import { useState, type ReactNode } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Radio,
  Users,
  X,
} from "lucide-react";

import { AccountCommandPanel } from "@/components/account";
import { PendingLink } from "@/components/ui";
import type { AccountSummary } from "@/lib/account/types";
import type { RoomSnapshot } from "@/lib/rooms";
import { setRoomSavedAction } from "@/lib/rooms/actions";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { InviteActions } from "../../invite-actions";
import { ModeSwitcher } from "../../mode-switcher";
import type { WatchSurfaceId } from "../contracts";

export function WatchSignalBand({
  activeSurface,
  account,
  accountNotice,
  canSwitch,
  connectionStatus,
  liveRoom,
  onOpenSurface,
  onlineCount,
  queuedCount,
  room,
}: {
  activeSurface: WatchSurfaceId | null;
  account: AccountSummary;
  accountNotice?: "guest-room-attached";
  canSwitch: boolean;
  connectionStatus: LiveRoomState["connectionStatus"];
  liveRoom: LiveRoomState;
  onOpenSurface(surface: WatchSurfaceId): void;
  onlineCount: number;
  queuedCount: number;
  room: RoomSnapshot;
}) {
  const liveName = liveRoom.snapshot.session?.roomName ?? room.name;
  const roomAttached =
    account.status === "signed-in" && room.isAttachedToAccount;

  return (
    <header className="grid gap-2 border-b border-white/10 bg-background/52 px-0 py-1.5 backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="flex min-w-0 items-start gap-3">
        <PendingLink
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
          href="/"
          loadingDetail="Returning you to the dashboard."
          loadingLabel="Leaving room"
          tone="cyan"
        >
          <X className="h-4 w-4" aria-hidden />
          <span className="sr-only">Leave Room</span>
        </PendingLink>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <p className="technical-label text-primary-fixed-dim">
              Signal Room
            </p>
            <span className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-primary-fixed-dim">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              {connectionStatus}
            </span>
          </div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="max-w-full truncate text-body-lg font-semibold leading-tight text-on-surface md:text-[22px]">
              {liveName}
            </h1>
            <span className="text-label-sm text-on-surface-variant">
              {room.code} / {onlineCount} connected
            </span>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
        <WatchDrawerButton
          active={activeSurface === "queue"}
          count={queuedCount}
          icon={<ChevronDown className="h-4 w-4" aria-hidden />}
          label="Queue"
          onClick={() => onOpenSurface("queue")}
        />
        <WatchDrawerButton
          active={activeSurface === "audience"}
          count={onlineCount}
          icon={<Users className="h-4 w-4" aria-hidden />}
          label="Audience"
          onClick={() => onOpenSurface("audience")}
        />
        <WatchSavedRoomToggle
          canSave={liveRoom.canManageAuthority}
          initialSaved={room.isSaved}
          roomId={room.id}
        />
        <InviteActions
          compact
          inviteUrl={room.inviteUrl}
          roomCode={room.code}
        />
        <AccountCommandPanel
          account={account}
          compact
          notice={accountNotice}
          nextPath={`/rooms/${room.id}`}
          roomAttached={roomAttached}
          roomId={room.id}
        />
        <div className="min-w-[11rem] overflow-hidden rounded-sm border border-white/10">
          <ModeSwitcher
            canSwitch={canSwitch}
            compact
            mode={room.mode}
            onSwitchMode={liveRoom.switchMode}
          />
        </div>
      </div>
    </header>
  );
}

export function WatchSavedRoomToggle({
  canSave,
  initialSaved,
  roomId,
}: {
  canSave: boolean;
  initialSaved: boolean;
  roomId: string;
}) {
  const [isSaved, setIsSaved] = useState(initialSaved);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const Icon = isSaved ? BookmarkCheck : Bookmark;

  async function handleToggle() {
    if (!canSave || saving) {
      return;
    }

    const nextSaved = !isSaved;

    setSaving(true);
    setErrorMessage(null);

    try {
      const result = await setRoomSavedAction({
        roomId,
        saved: nextSaved,
      });

      setIsSaved(result.isSaved);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Saved-room update failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="relative">
      <button
        aria-label={isSaved ? "Remove saved room" : "Save room"}
        className={cx(
          "inline-flex h-9 items-center justify-center gap-2 rounded-sm border px-3 text-label-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
          isSaved
            ? "border-primary-fixed-dim/50 bg-primary-fixed-dim/12 text-primary-fixed-dim"
            : "border-white/10 bg-transparent text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
        )}
        disabled={!canSave || saving}
        onClick={handleToggle}
        title={
          canSave
            ? isSaved
              ? "Remove from saved spaces"
              : "Save to dashboard"
            : "Only the host can save this room"
        }
        type="button"
      >
        <Icon className="h-4 w-4" aria-hidden />
        <span>{isSaved ? "Saved" : "Save"}</span>
      </button>
      {errorMessage ? (
        <span className="absolute right-0 top-full z-10 mt-1 w-56 rounded-sm border border-error/30 bg-error-container/95 px-2 py-1 text-[11px] text-error shadow-lg">
          {errorMessage}
        </span>
      ) : null}
    </span>
  );
}

function WatchDrawerButton({
  active,
  count,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  count?: number;
  icon: ReactNode;
  label: string;
  onClick(): void;
}) {
  return (
    <button
      className={cx(
        "inline-flex h-9 items-center justify-center gap-2 rounded-sm border px-3 text-label-sm font-semibold transition",
        active
          ? "border-primary-fixed-dim/50 bg-primary-fixed-dim/12 text-primary-fixed-dim"
          : "border-white/10 bg-transparent text-on-surface-variant hover:bg-surface-variant/35 hover:text-on-surface",
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span>{label}</span>
      {typeof count === "number" ? (
        <span className="rounded-sm border border-white/10 bg-surface-container-low px-1.5 text-[11px] leading-5 text-on-surface-variant">
          {count}
        </span>
      ) : null}
    </button>
  );
}
