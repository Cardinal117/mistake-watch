"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";
import { Avatar } from "@/components/ui";
import { setRoomSavedAction } from "@/lib/rooms/actions";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { deriveListenHeaderPresentation } from "@/components/room/listen/header/header-presentation";
import { ListenPermissionsDialog } from "@/components/room/listen/settings/settings-dialogs";

export function ListenMemberAvatarRow({
  controllerMemberId,
  currentMemberId,
  liveRoom,
  participants,
}: {
  controllerMemberId: string | null;
  currentMemberId?: string | null;
  liveRoom: LiveRoomState;
  participants: LiveRoomState["participants"];
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const presentation = deriveListenHeaderPresentation({
    canManageAuthority: liveRoom.canManageAuthority,
    participants,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Close permissions"]',
        )
        ?.focus();
    });

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      setOpen(false);
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!presentation.actions.canOpenAudience) {
    return null;
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label={`Open audience panel, ${presentation.onlineParticipantCount} online`}
        className="group flex min-h-9 shrink-0 items-center justify-end rounded-full px-1.5 py-1 outline-none transition hover:bg-[rgb(var(--listen-primary)/0.08)] focus-visible:ring-2 focus-visible:ring-[rgb(var(--listen-primary)/0.72)]"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        title="Open audience"
        type="button"
      >
        <span className="flex -space-x-1.5" aria-hidden>
          {presentation.visibleParticipants.map((participant) => (
            <Avatar
              avatarKey={participant.avatarKey}
              className="h-8 w-8 rounded-full border border-[rgb(var(--listen-primary)/0.66)] bg-surface-container-low shadow-[0_0_16px_rgb(var(--listen-shadow)/0.16)] transition-transform group-hover:-translate-y-0.5"
              crowned={participant.role === "host"}
              key={participant.id}
              name={participant.name}
              seed={participant.id}
              status={participant.status}
            />
          ))}
        </span>
        {presentation.hiddenParticipantCount > 0 ? (
          <span
            className="relative -ml-1 inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-white/12 bg-surface-container-low px-2 text-[11px] font-semibold text-on-surface-variant"
            title={`${presentation.hiddenParticipantCount} more member${presentation.hiddenParticipantCount === 1 ? "" : "s"}`}
          >
            +{presentation.hiddenParticipantCount}
          </span>
        ) : null}
      </button>
      <ListenPermissionsDialog
        controllerMemberId={controllerMemberId}
        currentMemberId={currentMemberId}
        liveRoom={liveRoom}
        onClose={() => {
          setOpen(false);
          window.requestAnimationFrame(() => triggerRef.current?.focus());
        }}
        open={open}
      />
    </>
  );
}

export function ListenRoomSaveButton({
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!canSave) {
    return null;
  }

  async function toggleSaved() {
    if (saving) {
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const result = await setRoomSavedAction({ roomId, saved: !isSaved });

      setIsSaved(result.isSaved);
      setStatusMessage(result.isSaved ? "Room saved." : "Room removed.");
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Saved-room update failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        aria-label={isSaved ? "Remove saved room" : "Save room"}
        aria-pressed={isSaved}
        className={cx(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-transparent text-on-surface-variant outline-none transition hover:border-[rgb(var(--listen-primary)/0.34)] hover:bg-[rgb(var(--listen-primary)/0.08)] hover:text-on-surface focus-visible:ring-2 focus-visible:ring-[rgb(var(--listen-primary)/0.72)] disabled:cursor-wait disabled:opacity-55",
          isSaved &&
            "border-[rgb(var(--listen-primary)/0.34)] bg-[rgb(var(--listen-primary)/0.1)] text-[rgb(var(--listen-primary))]",
        )}
        disabled={saving}
        onClick={() => void toggleSaved()}
        title={isSaved ? "Remove saved room" : "Save room"}
        type="button"
      >
        <Star
          className="h-4.5 w-4.5"
          fill={isSaved ? "currentColor" : "none"}
          aria-hidden
        />
      </button>
      <span className="sr-only" aria-live="polite">
        {statusMessage}
      </span>
    </>
  );
}
