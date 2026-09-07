"use client";
import { SocialInviteBar } from "../../shared/social-invite-bar";
import { useState } from "react";
import dynamic from "next/dynamic";
import { WatchWorkspaces } from "../../watch/watch-workspaces";
const MediaLibrary = dynamic(() =>
  import("../../watch/media-hub/watch-media-hub").then(
    (m) => m.WatchMediaHubDiscovery,
  ),
);
import { QueuePanel } from "../../queue-panel";
import { AddMediaDialog } from "../../shared/add-media/add-media-dialog";
import { SocialMembers } from "../../shared/social-members";
import { RoomChatPanel } from "../../room-chat-panel";
import { getMemberAccentColor } from "../../watch/presentation";
import type { RoomQueueItem } from "@/lib/rooms";
import type { ListenModeLayoutProps } from "../shared";
export type ListenDestination = "home" | "queue" | "add" | "social" | "more";
export function ListenMobileWorkspaces({
  screen,
  account,
  accountNotice,
  room,
  liveRoom,
  items,
  onEnterTv,
}: ListenModeLayoutProps & {
  screen: ListenDestination;
  items: RoomQueueItem[];
  onEnterTv(): void;
}) {
  const [managingLibrary, setManagingLibrary] = useState(false);
  const [notice, setNotice] = useState("");
  const canManageLibrary =
    account.status === "signed-in" &&
    account.role === "owner" &&
    account.accountStatus === "active";
  const connected = liveRoom.connectionStatus === "connected";
  return (
    <>
      {screen === "social" && (
        <SocialInviteBar roomCode={room.code} inviteUrl={room.inviteUrl} />
      )}
      {screen !== "more" && (
        <h2>
          {screen === "queue"
            ? "Queue"
            : screen === "add"
              ? "Add music"
              : screen === "social"
                ? "People & chat"
                : "Room & account"}
        </h2>
      )}
      {screen === "queue" && (
        <QueuePanel
          presentation="watch-workspace"
          mode="listen"
          items={items}
          roomId={room.id}
          connectionStatus={liveRoom.connectionStatus}
          canAddQueue={liveRoom.canAddQueue}
          canLoadSource={liveRoom.canManageAuthority}
          canManageQueue={liveRoom.canManageQueue}
          onAddQueueItem={liveRoom.addQueueItem}
          onClearQueue={liveRoom.clearQueue}
          onMoveQueueItem={liveRoom.moveQueueItem}
          onPlayQueueItem={
            liveRoom.canControlPlayback ? liveRoom.playQueueItemNow : undefined
          }
          onQueueItemPriorityChange={liveRoom.setQueueItemPriority}
          onRemoveQueueItem={liveRoom.removeQueueItem}
          onQueueModeChange={liveRoom.setQueueMode}
          queueMode={liveRoom.snapshot.session?.queueMode ?? "normal"}
          roomErrors={liveRoom.snapshot.errors}
        />
      )}
      {screen === "add" && (
        <AddMediaDialog
          embedded
          open
          mode="listen"
          roomId={room.id}
          items={items}
          historyItems={items.filter((i) => i.status === "played")}
          canAddQueue={liveRoom.canAddQueue && connected}
          canLoadSource={liveRoom.canManageAuthority && connected}
          addDisabled={!liveRoom.canAddQueue || !connected}
          loadDisabled={!liveRoom.canManageAuthority || !connected}
          isConnected={connected}
          queueMode={liveRoom.snapshot.session?.queueMode ?? "normal"}
          notify={setNotice}
          onAddQueueItem={liveRoom.addQueueItem}
          onLoadSource={liveRoom.loadMediaSource}
          onClose={() => {}}
        />
      )}
      {screen === "social" && <SocialMembers room={room} liveRoom={liveRoom} />}
      {screen === "social" && (
        <div className="listen-social-chat">
          <RoomChatPanel
            participants={liveRoom.participants}
            messages={liveRoom.snapshot.chatMessages}
            currentMemberId={room.currentMember?.id}
            connectionStatus={liveRoom.connectionStatus}
            getMemberAccentColor={getMemberAccentColor}
            sendMessage={liveRoom.sendChatMessage}
          />
        </div>
      )}
      {screen === "more" && (
        <div className="listen-room-account">
          {managingLibrary && canManageLibrary ? (
            <>
              <button
                className="listen-text-button"
                onClick={() => setManagingLibrary(false)}
              >
                Back to room &amp; account
              </button>
              <MediaLibrary
                initialTab="uploads"
                isOwner
                items={items}
                roomId={room.id}
                canAddQueue={liveRoom.canAddQueue && connected}
                canLoadSource={liveRoom.canManageAuthority && connected}
                canManageQueue={liveRoom.canManageQueue && connected}
                onAddQueueItem={liveRoom.addQueueItem}
                onLoadSource={liveRoom.loadMediaSource}
                onPlayQueueItem={liveRoom.playQueueItemNow}
                onPlayNext={(id) =>
                  liveRoom.setQueueItemPriority(id, { isPlayNext: true })
                }
              />
            </>
          ) : (
            <WatchWorkspaces
              screen="more"
              room={{ ...room, mode: "listen" }}
              liveRoom={liveRoom}
              account={account}
              accountNotice={accountNotice}
              items={items}
              onClose={() => {}}
              onManage={() => setManagingLibrary(true)}
            />
          )}
        </div>
      )}
      {screen === "more" && !managingLibrary && (
        <button className="listen-text-button" onClick={onEnterTv}>
          Open TV mode
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
    </>
  );
}
