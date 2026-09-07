"use client";
import { SocialInviteBar } from "../shared/social-invite-bar";
import { ArrowLeft } from "lucide-react";
import { RoomSettings } from "../shared/room-settings";
import type { RoomQueueItem } from "@/lib/rooms";
import { useState } from "react";
import { SocialMembers } from "../shared/social-members";
import { RoomChatPanel } from "../room-chat-panel";
import { QueuePanel } from "../queue-panel";
import { AddMediaDialog } from "../shared/add-media/add-media-dialog";
import { getMemberAccentColor } from "./presentation";
import type { WatchModeLayoutProps, WatchMediaHubItem } from "./contracts";
import type { WatchWorkspace } from "./watch-navigation";

export function WatchWorkspaces({
  screen,
  room,
  liveRoom,
  account,
  accountNotice,
  catalogueAvailable = true,
  items,
  onClose,
  onManage,
}: Pick<
  WatchModeLayoutProps,
  "room" | "liveRoom" | "account" | "accountNotice"
> & {
  screen: WatchWorkspace;
  catalogueAvailable?: boolean;
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
            {catalogueAvailable
              ? "Paste a YouTube or video link below, or choose something ready to watch from the catalogue."
              : "Paste a YouTube or video link to play together. Catalogue access is separate from playback in this room."}
          </p>
          {catalogueAvailable && (
            <button className="watch-catalogue-return" onClick={onClose}>
              <ArrowLeft aria-hidden /> Browse uploaded catalogue
            </button>
          )}
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
          <SocialInviteBar roomCode={room.code} inviteUrl={room.inviteUrl} />
          <h2 className="watch-page-title">People in this room</h2>
          <SocialMembers room={room} liveRoom={liveRoom} />
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
        <RoomSettings
          room={room}
          liveRoom={liveRoom}
          account={account}
          accountNotice={accountNotice}
          onManage={onManage}
        />
      )}
    </div>
  );
}
