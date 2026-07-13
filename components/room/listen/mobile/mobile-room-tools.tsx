"use client";

import { AccountCommandPanel } from "@/components/account";
import type { AccountSummary } from "@/lib/account/types";
import type { RoomQueueItem, RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomError, LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { InviteActions } from "@/components/room/invite-actions";
import { MembersPanel } from "@/components/room/members-panel";
import { ModeSwitcher } from "@/components/room/mode-switcher";
import {
  type SourceLoadInput,
  type QueueAddInput,
} from "@/components/room/listen/shared";
import { ListenAddMediaPopover } from "@/components/room/listen/add-media/add-media-popover";
import { ListenSavedRoomToggle } from "@/components/room/listen/queue/queue-row";

export function ListenMobileRoomTools({
  activeTab,
  account,
  accountNotice,
  canAddQueue,
  canLoadSource,
  connectionStatus,
  controllerMemberId,
  currentMemberId,
  items,
  liveRoom,
  onAddQueueItem,
  onLoadSource,
  onTabChange,
  roomErrors,
  room,
}: {
  activeTab: "members" | "room";
  account: AccountSummary;
  accountNotice?: "guest-room-attached";
  canAddQueue: boolean;
  canLoadSource: boolean;
  connectionStatus: string;
  controllerMemberId: string | null;
  currentMemberId?: string | null;
  items: RoomQueueItem[];
  liveRoom: LiveRoomState;
  onAddQueueItem(input: QueueAddInput): void;
  onLoadSource(input: SourceLoadInput): void;
  onTabChange(tab: "members" | "room"): void;
  roomErrors: LiveRoomError[];
  room: RoomSnapshot;
}) {
  const onlineCount = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  ).length;
  const roomAttached =
    account.status === "signed-in" && room.currentMember?.userId === account.id;

  return (
    <section className="relative z-20 overflow-hidden rounded-md border border-white/10 bg-surface/82 shadow-[inset_0_1px_0_rgb(255_255_255_/_0.035)] backdrop-blur-xl xl:hidden">
      <div className="grid grid-cols-2 gap-1 border-b border-white/10 bg-surface-container-lowest/80 p-1">
        {[
          ["room", "Room", room.code],
          ["members", "Members", onlineCount],
        ].map(([tab, label, meta]) => {
          const active = activeTab === tab;

          return (
            <button
              aria-selected={active}
              className={cx(
                "inline-flex h-9 items-center justify-center gap-2 rounded-sm px-3 text-label-sm font-semibold transition",
                active
                  ? "bg-secondary-fixed-dim/12 text-secondary-fixed-dim"
                  : "text-on-surface-variant hover:bg-surface-variant/25 hover:text-on-surface",
              )}
              key={tab}
              onClick={() => onTabChange(tab as "members" | "room")}
              role="tab"
              type="button"
            >
              {label}
              <span className="rounded-sm border border-white/10 bg-surface-container px-1.5 text-[11px] text-on-surface-variant">
                {meta}
              </span>
            </button>
          );
        })}
      </div>

      {activeTab === "room" ? (
        <div className="grid gap-3 p-3">
          <div className="grid gap-2">
            <ListenAddMediaPopover
              canAddQueue={canAddQueue}
              canLoadSource={canLoadSource}
              connectionStatus={connectionStatus}
              items={items}
              onAddQueueItem={onAddQueueItem}
              onLoadSource={onLoadSource}
              roomErrors={roomErrors}
              roomId={room.id}
            />
            <div className="grid gap-2">
              <ListenSavedRoomToggle
                canSave={liveRoom.canManageAuthority}
                compact
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
                notice={accountNotice}
                nextPath={`/rooms/${room.id}`}
                roomAttached={roomAttached}
                roomId={room.id}
              />
            </div>
          </div>
          <ModeSwitcher
            canSwitch={
              liveRoom.canManageAuthority &&
              liveRoom.connectionStatus === "connected"
            }
            compact
            mode="listen"
            onSwitchMode={liveRoom.switchMode}
          />
        </div>
      ) : (
        <div className="max-h-[min(28rem,60vh)] overflow-y-auto p-3 [scrollbar-color:rgb(255_186_32_/_0.42)_transparent] [scrollbar-width:thin]">
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
      )}
    </section>
  );
}
