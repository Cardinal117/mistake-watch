import { AppShell } from "@/components/layout";
import type { DashboardRoomSummary } from "@/lib/rooms";
import { DashboardActionPanel } from "./dashboard-action-panel";
import { DashboardHero } from "./dashboard-hero";
import { DashboardLiveBackground } from "./dashboard-live-background";
import { DashboardNav } from "./dashboard-nav";
import { DashboardPanelFrame } from "./dashboard-panel-frame";
import { DashboardRoomNotice } from "./dashboard-room-notice";
import { DashboardTransitionComplete } from "./dashboard-transition-complete";
import { SavedRoomQuickLinks } from "./saved-room-quick-links";

type DashboardShellProps = {
  currentRoom: DashboardRoomSummary | null;
  recentRooms: DashboardRoomSummary[];
  roomNotice?: "closed" | "removed";
  savedRooms: DashboardRoomSummary[];
  statusMessage?: string;
  children?: React.ReactNode;
};

export function DashboardShell({
  children,
  currentRoom,
  recentRooms,
  roomNotice,
  savedRooms,
  statusMessage,
}: DashboardShellProps) {
  return (
    <AppShell className="relative isolate overflow-x-clip">
      <DashboardTransitionComplete />
      <DashboardLiveBackground />
      <DashboardNav />
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
