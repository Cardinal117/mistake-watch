"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Link2 } from "lucide-react";

import { AppShell } from "@/components/layout";
import {
  Badge,
  Button,
  Input,
  Panel,
  RoomTransitionOverlay,
  buttonClassName,
} from "@/components/ui";
import { markRoomTransition } from "@/lib/performance/room-transition";
import { joinRoomFromInviteAction } from "@/lib/rooms/actions";
import type { RoomJoinPreview } from "@/lib/rooms/types";

type RoomJoinGateProps = {
  inviteToken?: string;
  preview: RoomJoinPreview | null;
  roomId: string;
};

export function RoomJoinGate({
  inviteToken,
  preview,
  roomId,
}: RoomJoinGateProps) {
  return (
    <AppShell className="overflow-x-hidden">
      <main className="mx-auto grid min-h-screen w-full max-w-[920px] place-items-center px-margin-mobile py-20 md:px-margin-desktop">
        <Panel className="w-full space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>
              {preview?.mode === "listen" ? "Listen Room" : "Watch Room"}
            </Badge>
            <span className="technical-label text-on-surface-variant">
              Guest invite
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-headline-lg font-semibold text-on-surface">
              Join {preview?.name ?? "this room"}
            </h1>
            <p className="max-w-2xl text-body-md text-on-surface-variant">
              Enter a display name to create a room-scoped guest identity for
              this browser. Accounts and friends are still a later layer.
            </p>
          </div>

          <form action={joinRoomFromInviteAction} className="grid gap-4">
            <input name="room-id" type="hidden" value={roomId} />
            <input
              name="invite-token"
              type="hidden"
              value={inviteToken ?? ""}
            />
            <input
              name="invite-code"
              type="hidden"
              value={preview?.code ?? ""}
            />
            <Input
              className="h-12"
              label="Display name"
              name="display-name"
              placeholder="Your name"
              required
            />
            <InviteJoinSubmitButton
              disabled={!inviteToken && !preview?.code}
              tone={preview?.mode === "listen" ? "amber" : "cyan"}
            />
          </form>

          <Link className={buttonClassName({ variant: "ghost" })} href="/">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to dashboard
          </Link>
        </Panel>
      </main>
    </AppShell>
  );
}

function InviteJoinSubmitButton({
  disabled,
  tone,
}: {
  disabled: boolean;
  tone: "amber" | "cyan";
}) {
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
        detail="Preparing your guest identity and live room connection."
        label="Joining room"
        tone={tone}
      />
      <Button
        aria-busy={pending}
        className="h-12"
        disabled={disabled || pending}
        type="submit"
      >
        <Link2 className="h-4 w-4" aria-hidden />
        {pending ? "Joining..." : "Join Room"}
      </Button>
    </>
  );
}
