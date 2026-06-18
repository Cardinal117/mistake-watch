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
    : dashboardData.statusMessage;

  return (
    <DashboardShell
      cleanUrlOnHydrate={Boolean(error || notice)}
      currentRoom={dashboardData.currentRoom}
      recentRooms={dashboardData.recentRooms}
      roomNotice={
        notice === "room-closed"
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
