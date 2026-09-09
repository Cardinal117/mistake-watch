"use client";

import { AccountRoomListView } from "@/components/account/account-room-list-view";
import { SavedRooms } from "@/components/dashboard/saved-rooms";
import type { AccountRoomSummary } from "@/lib/account/room-projection";
import type { DashboardRoomSummary } from "@/lib/rooms";

const rooms: AccountRoomSummary[] = [
  {
    id: "28000000-0000-4000-8000-000000000011",
    name: "Friday Night",
    kind: "legacy",
    mode: "listen",
    isSaved: true,
    lastActiveAt: "2026-09-08T10:00:00Z",
    privacy: "invite",
    relationship: "owned",
    status: "open",
  },
  {
    id: "28000000-0000-4000-8000-000000000012",
    name: "A long room name for friends and family watching together",
    kind: "legacy",
    mode: "watch",
    isSaved: false,
    lastActiveAt: "2026-09-08T09:00:00Z",
    privacy: "invite",
    relationship: "joined",
    status: "open",
  },
  {
    id: "28000000-0000-4000-8000-000000000013",
    name: "Last weekend",
    kind: "legacy",
    mode: "watch",
    isSaved: true,
    lastActiveAt: "2026-09-07T09:00:00Z",
    privacy: "invite",
    relationship: "owned",
    status: "closed",
  },
];
const saved: DashboardRoomSummary[] = rooms
  .filter((room) => room.isSaved && room.status === "open")
  .map((room) => ({
    ...room,
    participants: 0,
    host: "You",
    nowPlaying: "Open room to resume playback",
    joinState: "rejoin",
    updatedAt: "Last active today",
  }));

export function LegacyRoomsQaFixture() {
  return (
    <main className="mx-auto grid max-w-6xl gap-8 p-4 md:p-8">
      <h1 className="text-headline-md font-semibold text-on-surface">
        Legacy rooms · local QA
      </h1>
      <SavedRooms rooms={saved} />
      <section aria-label="Account rooms" className="grid gap-4">
        <h2 className="text-headline-md font-semibold text-on-surface">
          Account rooms
        </h2>
        <AccountRoomListView rooms={rooms} onChanged={() => {}} />
      </section>
    </main>
  );
}
