import { DashboardLiveSections, DashboardShell } from "@/components/dashboard";
import { getDashboardData } from "@/lib/rooms";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const [{ error, notice }, dashboardData] = await Promise.all([
    searchParams,
    getDashboardData(),
  ]);
  const statusMessage = error
    ? decodeURIComponent(error)
    : notice === "room-unavailable"
      ? "This room is unavailable to this session. Sign in to the owning account for your Personal room, or check your room invitation."
      : notice === "room-connection-failed"
        ? "Your live room connection could not be restored. Reopen the room to reconnect."
        : dashboardData.statusMessage;

  return (
    <DashboardShell
      cleanUrlOnHydrate={
        !["temporary-room-expired", "room-ended"].includes(notice ?? "") &&
        Boolean(error || notice)
      }
      currentRoom={dashboardData.currentRoom}
      recentRooms={dashboardData.recentRooms}
      roomNotice={
        notice === "room-ended"
          ? "ended"
          : notice === "temporary-room-expired"
            ? "temporary-expired"
            : notice === "room-closed"
              ? "closed"
              : notice === "removed-from-room"
                ? "removed"
                : undefined
      }
      savedRooms={dashboardData.savedRooms}
      statusMessage={statusMessage}
    >
      <DashboardLiveSections initialData={dashboardData} />
    </DashboardShell>
  );
}
