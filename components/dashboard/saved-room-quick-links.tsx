import { BookmarkCheck, Clock3, Headphones, Video } from "lucide-react";

import { Badge, PendingLink } from "@/components/ui";
import type { DashboardRoomSummary } from "@/lib/rooms";

type SavedRoomQuickLinksProps = {
  recentRooms: DashboardRoomSummary[];
  savedRooms: DashboardRoomSummary[];
};

export function SavedRoomQuickLinks({
  recentRooms,
  savedRooms,
}: SavedRoomQuickLinksProps) {
  const fallbackRooms = recentRooms.filter(
    (room) => !savedRooms.some((savedRoom) => savedRoom.id === room.id),
  );
  const rooms = [...savedRooms, ...fallbackRooms].slice(0, 6);

  return (
    <div className="overflow-hidden border border-white/10 bg-transparent lg:border-0">
      <div className="border-b border-white/10 bg-surface/0 p-5">
        <Badge tone="neutral">Quick Links</Badge>
        <h2 className="mt-3 text-headline-md font-semibold text-on-surface">
          Saved spaces
        </h2>
        <p className="mt-2 text-body-md text-on-surface-variant">
          Saved rooms stay here even when idle. Recent rooms fill the gaps while
          your saved list is small.
        </p>
      </div>

      <div className="grid gap-2 p-3">
        {rooms.length > 0 ? (
          rooms.map((room) => <QuickRoomLink key={room.id} room={room} />)
        ) : (
          <div className="rounded-md border border-dashed border-white/10 bg-surface-container-low p-4">
            <BookmarkCheck
              className="h-5 w-5 text-primary-fixed-dim"
              aria-hidden
            />
            <p className="mt-3 text-body-md font-semibold text-on-surface">
              No saved rooms yet
            </p>
            <p className="mt-1 text-label-sm text-on-surface-variant">
              Save a room from its left rail to keep it available here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function QuickRoomLink({ room }: { room: DashboardRoomSummary }) {
  const Icon = room.mode === "listen" ? Headphones : Video;
  const active = room.participants > 0;

  return (
    <PendingLink
      className="group grid min-w-0 gap-2 rounded-md border border-white/10 bg-surface-container-low p-3 transition hover:border-primary-fixed-dim/45 hover:bg-surface-container"
      href={`/rooms/${room.id}`}
      loadingDetail="Opening the room and restoring your local session."
      loadingLabel="Joining room"
      tone={room.mode === "listen" ? "amber" : "cyan"}
    >
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="inline-flex min-w-0 items-center gap-2">
          <Icon
            className={
              room.mode === "listen"
                ? "h-4 w-4 shrink-0 text-secondary-fixed-dim"
                : "h-4 w-4 shrink-0 text-primary-fixed-dim"
            }
            aria-hidden
          />
          <span className="truncate text-label-sm font-semibold text-on-surface">
            {room.name}
          </span>
        </span>
        {room.isSaved ? (
          <BookmarkCheck
            className="h-4 w-4 shrink-0 text-primary-fixed-dim"
            aria-label="Saved room"
          />
        ) : null}
      </div>
      <div className="flex min-w-0 items-center justify-between gap-3 text-label-sm text-on-surface-variant">
        <span className="truncate">
          {active ? room.nowPlaying : room.updatedAt}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          {active ? "Live" : "Idle"}
        </span>
      </div>
    </PendingLink>
  );
}
