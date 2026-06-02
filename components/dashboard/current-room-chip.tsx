import { Users, Video } from "lucide-react";
import { PendingLink } from "@/components/ui";
import type { DashboardRoomSummary } from "@/lib/rooms";

type CurrentRoomChipProps = {
  room: DashboardRoomSummary;
};

export function CurrentRoomChip({ room }: CurrentRoomChipProps) {
  return (
    <PendingLink
      className="hidden rounded-lg border border-primary-fixed-dim/25 bg-surface-container/80 px-3 py-2 backdrop-blur-xl transition hover:border-primary-fixed-dim/50 lg:flex"
      href={`/rooms/${room.id}`}
      loadingDetail="Opening the room and restoring your local session."
      loadingLabel="Joining room"
      tone={room.mode === "listen" ? "amber" : "cyan"}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md border border-white/10 bg-surface-container-high">
          {room.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external metadata; Next image optimization is deferred until media storage/provider policy is finalized.
            <img
              alt=""
              className="h-full w-full object-cover"
              fetchPriority="high"
              loading="eager"
              src={room.thumbnailUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-primary-fixed-dim">
              <Video className="h-4 w-4" aria-hidden />
            </div>
          )}
        </div>
        <div>
          <p className="technical-label leading-none text-on-surface-variant">
            Current Room
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-label-sm font-bold text-primary-fixed-dim">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {room.name}
          </p>
        </div>
      </div>
    </PendingLink>
  );
}
