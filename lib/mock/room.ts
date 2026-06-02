import type { RoomParticipant, RoomQueueItem, RoomSnapshot } from "@/lib/rooms";

export type RoomMock = RoomSnapshot;

export const roomMock = {
  id: "alpha-theatre",
  name: "Alpha Theatre",
  code: "ALPHA-17",
  mode: "watch",
  host: "Mistake Host",
  hostMemberId: "host",
  isSaved: false,
  currentMember: {
    id: "host",
    name: "Mistake Host",
    role: "host",
  },
  participants: 4,
  nowPlaying: {
    title: "Hyperion: The Final Horizon",
    source: "Direct HLS source",
    elapsed: "01:18:24",
    duration: "02:08:41",
    resolution: "1080p",
    latency: "24 ms",
    sync: "Server authority pending",
  },
  queue: [
    {
      id: "current",
      title: "Hyperion: The Final Horizon",
      addedBy: "Mistake Host",
      duration: "02:08:41",
      status: "now",
    },
    {
      id: "signal-cut",
      title: "Signal Cut: Episode 4",
      addedBy: "Mira",
      duration: "48:12",
      status: "queued",
    },
    {
      id: "moon-test",
      title: "Moon Test Reel",
      addedBy: "Theo",
      duration: "12:30",
      status: "queued",
    },
  ] satisfies RoomQueueItem[],
  participantsList: [
    {
      id: "host",
      name: "Mistake Host",
      role: "host",
      status: "online",
      permissions: {
        queue: true,
        playback: true,
        browser: true,
      },
    },
    {
      id: "mira",
      name: "Mira",
      role: "guest",
      status: "online",
      permissions: {
        queue: true,
        playback: false,
        browser: false,
      },
    },
    {
      id: "theo",
      name: "Theo",
      role: "guest",
      status: "online",
      permissions: {
        queue: true,
        playback: false,
        browser: false,
      },
    },
    {
      id: "nia",
      name: "Nia",
      role: "guest",
      status: "idle",
      permissions: {
        queue: true,
        playback: false,
        browser: false,
      },
    },
  ] satisfies RoomParticipant[],
} satisfies RoomMock;
