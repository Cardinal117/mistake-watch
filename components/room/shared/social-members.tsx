"use client";
import { SharedMembershipPanel } from "./shared-membership-panel";
import { MembersPanel } from "../members-panel";
import type { WatchModeLayoutProps } from "../watch/contracts";
export function SocialMembers({
  room,
  liveRoom,
}: Pick<WatchModeLayoutProps, "room" | "liveRoom">) {
  const connected = liveRoom.connectionStatus === "connected";
  return (
    <div className="room-social-members">
      {room.kind === "shared" && <SharedMembershipPanel roomId={room.id} />}
      <MembersPanel
        participants={liveRoom.participants}
        canManageAuthority={liveRoom.canManageAuthority && connected}
        connectionStatus={liveRoom.connectionStatus}
        controllerMemberId={
          liveRoom.participants.find((p) => p.isController)?.id
        }
        currentMemberId={room.currentMember?.id}
        errorMessage={liveRoom.errorMessage}
        grantControl={liveRoom.grantControl}
        kickMember={liveRoom.kickMember}
        onPermissionChange={liveRoom.setPermission}
        removeIdleMember={liveRoom.removeIdleMember}
        revokeControl={liveRoom.revokeControl}
      />
    </div>
  );
}
