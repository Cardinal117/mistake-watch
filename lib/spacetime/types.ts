export type LiveRoomMode = "watch" | "listen" | "browser";
export type LivePlaybackStatus =
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";

export type LiveRoomSession = {
  roomId: string;
  supabaseRoomId: string;
  mode: LiveRoomMode;
  status: LivePlaybackStatus;
  positionSeconds: number;
  playbackRate: number;
  queueAutoplayEnabled: boolean;
  queueMode: "autoplayRelated" | "loop" | "normal" | "shuffle" | "smartShuffle";
  serverUpdatedMs: number;
  roomName: string;
  sourceTitle: string | null;
  sourceType: "direct" | "hls" | "youtube" | null;
  sourceUrl: string | null;
  sourceDurationSeconds: number | null;
  hostMemberId: string;
  controllerIdentity: string | null;
  activeQueueItemId: string | null;
};

export type LiveParticipant = {
  avatarKey: string | null;
  participantKey: string;
  roomId: string;
  memberId: string;
  displayName: string;
  identity: string;
  role: "host" | "guest";
  status: "online" | "idle";
  lastSeenMs: number;
};

export type LivePermission = {
  permissionKey: string;
  roomId: string;
  memberId: string;
  canAddQueue: boolean;
  canControlPlayback: boolean;
  canControlBrowser: boolean;
  updatedByMemberId: string;
  updatedMs: number;
};

export type LiveQueueItem = {
  queueItemId: string;
  roomId: string;
  position: number;
  sourceType: "direct" | "hls" | "youtube";
  sourceUrl: string;
  thumbnailUrl: string | null;
  title: string | null;
  artist: string | null;
  channelName: string | null;
  durationSeconds: number | null;
  isPinned: boolean;
  isPlayNext: boolean;
  isUnavailable: boolean;
  playlistId: string | null;
  playlistTitle: string | null;
  addedByMemberId: string;
  status: "queued" | "playing" | "played" | "removed";
};

export type LiveRoomError = {
  errorId: string;
  roomId: string;
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  createdMs: number;
};

export type LiveRoomKick = {
  actorMemberId: string;
  createdMs: number;
  kickKey: string;
  memberId: string;
  roomId: string;
};

export type LiveChatMessage = {
  avatarKey: string | null;
  clientMessageId: string;
  createdMs: number;
  displayName: string;
  isHost: boolean;
  memberId: string;
  messageId: string;
  roomId: string;
  text: string;
};

export type LiveRoomSnapshot = {
  session: LiveRoomSession | null;
  participants: LiveParticipant[];
  permissions: LivePermission[];
  queue: LiveQueueItem[];
  chatMessages: LiveChatMessage[];
  errors: LiveRoomError[];
  kicks: LiveRoomKick[];
  connection: {
    connected: boolean;
    lastError?: string;
  };
};

export type JoinRoomReducerPayload = {
  avatarKey?: string;
  roomId: string;
  memberId: string;
  displayName: string;
  role: "host" | "guest";
};

export type SeedRoomSessionPayload = {
  roomId: string;
  hostMemberId: string;
  mode: LiveRoomMode;
  roomName: string;
};

export type SetMemberPermissionsPayload = {
  actorMemberId: string;
  roomId: string;
  targetMemberId: string;
  canAddQueue: boolean;
  canControlPlayback: boolean;
  canControlBrowser: boolean;
};

export type GrantRoomControlPayload = {
  actorMemberId: string;
  roomId: string;
  targetMemberId: string;
};

export type RevokeRoomControlPayload = {
  actorMemberId: string;
  roomId: string;
};

export type LoadMediaSourcePayload = {
  actorMemberId: string;
  roomId: string;
  sourceTitle: string;
  sourceType: "direct" | "hls" | "youtube";
  sourceUrl: string;
  thumbnailUrl?: string;
};

export type SetPlaybackStatePayload = {
  actorMemberId: string;
  playbackRate: number;
  positionSeconds: number;
  roomId: string;
  status: LivePlaybackStatus;
};

export type UpdateMediaTitlePayload = {
  actorMemberId: string;
  durationSeconds?: number;
  roomId: string;
  sourceTitle: string;
};

export type UpdateRoomNamePayload = {
  actorMemberId: string;
  roomId: string;
  roomName: string;
};

export type UpdateRoomModePayload = {
  actorMemberId: string;
  mode: LiveRoomMode;
  roomId: string;
};

export type AddQueueItemPayload = {
  actorMemberId: string;
  artist: string;
  channelName?: string;
  durationSeconds?: number;
  isPinned: boolean;
  isPlayNext: boolean;
  isUnavailable: boolean;
  playlistId?: string;
  playlistTitle?: string;
  roomId: string;
  sourceTitle: string;
  sourceType: "direct" | "hls" | "youtube";
  sourceUrl: string;
};

export type QueueItemReducerPayload = {
  actorMemberId: string;
  queueItemId: string;
  roomId: string;
};

export type MoveQueueItemPayload = QueueItemReducerPayload & {
  position: number;
};
