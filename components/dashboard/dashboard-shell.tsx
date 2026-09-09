import { CreateRoomForm } from "./create-room-form";
import { TemporaryRoomNotice } from "../room/shared/temporary-room-notice";
import { ThemedRoomEntry } from "./themed-room-entry";
import { SharedRoomEntry } from "./shared-room-entry";
import { PersonalRoomEntry } from "./personal-room-entry";
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
  roomNotice?: "closed" | "removed" | "temporary-expired" | "ended";
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
      {roomNotice !== "temporary-expired" && roomNotice !== "ended" && (
        <DashboardRoomNotice notice={roomNotice} />
      )}
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
            {(roomNotice === "temporary-expired" || roomNotice === "ended") && (
              <DashboardRoomNotice notice={roomNotice} />
            )}
            {process.env.PERSONAL_ROOMS_ENABLED === "true" && (
              <PersonalRoomEntry account={account} />
            )}
            {process.env.SHARED_ROOMS_ENABLED === "true" &&
              account.status === "signed-in" &&
              account.accountStatus === "active" &&
              !account.isAnonymous && <SharedRoomEntry />}
            {process.env.THEMED_ROOMS_ENABLED === "true" &&
              account.status === "signed-in" &&
              account.accountStatus === "active" &&
              !account.isAnonymous && <ThemedRoomEntry />}
            {process.env.TEMPORARY_ROOMS_ENABLED === "true" &&
              (account.status !== "signed-in" ||
                account.accountStatus === "active") && (
                <details className="rounded-xl border border-white/10 bg-surface-container/70 p-4">
                  <summary className="cursor-pointer font-semibold">
                    Temporary room
                  </summary>
                  <div className="mt-3 grid gap-3">
                    <TemporaryRoomNotice />
                    <CreateRoomForm temporary />
                  </div>
                </details>
              )}
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
