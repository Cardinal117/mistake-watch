import { AppShell } from "@/components/layout";
import type { AccountSummary } from "@/lib/account/types";
import type { RoomSnapshot } from "@/lib/rooms";
import { RoomExperience } from "./room-experience";

type RoomShellProps = {
  account: AccountSummary;
  accountNotice?: "guest-room-attached";
  room: RoomSnapshot;
};

export function RoomShell({ account, accountNotice, room }: RoomShellProps) {
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
