import { redirect } from "next/navigation";

import { RoomShell } from "@/components/room";
import { RoomJoinGate } from "@/components/room/room-join-gate";
import { getAccountSummary } from "@/lib/account/server";
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
  const account = await getAccountSummary();
  const room = await getRoomSnapshotForGuest(roomId, {
    accountUserId: account.status === "signed-in" ? account.id : null,
  });

  if (room) {
    const roomWithInvite = invite
      ? { ...room, inviteUrl: buildRoomInvitePath(room, invite) }
      : room;

    return (
      <RoomShell
        account={account}
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
