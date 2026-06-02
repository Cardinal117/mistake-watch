"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Link2 } from "lucide-react";

import { Button, Input, RoomTransitionOverlay } from "@/components/ui";
import { markRoomTransition } from "@/lib/performance/room-transition";
import { joinRoomAction } from "@/lib/rooms/actions";
import { cx } from "@/lib/ui";

type JoinRoomFormProps = {
  attached?: boolean;
};

export function JoinRoomForm({ attached = false }: JoinRoomFormProps) {
  return (
    <form
      action={joinRoomAction}
      className={cx(
        "grid min-w-0 gap-3",
        attached
          ? "border-y border-white/10 bg-surface/35 p-3"
          : "rounded-xl border border-white/10 bg-surface-container/70 p-4 backdrop-blur-xl",
      )}
    >
      <Input
        className="h-12"
        label="Display name"
        name="display-name"
        placeholder="Your name"
        required
      />
      <Input
        className="h-12"
        label="Invite link or code"
        name="room-invite"
        placeholder="Paste invite link or room code"
        required
      />
      <JoinRoomSubmitButton />
    </form>
  );
}

function JoinRoomSubmitButton() {
  const { pending } = useFormStatus();

  useEffect(() => {
    if (pending) {
      markRoomTransition("Joining room");
    }
  }, [pending]);

  return (
    <>
      <RoomTransitionOverlay
        active={pending}
        detail="Checking the invite and preparing your guest session."
        label="Joining room"
      />
      <Button
        aria-busy={pending}
        className="h-12"
        disabled={pending}
        type="submit"
        variant="secondary"
      >
        <Link2 className="h-4 w-4" aria-hidden />
        {pending ? "Joining..." : "Join"}
      </Button>
    </>
  );
}
