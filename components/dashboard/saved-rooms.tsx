import type { DashboardRoomSummary } from "@/lib/rooms";
import { RoomRows } from "./room-rows";

type SavedRoomsProps = {
  rooms: DashboardRoomSummary[];
};

export function SavedRooms({ rooms }: SavedRoomsProps) {
  return (
    <RoomRows
      actionLabel="Save a room"
      description="Reusable rooms for regular watch nights, listening sessions, or family invite links."
      emptyDescription="Saved rooms will become useful once room persistence is wired. For now, they model the dashboard layout and future workflow."
      emptyTitle="No saved rooms"
      rooms={rooms}
      title="Saved Rooms"
    />
  );
}
