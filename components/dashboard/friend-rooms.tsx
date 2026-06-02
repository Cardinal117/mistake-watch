import type { DashboardRoomSummary } from "@/lib/rooms";
import { RoomRows } from "./room-rows";

type FriendRoomsProps = {
  rooms: DashboardRoomSummary[];
};

export function FriendRooms({ rooms }: FriendRoomsProps) {
  return (
    <RoomRows
      description="Friends' open rooms are account and friending dependent, so this section stays visibly gated until that layer exists."
      emptyDescription="Sign-in, friendships, and privacy controls need to exist before Mistake Watch can show friends' rooms here."
      emptyTitle="Accounts required for friend rooms"
      gated
      rooms={rooms}
      title="Friends' Open Rooms"
    />
  );
}
