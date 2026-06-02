import { AppShell } from "@/components/layout";
import type { RoomSnapshot } from "@/lib/rooms";
import { RoomExperience } from "./room-experience";

type RoomShellProps = {
  room: RoomSnapshot;
};

export function RoomShell({ room }: RoomShellProps) {
  return (
    <AppShell className="overflow-x-hidden bg-surface-container-lowest pb-44 md:pb-32 lg:pb-0">
      <RoomExperience room={room} />
    </AppShell>
  );
}
