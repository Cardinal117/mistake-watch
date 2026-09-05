"use client";
import {
  ArrowLeft,
  DoorOpen,
  Library,
  Settings2,
  UserRound,
  UserPlus,
} from "lucide-react";
import { WatchLeaveButton } from "./watch-leave-button";
import type { RoomQueueItem } from "@/lib/rooms";
import { useState } from "react";
import { AccountCommandPanel } from "@/components/account";
import { MembersPanel } from "../members-panel";
import { RoomChatPanel } from "../room-chat-panel";
import { QueuePanel } from "../queue-panel";
import { AddMediaDialog } from "../shared/add-media/add-media-dialog";
import { ModeSwitcher } from "../mode-switcher";
import { InviteActions } from "../invite-actions";
import { WatchSavedRoomToggle } from "./header/watch-signal-band";
import { getMemberAccentColor } from "./presentation";
import type { WatchModeLayoutProps, WatchMediaHubItem } from "./contracts";
import type { WatchWorkspace } from "./watch-navigation";

export function WatchWorkspaces({
  screen,
  room,
  liveRoom,
  account,
  accountNotice,
  items,
  onClose,
  onManage,
}: Pick<
  WatchModeLayoutProps,
  "room" | "liveRoom" | "account" | "accountNotice"
> & {
  screen: WatchWorkspace;
  items: WatchMediaHubItem[];
  onClose(): void;
  onManage(): void;
}) {
  const [notice, setNotice] = useState("");
  const connected = liveRoom.connectionStatus === "connected";
  const canLoad = connected && liveRoom.canManageAuthority;
  const queue = items.filter(
    (item): item is RoomQueueItem => item.status !== "library",
  );
  return (
    <div className="watch-workspace-content">
      {screen === "queue" && (
        <>
          <h2 className="watch-page-title">Queue</h2>
          <QueuePanel
            presentation="watch-workspace"
            canAddQueue={liveRoom.canAddQueue}
            canLoadSource={canLoad}
            canManageQueue={liveRoom.canManageQueue}
            connectionStatus={liveRoom.connectionStatus}
            items={queue}
            mode="watch"
            roomId={room.id}
            onAddQueueItem={liveRoom.addQueueItem}
            onClearQueue={liveRoom.clearQueue}
            onLoadSource={liveRoom.loadMediaSource}
            onMoveQueueItem={liveRoom.moveQueueItem}
            onPlayQueueItem={
              liveRoom.canControlPlayback
                ? liveRoom.playQueueItemNow
                : undefined
            }
            onQueueModeChange={liveRoom.setQueueMode}
            onQueueItemPriorityChange={liveRoom.setQueueItemPriority}
            onRemoveQueueItem={liveRoom.removeQueueItem}
            queueMode={liveRoom.snapshot.session?.queueMode ?? "normal"}
            roomErrors={liveRoom.snapshot.errors}
          />
        </>
      )}
      {screen === "add" && (
        <>
          <h2 className="watch-page-title">Add media</h2>
          <p className="watch-workspace-intro">
            Paste a YouTube or video link below, or choose something ready to
            watch from the catalogue.
          </p>
          <button className="watch-catalogue-return" onClick={onClose}>
            <ArrowLeft aria-hidden /> Browse uploaded catalogue
          </button>
          <AddMediaDialog
            embedded
            open
            addDisabled={!liveRoom.canAddQueue || !connected}
            canAddQueue={liveRoom.canAddQueue && connected}
            canLoadSource={canLoad}
            loadDisabled={!canLoad}
            isConnected={connected}
            items={queue}
            historyItems={queue.filter((i) => i.status === "played")}
            mode="watch"
            roomId={room.id}
            queueMode={liveRoom.snapshot.session?.queueMode ?? "normal"}
            notify={setNotice}
            onAddQueueItem={liveRoom.addQueueItem}
            onLoadSource={liveRoom.loadMediaSource}
            onClose={onClose}
          />
          {notice && <p role="status">{notice}</p>}
        </>
      )}
      {screen === "social" && (
        <>
          <h2 className="watch-page-title">People in this room</h2>
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
          <div className="watch-chat">
            <RoomChatPanel
              connectionStatus={liveRoom.connectionStatus}
              currentMemberId={room.currentMember?.id}
              getMemberAccentColor={getMemberAccentColor}
              messages={liveRoom.snapshot.chatMessages}
              participants={liveRoom.participants}
              sendMessage={liveRoom.sendChatMessage}
            />
          </div>
        </>
      )}
      {screen === "more" && (
        <>
          <h2 className="watch-page-title">Room & account</h2>
          <section className="watch-settings-section">
            <h3>
              <Settings2 aria-hidden /> Room mode
            </h3>
            <p>Changing mode affects everyone in the room.</p>
            <ModeSwitcher
              mode={room.mode}
              canSwitch={canLoad}
              onSwitchMode={liveRoom.switchMode}
            />
          </section>
          <section className="watch-settings-section">
            <h3>
              <UserPlus aria-hidden /> Invite & save
            </h3>
            <div className="watch-setting-actions">
              <InviteActions inviteUrl={room.inviteUrl} roomCode={room.code} />
              <WatchSavedRoomToggle
                canSave={canLoad}
                initialSaved={room.isSaved}
                roomId={room.id}
              />
            </div>
          </section>
          <section className="watch-settings-section">
            <h3>
              <UserRound aria-hidden /> Your account
            </h3>
            <AccountCommandPanel
              embedded
              account={account}
              notice={accountNotice}
              nextPath={`/rooms/${room.id}`}
              roomId={room.id}
              roomAttached={room.isAttachedToAccount}
            />
          </section>
          {account.status === "signed-in" &&
            account.role === "owner" &&
            account.accountStatus === "active" && (
              <section className="watch-settings-section">
                <h3>
                  <Library aria-hidden /> Library management
                </h3>
                <p>Upload media, organize folders and review processing.</p>
                <button onClick={onManage}>Manage library</button>
              </section>
            )}
          <section className="watch-settings-section watch-leave-section">
            <WatchLeaveButton>
              <DoorOpen aria-hidden /> Leave room
            </WatchLeaveButton>
          </section>
        </>
      )}
    </div>
  );
}
