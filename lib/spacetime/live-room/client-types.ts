import type { QueueMode } from "@/lib/queue/model";
import type { RoomParticipant } from "@/lib/rooms";
import type { SpacetimeConnectionStatus } from "../adapter";
import type {
  LiveQueueItem as GeneratedLiveQueueItem,
  RoomChatMessage as GeneratedRoomChatMessage,
  RoomError as GeneratedRoomError,
  RoomKick as GeneratedRoomKick,
  RoomParticipant as GeneratedRoomParticipant,
  RoomPermission as GeneratedRoomPermission,
  RoomSession as GeneratedRoomSession,
} from "../generated/types";
import type { LiveRoomSnapshot } from "../types";

type TableRowCallback<Row> = (ctx: unknown, row: Row) => void;
type TableDeleteCallback<Row> = (ctx: unknown, row: Row) => void;
type TableUpdateCallback<Row> = (
  ctx: unknown,
  oldRow: Row,
  newRow: Row,
) => void;

type ClientTable<Row> = {
  iter(): Iterable<Row>;
  onDelete(callback: TableDeleteCallback<Row>): void;
  onInsert(callback: TableRowCallback<Row>): void;
  onUpdate(callback: TableUpdateCallback<Row>): void;
  removeOnDelete(callback: TableDeleteCallback<Row>): void;
  removeOnInsert(callback: TableRowCallback<Row>): void;
  removeOnUpdate(callback: TableUpdateCallback<Row>): void;
};

export type LiveDb = {
  live_queue_item: ClientTable<GeneratedLiveQueueItem>;
  room_chat_message: ClientTable<GeneratedRoomChatMessage>;
  room_error: ClientTable<GeneratedRoomError>;
  room_kick: ClientTable<GeneratedRoomKick>;
  room_participant: ClientTable<GeneratedRoomParticipant>;
  room_permission: ClientTable<GeneratedRoomPermission>;
  room_session: ClientTable<GeneratedRoomSession>;
};

export type LiveReducers = {
  addQueueItem(params: {
    actorMemberId: string;
    artist: string;
    channelName?: string;
    durationSeconds?: number;
    isPinned: boolean;
    isPlayNext: boolean;
    isUnavailable: boolean;
    allowDuplicate?: boolean;
    playlistId?: string;
    playlistTitle?: string;
    roomId: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
    thumbnailUrl?: string;
  }): Promise<void>;
  advanceQueueItem(params: {
    actorMemberId: string;
    autoplay?: boolean;
    expectedActiveQueueItemId?: string;
    expectedSourceUrl?: string;
    roomId: string;
  }): Promise<void>;
  advanceUploadedQueueItem(params: {
    actorMemberId: string;
    autoplay?: boolean;
    expectedActiveQueueItemId?: string;
    expectedNextQueueItemId: string;
    expectedSourceUrl?: string;
    resolvedSourceUrl: string;
    roomId: string;
  }): Promise<void>;
  clearQueue(params: { actorMemberId: string; roomId: string }): Promise<void>;
  grantRoomControl(params: {
    actorMemberId: string;
    roomId: string;
    targetMemberId: string;
  }): Promise<void>;
  heartbeat(params: { memberId: string; roomId: string }): Promise<void>;
  joinRoom(params: {
    avatarKey?: string;
    displayName: string;
    memberId: string;
    role: "host" | "guest";
    roomId: string;
  }): Promise<void>;
  kickMember(params: {
    actorMemberId: string;
    roomId: string;
    targetMemberId: string;
  }): Promise<void>;
  leaveRoom(params: { memberId: string; roomId: string }): Promise<void>;
  loadMediaSource(params: {
    actorMemberId: string;
    roomId: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): Promise<void>;
  moveQueueItem(params: {
    actorMemberId: string;
    position: number;
    queueItemId: string;
    roomId: string;
  }): Promise<void>;
  playQueueItem(params: {
    actorMemberId: string;
    queueItemId: string;
    roomId: string;
  }): Promise<void>;
  playUploadedQueueItem(params: {
    actorMemberId: string;
    queueItemId: string;
    resolvedSourceUrl: string;
    roomId: string;
  }): Promise<void>;
  removeQueueItem(params: {
    actorMemberId: string;
    queueItemId: string;
    roomId: string;
  }): Promise<void>;
  removeIdleMember(params: {
    actorMemberId: string;
    roomId: string;
    targetMemberId: string;
  }): Promise<void>;
  revokeRoomControl(params: {
    actorMemberId: string;
    roomId: string;
  }): Promise<void>;
  sendRoomChatMessage(params: {
    actorMemberId: string;
    clientMessageId: string;
    roomId: string;
    text: string;
  }): Promise<void>;
  seedRoomSession(params: {
    hostMemberId: string;
    mode: "watch" | "listen" | "browser";
    roomId: string;
    roomName: string;
    seedToken: string;
  }): Promise<void>;
  reportMediaFailure(params: {
    actorMemberId: string;
    allowAutoplayAdvance?: boolean;
    expectedActiveQueueItemId?: string;
    expectedSourceUrl: string;
    failureCode: string;
    roomId: string;
  }): Promise<void>;
  setMemberPermissions(params: {
    actorMemberId: string;
    canAddQueue: boolean;
    canControlBrowser: boolean;
    canControlPlayback: boolean;
    canManageQueue: boolean;
    roomId: string;
    targetMemberId: string;
  }): Promise<void>;
  setPlaybackState(params: {
    actorMemberId: string;
    playbackRate: number;
    positionSeconds: number;
    roomId: string;
    status: "buffering" | "ended" | "error" | "paused" | "playing";
  }): Promise<void>;
  setQueueAutoplay(params: {
    actorMemberId: string;
    enabled: boolean;
    roomId: string;
  }): Promise<void>;
  setQueueItemPriority(params: {
    actorMemberId: string;
    isPinned: boolean;
    isPlayNext: boolean;
    queueItemId: string;
    roomId: string;
  }): Promise<void>;
  setQueueMode(params: {
    actorMemberId: string;
    mode: QueueMode;
    roomId: string;
  }): Promise<void>;
  updateMediaTitle(params: {
    actorMemberId: string;
    durationSeconds?: number;
    roomId: string;
    sourceTitle: string;
  }): Promise<void>;
  updateRoomMode(params: {
    actorMemberId: string;
    mode: "watch" | "listen";
    roomId: string;
  }): Promise<void>;
  updateRoomName(params: {
    actorMemberId: string;
    roomId: string;
    roomName: string;
  }): Promise<void>;
};

export type LiveRoomState = {
  addQueueItem(input: {
    artist?: string;
    channelName?: string;
    durationSeconds?: number;
    isPinned?: boolean;
    isPlayNext?: boolean;
    isUnavailable?: boolean;
    allowDuplicate?: boolean;
    playlistId?: string;
    playlistTitle?: string;
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
    thumbnailUrl?: string;
  }): void;
  canAddQueue: boolean;
  canManageAuthority: boolean;
  canManageQueue: boolean;
  canControlPlayback: boolean;
  clearQueue(): void;
  advanceToNextQueueItem(input?: { autoplay?: boolean }): void;
  connectionStatus: SpacetimeConnectionStatus;
  errorMessage: string | null;
  grantControl(memberId: string): void;
  kickMember(memberId: string): void;
  loadMediaSource(input: {
    sourceTitle: string;
    sourceType: "direct" | "hls" | "youtube";
    sourceUrl: string;
  }): void;
  moveQueueItem(queueItemId: string, position: number): void;
  participants: RoomParticipant[];
  playQueueItemNow(queueItemId: string): void;
  playQueueItem(queueItemId: string): void;
  removalNotice: string | null;
  removeIdleMember(memberId: string): void;
  removeQueueItem(queueItemId: string): void;
  reportMediaFailure(input: {
    allowAutoplayAdvance: boolean;
    failureCode: string;
  }): void;
  renameRoom(roomName: string): Promise<void>;
  revokeControl(): void;
  sendChatMessage(input: {
    clientMessageId: string;
    text: string;
  }): Promise<void>;
  switchMode(mode: "listen" | "watch"): Promise<void>;
  setPermission(
    memberId: string,
    permission: keyof RoomParticipant["permissions"],
    value: boolean,
  ): void;
  setPlaybackState(input: {
    playbackRate?: number;
    positionSeconds: number;
    status: "buffering" | "ended" | "error" | "paused" | "playing";
  }): void;
  setQueueAutoplay(enabled: boolean): void;
  setQueueItemPriority(
    queueItemId: string,
    input: { isPinned?: boolean; isPlayNext?: boolean },
  ): void;
  setQueueMode(mode: QueueMode): void;
  updateMediaTitle(sourceTitle: string, durationSeconds?: number): void;
  snapshot: LiveRoomSnapshot;
};
