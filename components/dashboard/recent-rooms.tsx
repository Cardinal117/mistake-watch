import type { DashboardRoomSummary } from "@/lib/rooms";
import { RoomRows } from "./room-rows";

type RecentRoomsProps = {
  rooms: DashboardRoomSummary[];
};

export function RecentRooms({ rooms }: RecentRoomsProps) {
  return (
    <RoomRows
      actionLabel="Create first room"
      description="Rooms you have recently hosted or joined appear here so you can get back in without digging through old invite links."
      emptyDescription="Once you create or join a room, Mistake Watch will keep a small local trail here for quick re-entry."
      emptyTitle="No recent rooms yet"
      rooms={rooms}
      title="Recent Rooms"
    />
  );
}
