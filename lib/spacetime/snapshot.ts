import type { LiveRoomSnapshot } from "./types";

export const emptyLiveRoomSnapshot: LiveRoomSnapshot = {
  connection: {
    connected: false,
  },
  errors: [],
  kicks: [],
  chatMessages: [],
  participants: [],
  permissions: [],
  queue: [],
  session: null,
};

export function mergeLiveRoomSnapshot(
  snapshot: LiveRoomSnapshot,
  partial: Partial<LiveRoomSnapshot>,
): LiveRoomSnapshot {
  return {
    connection: partial.connection ?? snapshot.connection,
    errors: partial.errors ?? snapshot.errors,
    kicks: partial.kicks ?? snapshot.kicks,
    chatMessages: partial.chatMessages ?? snapshot.chatMessages,
    participants: partial.participants ?? snapshot.participants,
    permissions: partial.permissions ?? snapshot.permissions,
    queue: partial.queue ?? snapshot.queue,
    session: partial.session ?? snapshot.session,
  };
}
