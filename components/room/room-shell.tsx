import { AppShell } from "@/components/layout";
import { getAccountSummary } from "@/lib/account/server";
import type { RoomSnapshot } from "@/lib/rooms";
import { RoomExperience } from "./room-experience";

type RoomShellProps = {
  accountNotice?: "guest-room-attached";
  room: RoomSnapshot;
};

export async function RoomShell({ accountNotice, room }: RoomShellProps) {
  const account = await getAccountSummary();

  return (
    <AppShell className="overflow-x-hidden bg-surface-container-lowest pb-44 md:pb-32 lg:pb-0">
      <RoomExperience
        account={account}
        accountNotice={accountNotice}
        room={room}
      />
    </AppShell>
  );
}
