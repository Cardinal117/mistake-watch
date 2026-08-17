"use client";

import { useEffect, useState } from "react";
import {
  BookmarkCheck,
  Clock3,
  Headphones,
  RefreshCw,
  Users,
  Video,
} from "lucide-react";

import { Badge, PendingLink, buttonClassName } from "@/components/ui";
import type { AccountRoomSummary } from "@/lib/account/room-projection";

type AccountRoomsResponse = {
  error?: string;
  rooms?: AccountRoomSummary[];
};

export function AccountRoomsSection({ signedIn }: { signedIn: boolean }) {
  if (!signedIn) {
    return (
      <section className="rounded-md border border-white/10 bg-surface-container-lowest/42 p-5">
        <p className="technical-label text-primary-fixed-dim">Rooms</p>
        <h4 className="mt-2 text-headline-md font-semibold text-on-surface">
          Local room access
        </h4>
        <p className="mt-3 max-w-2xl text-body-md text-on-surface-variant">
          Guest rooms remain tied to this browser until you attach them to a
          signed-in account.
        </p>
      </section>
    );
  }

  return <SignedInAccountRooms />;
}

function SignedInAccountRooms() {
  const [rooms, setRooms] = useState<AccountRoomSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestRevision, setRequestRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRooms() {
      setError(null);

      try {
        const response = await fetch("/api/account/rooms", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as AccountRoomsResponse;

        if (!response.ok || !payload.rooms) {
          throw new Error(
            payload.error ?? "Account rooms could not be loaded.",
          );
        }

        setRooms(payload.rooms);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Account rooms could not be loaded.",
          );
        }
      }
    }

    void loadRooms();
    return () => controller.abort();
  }, [requestRevision]);

  return (
    <section aria-labelledby="account-rooms-heading" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="technical-label text-primary-fixed-dim">
            Account rooms
          </p>
          <h4
            className="mt-2 text-headline-md font-semibold text-on-surface"
            id="account-rooms-heading"
          >
            Your spaces
          </h4>
          <p className="mt-2 max-w-2xl text-label-sm text-on-surface-variant">
            Owned, saved, and previously joined rooms linked to this account.
          </p>
        </div>
        {rooms ? (
          <span className="technical-label text-on-surface-variant">
            {rooms.length} {rooms.length === 1 ? "room" : "rooms"}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-error/30 bg-error/10 p-4">
          <p className="text-label-sm text-error" role="alert">
            {error}
          </p>
          <button
            className={buttonClassName({ size: "sm", variant: "secondary" })}
            onClick={() => {
              setRooms(null);
              setRequestRevision((revision) => revision + 1);
            }}
            type="button"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Retry
          </button>
        </div>
      ) : rooms === null ? (
        <AccountRoomsLoading />
      ) : rooms.length === 0 ? (
        <div className="rounded-md border border-dashed border-white/10 bg-surface-container-lowest/42 p-5">
          <Users className="h-5 w-5 text-primary-fixed-dim" aria-hidden />
          <p className="mt-3 text-body-md font-semibold text-on-surface">
            No account rooms yet
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Create or join a room, then attach it to keep it available across
            signed-in devices.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/10 overflow-hidden rounded-md border border-white/10 bg-surface-container-lowest/42">
          {rooms.map((room) => (
            <AccountRoomRow key={room.id} room={room} />
          ))}
        </div>
      )}
    </section>
  );
}

function AccountRoomRow({ room }: { room: AccountRoomSummary }) {
  const ModeIcon = room.mode === "listen" ? Headphones : Video;
  const isOpen = room.status === "open";

  return (
    <article className="grid min-w-0 gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <ModeIcon
            className={
              room.mode === "listen"
                ? "h-4 w-4 shrink-0 text-secondary-fixed-dim"
                : "h-4 w-4 shrink-0 text-primary-fixed-dim"
            }
            aria-hidden
          />
          <h5 className="min-w-0 truncate text-body-md font-semibold text-on-surface">
            {room.name}
          </h5>
          <Badge tone={relationshipTone(room.relationship)}>
            {relationshipLabel(room.relationship)}
          </Badge>
          {room.isSaved ? (
            <BookmarkCheck
              aria-label="Saved room"
              className="h-4 w-4 text-primary-fixed-dim"
            />
          ) : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-label-sm text-on-surface-variant">
          <span className="capitalize">{room.mode} room</span>
          <span>{isOpen ? "Open" : "Closed"}</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {formatLastActive(room.lastActiveAt)}
          </span>
        </div>
      </div>
      {isOpen ? (
        <PendingLink
          className={buttonClassName({
            className: "w-full sm:w-auto",
            size: "sm",
            variant: "secondary",
          })}
          href={`/rooms/${room.id}`}
          loadingDetail="Opening the room with your account membership."
          loadingLabel="Opening room"
          tone={room.mode === "listen" ? "amber" : "cyan"}
        >
          Open
        </PendingLink>
      ) : (
        <Badge className="w-fit" tone="neutral">
          Closed
        </Badge>
      )}
    </article>
  );
}

function AccountRoomsLoading() {
  return (
    <div
      aria-label="Loading account rooms"
      className="grid gap-2"
      role="status"
    >
      {[0, 1, 2].map((row) => (
        <div
          className="h-20 animate-pulse rounded-md border border-white/10 bg-surface-container-lowest/42"
          key={row}
        />
      ))}
    </div>
  );
}

function relationshipLabel(relationship: AccountRoomSummary["relationship"]) {
  if (relationship === "owned") return "Owned";
  if (relationship === "saved") return "Saved";
  return "Joined";
}

function relationshipTone(relationship: AccountRoomSummary["relationship"]) {
  if (relationship === "owned") return "amber" as const;
  if (relationship === "saved") return "cyan" as const;
  return "neutral" as const;
}

function formatLastActive(value: string) {
  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    return "Activity unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(timestamp);
}
