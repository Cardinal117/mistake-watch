import type { LiveRoomSnapshot } from "./types";

export const emptyLiveRoomSnapshot: LiveRoomSnapshot = {
  connection: {
    connected: false,
  },
  errors: [],
  kicks: [],
  chatMessages: [],
  participants: [],
  participantPresences: [],
  permissions: [],
  queue: [],
  roomRhythmProfile: null,
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
    participantPresences:
      partial.participantPresences ?? snapshot.participantPresences,
    permissions: partial.permissions ?? snapshot.permissions,
    queue: partial.queue ?? snapshot.queue,
    roomRhythmProfile: Object.hasOwn(partial, "roomRhythmProfile")
      ? (partial.roomRhythmProfile ?? null)
      : snapshot.roomRhythmProfile,
    session: partial.session ?? snapshot.session,
  };
}
