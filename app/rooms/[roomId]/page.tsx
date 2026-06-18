import { redirect } from "next/navigation";

import { RoomShell } from "@/components/room";
import { RoomJoinGate } from "@/components/room/room-join-gate";
import {
  buildRoomInvitePath,
  getRoomJoinPreview,
  getRoomSnapshotForGuest,
} from "@/lib/rooms";

export const dynamic = "force-dynamic";

type RoomPageProps = {
  params: Promise<{
    roomId: string;
  }>;
  searchParams: Promise<{
    invite?: string;
    notice?: string;
  }>;
};

export default async function RoomPage({
  params,
  searchParams,
}: RoomPageProps) {
  const { roomId } = await params;
  const { invite, notice } = await searchParams;
  const room = await getRoomSnapshotForGuest(roomId);

  if (room) {
    const roomWithInvite = invite
      ? { ...room, inviteUrl: buildRoomInvitePath(room, invite) }
      : room;

    return (
      <RoomShell
        accountNotice={notice === "guest-room-attached" ? notice : undefined}
        room={roomWithInvite}
      />
    );
  }

  const preview = await getRoomJoinPreview(roomId);

  if (!preview) {
    redirect("/?notice=room-closed");
  }

  return (
    <RoomJoinGate inviteToken={invite} preview={preview} roomId={roomId} />
  );
}
