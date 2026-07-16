export type RoomActivityDependencies = {
  findMember: (
    roomId: string,
    userId: string,
  ) => Promise<{ id: string } | null>;
  findOpenRoom: (
    roomId: string,
  ) => Promise<{ id: string; isSaved: boolean } | null>;
  getActiveAuthenticatedUserId: () => Promise<string | null>;
  now: () => Date;
  updateMemberLastSeen: (input: {
    memberId: string;
    roomId: string;
    seenAt: string;
    userId: string;
  }) => Promise<void>;
  updateRoomActivity: (input: {
    idleDeadlineAt: string | null;
    roomId: string;
    seenAt: string;
  }) => Promise<void>;
};

const ROOM_IDLE_TTL_MS = 60 * 60 * 1000;

export async function touchAccountRoomActivity(
  roomId: string,
  dependencies: RoomActivityDependencies,
) {
  const userId = await dependencies.getActiveAuthenticatedUserId();

  if (!userId) {
    return false;
  }

  const [room, member] = await Promise.all([
    dependencies.findOpenRoom(roomId),
    dependencies.findMember(roomId, userId),
  ]);

  if (!room || !member) {
    return false;
  }

  const now = dependencies.now();
  const seenAt = now.toISOString();
  const idleDeadlineAt = room.isSaved
    ? null
    : new Date(now.getTime() + ROOM_IDLE_TTL_MS).toISOString();

  await Promise.all([
    dependencies.updateMemberLastSeen({
      memberId: member.id,
      roomId: room.id,
      seenAt,
      userId,
    }),
    dependencies.updateRoomActivity({
      idleDeadlineAt,
      roomId: room.id,
      seenAt,
    }),
  ]);

  return true;
}
