"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Edit3,
  Settings,
  Users,
  X,
} from "lucide-react";
import { AvatarPicker } from "@/components/account";
import { Avatar, Button, PendingLink, buttonClassName } from "@/components/ui";
import { useSelectedAvatarKey } from "@/lib/identity/avatar-selection";
import { getParticipantVisual } from "@/lib/rooms/participant-visual";
import { setRoomSavedAction } from "@/lib/rooms/actions";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { InviteActions } from "./invite-actions";
import { ModeSwitcher } from "./mode-switcher";

type RoomNavigationPanelProps = {
  compact?: boolean;
  liveRoom: LiveRoomState;
  room: RoomSnapshot;
};

export function RoomNavigationPanel({
  compact = true,
  liveRoom,
  room,
}: RoomNavigationPanelProps) {
  const liveName = liveRoom.snapshot.session?.roomName ?? room.name;
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const currentMemberName = room.currentMember?.name ?? "Mistake Guest";
  const currentMemberRole = room.currentMember?.role ?? "guest";
  const currentMemberSeed = room.currentMember?.id ?? currentMemberName;
  const { avatarKey } = useSelectedAvatarKey(currentMemberSeed);
  const participants = liveRoom.participants;
  const onlineParticipants = participants.filter(
    (participant) => participant.status === "online",
  );

  return (
    <nav
      aria-label="Room navigation"
      className={
        compact
          ? "grid min-h-screen content-start gap-4 border-r border-white/10 bg-surface/92 p-5 pb-44 backdrop-blur-xl lg:min-h-full"
          : "flex flex-wrap items-center justify-between gap-3 p-3"
      }
    >
      <div
        className={
          compact ? "grid gap-3" : "flex min-w-0 flex-1 items-center gap-3"
        }
      >
        <PendingLink
          className={
            compact
              ? "inline-flex h-10 w-fit items-center justify-center gap-2 rounded-md border border-white/10 px-3 text-label-sm font-semibold text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
              : "inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-on-surface"
          }
          href="/"
          loadingDetail="Returning you to the dashboard."
          loadingLabel="Leaving room"
          tone={room.mode === "listen" ? "amber" : "cyan"}
        >
          <X className="h-4 w-4" aria-hidden />
          <span className={compact ? undefined : "sr-only"}>Leave Room</span>
        </PendingLink>
        <div className="min-w-0">
          <p
            className={
              room.mode === "listen"
                ? "technical-label text-secondary-fixed-dim"
                : "technical-label text-primary-fixed-dim"
            }
          >
            {room.mode === "listen" ? "Listen Room" : "Watch Room"}
          </p>
          <div className="mt-2 grid min-w-0 gap-2">
            <EditableRoomName
              canRename={
                liveRoom.canManageAuthority &&
                liveRoom.connectionStatus === "connected"
              }
              name={liveName}
              onRename={liveRoom.renameRoom}
            />
            <RoomPresencePreview
              count={onlineParticipants.length}
              currentMemberId={currentMemberSeed}
              currentMemberSelectedAvatarKey={avatarKey}
              participants={
                onlineParticipants.length > 0
                  ? onlineParticipants
                  : participants
              }
            />
          </div>
        </div>
      </div>

      <div
        className={
          compact
            ? "grid gap-2"
            : "flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto"
        }
      >
        {compact ? (
          <div className="overflow-hidden border border-white/10 bg-surface-container-lowest">
            <ModeSwitcher
              canSwitch={
                liveRoom.canManageAuthority &&
                liveRoom.connectionStatus === "connected"
              }
              mode={room.mode}
              onSwitchMode={liveRoom.switchMode}
            />
          </div>
        ) : null}
        <InviteActions inviteUrl={room.inviteUrl} roomCode={room.code} />
        <div className={compact ? "grid grid-cols-2 gap-2" : "flex gap-2"}>
          <SavedRoomToggle
            canSave={liveRoom.canManageAuthority}
            initialSaved={room.isSaved}
            roomId={room.id}
          />
          <Button
            className="w-full justify-start"
            onClick={() => setAvatarPickerOpen(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            <Settings className="h-5 w-5" aria-hidden />
            Settings
          </Button>
          {!compact ? (
            <PendingLink
              className={buttonClassName({ size: "sm", variant: "ghost" })}
              href="/"
              loadingDetail="Returning you to the dashboard."
              loadingLabel="Leaving room"
              tone={room.mode === "listen" ? "amber" : "cyan"}
            >
              <X className="h-4 w-4" aria-hidden />
              Leave
            </PendingLink>
          ) : null}
        </div>
      </div>
      <AvatarPicker
        name={currentMemberName}
        onClose={() => setAvatarPickerOpen(false)}
        open={avatarPickerOpen}
        role={currentMemberRole}
        seed={currentMemberSeed}
      />
    </nav>
  );
}

function SavedRoomToggle({
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

  const Icon = isSaved ? BookmarkCheck : Bookmark;

  return (
    <div className="grid gap-1.5">
      <Button
        className="w-full justify-start"
        disabled={!canSave || saving}
        onClick={handleToggle}
        size="sm"
        type="button"
        variant={isSaved ? "secondary" : "ghost"}
      >
        <Icon className="h-5 w-5" aria-hidden />
        {isSaved ? "Saved" : "Save"}
      </Button>
      {errorMessage ? (
        <p className="text-label-sm text-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function EditableRoomName({
  canRename,
  name,
  onRename,
}: {
  canRename: boolean;
  name: string;
  onRename(roomName: string): Promise<void>;
}) {
  const [draft, setDraft] = useState(name);
  const [editing, setEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = draft.trim().replace(/\s+/g, " ");

    if (!nextName || nextName === name || saving) {
      setEditing(false);
      setDraft(name);
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      await onRename(nextName);
      setEditing(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Room rename failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <form className="grid gap-2" onSubmit={handleSubmit}>
        <div className="flex min-w-0 items-center gap-2">
          <input
            aria-label="Room name"
            className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-surface-container-low px-3 text-body-md font-semibold text-on-surface outline-none transition focus:border-primary-fixed-dim focus:ring-2 focus:ring-primary-fixed-dim/20"
            disabled={saving}
            maxLength={120}
            onChange={(event) => setDraft(event.target.value)}
            value={draft}
          />
          <button
            aria-label="Save room name"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary-fixed-dim/35 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/10 disabled:opacity-45"
            disabled={saving}
            type="submit"
          >
            <Check className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {errorMessage ? (
          <p className="text-label-sm text-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <div className="flex min-w-0 items-start gap-2">
      <h1 className="min-w-0 flex-1 text-headline-md font-semibold leading-tight text-on-surface [overflow-wrap:anywhere]">
        {name}
      </h1>
      {canRename ? (
        <button
          aria-label="Rename room"
          className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:bg-surface-variant/35 hover:text-primary-fixed-dim"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          type="button"
        >
          <Edit3 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

function RoomPresencePreview({
  count,
  currentMemberId,
  currentMemberSelectedAvatarKey,
  participants,
}: {
  count: number;
  currentMemberId: string;
  currentMemberSelectedAvatarKey: string;
  participants: LiveRoomState["participants"];
}) {
  const previewMembers = useMemo(
    () => participants.slice(0, 5),
    [participants],
  );
  const hiddenCount = Math.max(0, participants.length - previewMembers.length);

  return (
    <div className="grid gap-2 rounded-md border border-white/10 bg-surface-container-low p-3">
      <div className="flex items-center justify-between gap-2 text-label-sm text-on-surface-variant">
        <span className="inline-flex items-center gap-2">
          <Users className="h-4 w-4 text-primary-fixed-dim" aria-hidden />
          {count} online now
        </span>
      </div>
      <div className="flex -space-x-2">
        {previewMembers.map((participant) => {
          const visual = getParticipantVisual(participant.id);

          return (
            <span
              className="group relative inline-flex"
              key={participant.id}
              title={`${participant.name} / ${participant.role}`}
            >
              <Avatar
                avatarKey={
                  participant.id === currentMemberId
                    ? currentMemberSelectedAvatarKey
                    : participant.avatarKey
                }
                className="h-8 w-8 ring-2 ring-surface-container-low"
                crowned={participant.role === "host"}
                name={participant.name}
                seed={participant.id}
                status={participant.status}
              />
              <span
                aria-hidden
                className={`absolute left-1 top-1 h-1.5 w-1.5 rounded-full ${visual.dotClassName}`}
              />
            </span>
          );
        })}
        {hiddenCount > 0 ? (
          <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-white/10 bg-surface-container px-2 text-label-sm font-semibold text-on-surface-variant ring-2 ring-surface-container-low">
            +{hiddenCount}
          </span>
        ) : null}
      </div>
    </div>
  );
}
