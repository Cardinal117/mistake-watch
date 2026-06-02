export type DashboardRoomSummary = {
  id: string;
  name: string;
  mode: "watch" | "listen" | "browse";
  participants: number;
  host: string;
  nowPlaying: string;
  privacy: "invite" | "friends";
  joinState: "joinable" | "rejoin" | "locked" | "account-required";
  updatedAt: string;
  duration?: string;
  isSaved?: boolean;
  roomCode?: string;
  sourceType?: "direct" | "hls" | "youtube";
  sourceUrl?: string;
  thumbnailUrl?: string;
};

export type RoomQueueItem = {
  id: string;
  title: string;
  addedBy: string;
  duration: string;
  status: "now" | "played" | "queued";
  artist?: string;
  channelName?: string;
  isPinned?: boolean;
  isPlayNext?: boolean;
  isUnavailable?: boolean;
  playlistId?: string;
  playlistTitle?: string;
  sourceType?: "direct" | "hls" | "youtube";
  sourceUrl?: string;
  thumbnailUrl?: string;
  videoId?: string;
};

export type RoomParticipant = {
  avatarKey?: string | null;
  id: string;
  name: string;
  role: "host" | "guest";
  status: "online" | "idle";
  isController?: boolean;
  permissions: {
    queue: boolean;
    playback: boolean;
    browser: boolean;
  };
};

export type RoomSnapshot = {
  id: string;
  name: string;
  code: string;
  inviteUrl?: string;
  isSaved: boolean;
  mode: "watch" | "listen";
  host: string;
  hostMemberId: string | null;
  currentMember: {
    avatarKey?: string | null;
    id: string;
    name: string;
    role: "host" | "guest";
  } | null;
  participants: number;
  nowPlaying: {
    title: string;
    source: string;
    elapsed: string;
    duration: string;
    resolution: string;
    latency: string;
    sync: string;
    artist?: string;
    album?: string;
    mood?: string;
  };
  queue: RoomQueueItem[];
  participantsList: RoomParticipant[];
};

export type DashboardData = {
  currentRoom: DashboardRoomSummary | null;
  recentRooms: DashboardRoomSummary[];
  savedRooms: DashboardRoomSummary[];
  friendRooms: DashboardRoomSummary[];
  statusMessage?: string;
};

export type RoomJoinPreview = {
  id: string;
  name: string;
  code?: string;
  mode: "watch" | "listen";
};
