import type { DashboardRoomSummary } from "@/lib/rooms";
import { RoomRows } from "./room-rows";

type SavedRoomsProps = {
  rooms: DashboardRoomSummary[];
};

export function SavedRooms({ rooms }: SavedRoomsProps) {
  return (
    <>
      {rooms.some((room) => room.kind === "personal") && (
        <RoomRows
          title="Personal"
          description="Your private room, across your devices."
          emptyTitle=""
          emptyDescription=""
          actionLabel="Open room"
          rooms={rooms.filter((room) => room.kind === "personal")}
        />
      )}
      {rooms.some((room) => room.kind === "shared") && (
        <RoomRows
          title="Shared"
          description="Your approved rooms, ready to return to."
          emptyTitle=""
          emptyDescription=""
          actionLabel="Open room"
          rooms={rooms.filter((room) => room.kind === "shared")}
        />
      )}
      {rooms.some((room) => room.kind === "themed") && (
        <RoomRows
          title="Themed"
          description="Rooms with an explicit direction."
          emptyTitle=""
          emptyDescription=""
          actionLabel="Open room"
          rooms={rooms.filter((room) => room.kind === "themed")}
        />
      )}
      <RoomRows
        actionLabel="Save a room"
        description="Reusable rooms for regular watch nights, listening sessions, or family invite links."
        emptyDescription="Save a room to keep it available here for your next session."
        emptyTitle="No saved rooms"
        removableSavedRooms
        groupLabel="Legacy"
        rooms={rooms.filter(
          (room) =>
            room.kind !== "personal" &&
            room.kind !== "shared" &&
            room.kind !== "themed" && room.kind !== "temporary",
        )}
        title="Saved Rooms"
      />
    </>
  );
}
