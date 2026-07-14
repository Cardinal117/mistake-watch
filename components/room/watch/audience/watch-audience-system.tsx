"use client";

import dynamic from "next/dynamic";
import { PanelRightClose, PanelRightOpen } from "lucide-react";

import { Avatar } from "@/components/ui";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { getMemberAccentColor } from "../presentation";
import { WatchSurfaceHeader } from "../watch-surface-header";

const MembersPanel = dynamic(
  () => import("../../members-panel").then((module) => module.MembersPanel),
  { loading: AudiencePanelLoadingBoundary },
);
const RoomChatPanel = dynamic(
  () => import("../../room-chat-panel").then((module) => module.RoomChatPanel),
  { loading: AudiencePanelLoadingBoundary },
);

export function WatchAudienceSystem({
  expanded,
  liveRoom,
  onClose,
  onOpen,
  room,
}: {
  expanded: boolean;
  liveRoom: LiveRoomState;
  onClose(): void;
  onOpen(): void;
  room: RoomSnapshot;
}) {
  const controllerMemberId =
    liveRoom.participants.find((participant) => participant.isController)?.id ??
    null;

  if (!expanded) {
    return (
      <aside className="fixed bottom-[9.25rem] right-0 top-0 z-[55] hidden w-16 border-l border-white/10 bg-background/20 shadow-[0_0_36px_rgb(0_0_0_/_0.28)] backdrop-blur-md md:grid md:grid-rows-[auto_minmax(0,1fr)] md:justify-items-center md:gap-3 md:px-2 md:py-3">
        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim transition hover:bg-primary-fixed-dim/15"
          onClick={onOpen}
          type="button"
          aria-label="Open audience panel"
        >
          <PanelRightOpen className="h-4 w-4" aria-hidden />
        </button>
        <div className="grid content-start gap-2 overflow-y-auto [scrollbar-width:none]">
          {liveRoom.participants.slice(0, 6).map((participant) => (
            <button
              className="rounded-sm border border-white/10 bg-background/25 p-1 transition hover:border-primary-fixed-dim/35"
              key={participant.id}
              onClick={onOpen}
              type="button"
              title={participant.name}
            >
              <Avatar
                avatarKey={participant.avatarKey}
                className="h-8 w-8"
                crowned={participant.role === "host"}
                name={participant.name}
                seed={participant.id}
                status={participant.status}
              />
            </button>
          ))}
        </div>
      </aside>
    );
  }

  return (
    <aside className="watch-audience-panel fixed inset-x-0 bottom-0 z-[65] grid max-h-[min(92dvh,52rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-t-xl border border-b-0 border-white/10 bg-background/16 shadow-[0_-22px_54px_rgb(0_0_0_/_0.34)] backdrop-blur-sm lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[min(48rem,calc(100vw-2rem))] lg:rounded-l-lg lg:rounded-r-none lg:border-y-0 lg:border-r-0 lg:bg-background/8 lg:shadow-[0_0_48px_rgb(0_0_0_/_0.26)]">
      <WatchSurfaceHeader
        eyebrow="Audience"
        icon={<PanelRightClose className="h-4 w-4" aria-hidden />}
        onClose={onClose}
        title="Chat and members"
      />
      <div className="grid min-h-0 overflow-hidden p-2 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] lg:p-3">
        <RoomChatPanel
          connectionStatus={liveRoom.connectionStatus}
          currentMemberId={room.currentMember?.id}
          getMemberAccentColor={getMemberAccentColor}
          messages={liveRoom.snapshot.chatMessages}
          participants={liveRoom.participants}
          presentation="audience"
          sendMessage={liveRoom.sendChatMessage}
        />
        <MembersPanel
          canManageAuthority={liveRoom.canManageAuthority}
          connectionStatus={liveRoom.connectionStatus}
          controllerMemberId={controllerMemberId}
          currentMemberId={room.currentMember?.id}
          errorMessage={liveRoom.errorMessage}
          grantControl={liveRoom.grantControl}
          kickMember={liveRoom.kickMember}
          onPermissionChange={liveRoom.setPermission}
          participants={liveRoom.participants}
          presentation="audience"
          removeIdleMember={liveRoom.removeIdleMember}
          revokeControl={liveRoom.revokeControl}
        />
      </div>
    </aside>
  );
}

function AudiencePanelLoadingBoundary() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading audience panel"
      className="animate-pulse border border-white/10 bg-background/20"
      style={{ minHeight: "16rem" }}
    />
  );
}
