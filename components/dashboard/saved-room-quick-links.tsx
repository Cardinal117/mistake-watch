"use client";

import { useState } from "react";
import { BookmarkCheck, BookmarkX, Clock3, Headphones, Video } from "lucide-react";

import { Badge, PendingLink } from "@/components/ui";
import type { DashboardRoomSummary } from "@/lib/rooms";
import { setRoomSavedAction } from "@/lib/rooms/actions";

type SavedRoomQuickLinksProps = {
  recentRooms: DashboardRoomSummary[];
  savedRooms: DashboardRoomSummary[];
};

export function SavedRoomQuickLinks({
  recentRooms,
  savedRooms,
}: SavedRoomQuickLinksProps) {
  const [removedSavedRoomIds, setRemovedSavedRoomIds] = useState<Set<string>>(
    () => new Set(),
  );
  const visibleSavedRooms = savedRooms.filter(
    (room) => !removedSavedRoomIds.has(room.id),
  );
  const fallbackRooms = recentRooms.filter(
    (room) => !visibleSavedRooms.some((savedRoom) => savedRoom.id === room.id),
  );
  const rooms = [...visibleSavedRooms, ...fallbackRooms].slice(0, 6);

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
          rooms.map((room) => (
            <QuickRoomLink
              key={room.id}
              onRemoved={() =>
                setRemovedSavedRoomIds((current) => new Set(current).add(room.id))
              }
              room={room}
            />
          ))
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

function QuickRoomLink({
  onRemoved,
  room,
}: {
  onRemoved(): void;
  room: DashboardRoomSummary;
}) {
  const Icon = room.mode === "listen" ? Headphones : Video;
  const active = room.participants > 0;
  const [removing, setRemoving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function removeSavedRoom() {
    if (removing) {
      return;
    }

    setRemoving(true);
    setErrorMessage(null);

    try {
      const result = await setRoomSavedAction({
        roomId: room.id,
        saved: false,
      });

      if (!result.isSaved) {
        onRemoved();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Saved-room update failed.",
      );
    } finally {
      setRemoving(false);
    }
  }

  return (
    <article className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-white/10 bg-surface-container-low p-2 transition hover:border-primary-fixed-dim/45 hover:bg-surface-container">
      <PendingLink
        className="grid min-w-0 gap-2 rounded-sm px-1 py-1"
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
      {room.isSaved ? (
        <button
          aria-label={`Remove ${room.name} from saved spaces`}
          className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-white/10 text-on-surface-variant transition hover:border-error/35 hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
          disabled={removing}
          onClick={removeSavedRoom}
          title="Remove from saved spaces"
          type="button"
        >
          <BookmarkX className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
      {errorMessage ? (
        <p className="col-span-2 px-1 text-[11px] text-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </article>
  );
}
