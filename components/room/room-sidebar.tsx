"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { TabButton, TabsList } from "@/components/ui";
import {
  getSourceDisplayTitle,
  getYouTubeThumbnailUrl,
  parseYouTubeVideoId,
} from "@/lib/player/source";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { MembersPanel } from "./members-panel";
import { QueuePanel } from "./queue-panel";
import { RoomChatPanel } from "./room-chat-panel";

type RoomSidebarProps = {
  activeTab?: RoomTabId;
  liveRoom: LiveRoomState;
  onActiveTabChange?: (tab: RoomTabId) => void;
  room: RoomSnapshot;
};

export const roomTabs = [
  { id: "queue", label: "Queue" },
  { id: "members", label: "Members" },
  { id: "chat", label: "Chat" },
] as const;

export type RoomTabId = (typeof roomTabs)[number]["id"];

export function RoomSidebar({
  activeTab: controlledActiveTab,
  liveRoom,
  onActiveTabChange,
  room,
}: RoomSidebarProps) {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] =
    useState<RoomTabId>("queue");
  const [peoplePulse, setPeoplePulse] = useState(false);
  const panelNamespace = useId();
  const presencePrimed = useRef(false);
  const previousOnlineCount = useRef<number | null>(null);
  const activeTab = controlledActiveTab ?? uncontrolledActiveTab;

  const activeIndex = roomTabs.findIndex((tab) => tab.id === activeTab);
  const onlineParticipantCount = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  ).length;
  const controllerMemberId =
    liveRoom.participants.find((participant) => participant.isController)?.id ??
    null;
  const canLoadSource =
    liveRoom.canManageAuthority && liveRoom.connectionStatus === "connected";
  const participantsById = new Map(
    liveRoom.participants.map((participant) => [participant.id, participant]),
  );
  const liveQueueItems = liveRoom.snapshot.queue.map((item) => ({
    addedBy:
      participantsById.get(item.addedByMemberId)?.name ??
      (item.addedByMemberId ? "Guest" : "Room"),
    artist: item.artist ?? undefined,
    channelName: item.channelName ?? undefined,
    duration:
      typeof item.durationSeconds === "number"
        ? formatDuration(item.durationSeconds)
        : "Metadata pending",
    id: item.queueItemId,
    isPinned: item.isPinned,
    isPlayNext: item.isPlayNext,
    isUnavailable: item.isUnavailable,
    playlistId: item.playlistId ?? undefined,
    playlistTitle: item.playlistTitle ?? undefined,
    sourceType: item.sourceType,
    sourceUrl: item.sourceUrl,
    status:
      item.status === "playing"
        ? ("now" as const)
        : item.status === "played"
          ? ("played" as const)
          : ("queued" as const),
    thumbnailUrl:
      item.thumbnailUrl ??
      (item.sourceType === "youtube"
        ? (getYouTubeThumbnailUrl(item.sourceUrl) ?? undefined)
        : undefined),
    title: getSourceDisplayTitle({
      sourceType: item.sourceType,
      sourceUrl: item.sourceUrl,
      title: item.title,
    }),
    videoId:
      item.sourceType === "youtube"
        ? (parseYouTubeVideoId(item.sourceUrl) ?? undefined)
        : undefined,
  }));
  const queueItems =
    liveRoom.connectionStatus === "connected" ? liveQueueItems : room.queue;

  useEffect(() => {
    if (!presencePrimed.current) {
      previousOnlineCount.current = onlineParticipantCount;

      if (liveRoom.connectionStatus === "connected") {
        presencePrimed.current = true;
      }

      return;
    }

    if (previousOnlineCount.current === null) {
      previousOnlineCount.current = onlineParticipantCount;
      return;
    }

    if (onlineParticipantCount > previousOnlineCount.current) {
      setPeoplePulse(true);
      playJoinSound();
      const timer = window.setTimeout(() => setPeoplePulse(false), 1800);
      previousOnlineCount.current = onlineParticipantCount;
      return () => window.clearTimeout(timer);
    }

    previousOnlineCount.current = onlineParticipantCount;
  }, [liveRoom.connectionStatus, onlineParticipantCount]);

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex =
      (activeIndex + direction + roomTabs.length) % roomTabs.length;
    setActiveTab(roomTabs[nextIndex].id);
  }

  function setActiveTab(tab: RoomTabId) {
    onActiveTabChange?.(tab);
    setUncontrolledActiveTab(tab);
  }

  const activePanel = {
    chat: (
      <RoomChatPanel
        connectionStatus={liveRoom.connectionStatus}
        currentMemberId={room.currentMember?.id}
        messages={liveRoom.snapshot.chatMessages}
        participants={liveRoom.participants}
        sendMessage={liveRoom.sendChatMessage}
      />
    ),
    members: (
      <MembersPanel
        canManageAuthority={liveRoom.canManageAuthority}
        connectionStatus={liveRoom.connectionStatus}
        controllerMemberId={controllerMemberId}
        currentMemberId={room.currentMember?.id}
        errorMessage={liveRoom.errorMessage}
        grantControl={liveRoom.grantControl}
        onPermissionChange={liveRoom.setPermission}
        participants={liveRoom.participants}
        revokeControl={liveRoom.revokeControl}
        kickMember={liveRoom.kickMember}
        removeIdleMember={liveRoom.removeIdleMember}
      />
    ),
    queue: (
      <QueuePanel
        canAddQueue={liveRoom.canAddQueue}
        canLoadSource={canLoadSource}
        canManageQueue={liveRoom.canManageQueue}
        connectionStatus={liveRoom.connectionStatus}
        items={queueItems}
        mode={room.mode}
        onAddQueueItem={liveRoom.addQueueItem}
        onClearQueue={liveRoom.clearQueue}
        onLoadSource={liveRoom.loadMediaSource}
        onMoveQueueItem={liveRoom.moveQueueItem}
        onPlayQueueItem={liveRoom.playQueueItemNow}
        onQueueModeChange={liveRoom.setQueueMode}
        onQueueItemPriorityChange={liveRoom.setQueueItemPriority}
        onRemoveQueueItem={liveRoom.removeQueueItem}
        queueMode={liveRoom.snapshot.session?.queueMode ?? "normal"}
        roomId={room.id}
      />
    ),
  } satisfies Record<RoomTabId, ReactNode>;

  return (
    <aside className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] content-start overflow-hidden rounded-xl border border-white/10 bg-surface-container-lowest lg:sticky lg:top-0 lg:h-[calc(100vh-8rem)] lg:min-h-0 lg:rounded-none lg:border-y-0 lg:border-r-0">
      <TabsList className="hidden grid-cols-3 rounded-none border-0 border-b border-white/10 lg:grid">
        {roomTabs.map((tab) => (
          <TabButton
            active={activeTab === tab.id}
            aria-controls={`${panelNamespace}-${tab.id}-panel`}
            className={
              activeTab === tab.id && room.mode === "listen"
                ? "bg-secondary-fixed-dim/12 text-secondary-fixed-dim"
                : undefined
            }
            id={`${panelNamespace}-${tab.id}-tab`}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={handleTabKeyDown}
          >
            <span className="inline-flex min-w-0 items-center justify-center gap-2">
              <span>{tab.label}</span>
              {tab.id === "members" ? (
                <span
                  aria-label={`${onlineParticipantCount} people online`}
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-white/10 bg-surface-container-low px-1.5 text-[11px] font-semibold leading-none text-on-surface-variant transition ${
                    peoplePulse
                      ? "border-primary-fixed-dim/60 bg-primary-fixed-dim/15 text-primary-fixed-dim ring-2 ring-primary-fixed-dim/20"
                      : ""
                  }`}
                >
                  {onlineParticipantCount}
                </span>
              ) : null}
            </span>
          </TabButton>
        ))}
      </TabsList>

      <div
        aria-labelledby={`${panelNamespace}-${activeTab}-tab`}
        className="min-w-0 overflow-y-auto bg-surface-container-lowest p-4 lg:min-h-0 lg:pb-4 lg:pr-5"
        id={`${panelNamespace}-${activeTab}-panel`}
        role="tabpanel"
      >
        {activePanel[activeTab]}
      </div>
    </aside>
  );
}

function playJoinSound() {
  try {
    const AudioContextConstructor =
      window.AudioContext ?? window.webkitAudioContext;

    if (!AudioContextConstructor) {
      return;
    }

    const audioContext = new AudioContextConstructor();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, now);
    oscillator.frequency.exponentialRampToValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
    window.setTimeout(() => void audioContext.close(), 260);
  } catch {
    // Browsers can block audio without prior interaction; visual feedback remains.
  }
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
