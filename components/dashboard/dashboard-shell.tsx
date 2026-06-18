import { AppShell } from "@/components/layout";
import { getAccountSummary } from "@/lib/account/server";
import type { DashboardRoomSummary } from "@/lib/rooms";
import { DashboardActionPanel } from "./dashboard-action-panel";
import { DashboardHero } from "./dashboard-hero";
import { DashboardLiveBackground } from "./dashboard-live-background";
import { DashboardNav } from "./dashboard-nav";
import { DashboardPanelFrame } from "./dashboard-panel-frame";
import { DashboardRoomNotice } from "./dashboard-room-notice";
import { DashboardTransitionComplete } from "./dashboard-transition-complete";
import { DashboardUrlCleanup } from "./dashboard-url-cleanup";
import { SavedRoomQuickLinks } from "./saved-room-quick-links";

type DashboardShellProps = {
  cleanUrlOnHydrate?: boolean;
  currentRoom: DashboardRoomSummary | null;
  recentRooms: DashboardRoomSummary[];
  roomNotice?: "closed" | "removed";
  savedRooms: DashboardRoomSummary[];
  statusMessage?: string;
  children?: React.ReactNode;
};

export async function DashboardShell({
  children,
  cleanUrlOnHydrate,
  currentRoom,
  recentRooms,
  roomNotice,
  savedRooms,
  statusMessage,
}: DashboardShellProps) {
  const account = await getAccountSummary();

  return (
    <AppShell className="relative isolate overflow-x-clip">
      <DashboardTransitionComplete />
      <DashboardUrlCleanup enabled={cleanUrlOnHydrate} />
      <DashboardLiveBackground />
      <DashboardNav account={account} />
      <DashboardRoomNotice notice={roomNotice} />
      {children ? (
        <DashboardPanelFrame
          leftPanel={
            <SavedRoomQuickLinks
              recentRooms={recentRooms}
              savedRooms={savedRooms}
            />
          }
          rightPanel={<DashboardActionPanel />}
        >
          <>
            <DashboardHero
              currentRoom={currentRoom}
              statusMessage={statusMessage}
            />
            {children}
          </>
        </DashboardPanelFrame>
      ) : null}
    </AppShell>
  );
}
