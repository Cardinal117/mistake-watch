"use client";

import { useState } from "react";
import {
  BookmarkX,
  Headphones,
  Lock,
  Monitor,
  Play,
  Radio,
  Users,
  Video,
} from "lucide-react";
import { Badge, Button, Panel, PendingLink, buttonClassName } from "@/components/ui";
import { cx } from "@/lib/ui";
import type { DashboardRoomSummary } from "@/lib/rooms";
import { setRoomSavedAction } from "@/lib/rooms/actions";
import { DashboardYouTubeMetadata } from "./dashboard-youtube-metadata";

type RoomRowsProps = {
  title: string;
  description: string;
  rooms: DashboardRoomSummary[];
  emptyTitle: string;
  emptyDescription: string;
  actionLabel?: string;
  gated?: boolean;
  removableSavedRooms?: boolean;
};

const modeConfig = {
  watch: {
    activeDot: "bg-primary-fixed-dim shadow-[0_0_16px_rgb(0_219_233_/_0.7)]",
    headerFx:
      "bg-[radial-gradient(circle_at_20%_20%,rgb(0_219_233_/_0.14),transparent_34%),linear-gradient(135deg,rgb(255_255_255_/_0.06),transparent_55%)]",
    icon: Video,
    label: "Watch",
    tone: "cyan" as const,
  },
  listen: {
    activeDot:
      "bg-secondary-fixed-dim shadow-[0_0_16px_rgb(255_186_32_/_0.55)]",
    headerFx:
      "bg-[radial-gradient(circle_at_20%_20%,rgb(255_186_32_/_0.13),transparent_34%),linear-gradient(135deg,rgb(255_255_255_/_0.05),transparent_55%)]",
    icon: Headphones,
    label: "Listen",
    tone: "amber" as const,
  },
  browse: {
    activeDot: "bg-outline",
    headerFx:
      "bg-[linear-gradient(135deg,rgb(255_255_255_/_0.06),transparent_55%)]",
    icon: Monitor,
    label: "Browse",
    tone: "neutral" as const,
  },
};

const lockedHeaderFx =
  "bg-[linear-gradient(135deg,rgb(255_255_255_/_0.05),transparent_55%)]";

function joinLabel(room: DashboardRoomSummary) {
  if (room.joinState === "rejoin") {
    return "Rejoin";
  }

  if (room.joinState === "account-required") {
    return "Needs Account";
  }

  if (room.joinState === "locked") {
    return "Invite Only";
  }

  return "Join";
}

function privacyLabel(room: DashboardRoomSummary) {
  return room.privacy === "friends" ? "Friends" : "Invite";
}

function RoomCard({
  onRemoved,
  removableSavedRooms = false,
  room,
}: {
  onRemoved?(): void;
  removableSavedRooms?: boolean;
  room: DashboardRoomSummary;
}) {
  const config = modeConfig[room.mode];
  const ModeIcon = config.icon;
  const disabled =
    room.joinState === "account-required" || room.joinState === "locked";
  const active = room.participants > 0;
  const [removingSavedRoom, setRemovingSavedRoom] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  async function removeSavedRoom() {
    if (removingSavedRoom) {
      return;
    }

    setRemovingSavedRoom(true);
    setRemoveError(null);

    try {
      const result = await setRoomSavedAction({
        roomId: room.id,
        saved: false,
      });

      if (!result.isSaved) {
        onRemoved?.();
      }
    } catch (error) {
      setRemoveError(
        error instanceof Error ? error.message : "Saved-room update failed.",
      );
    } finally {
      setRemovingSavedRoom(false);
    }
  }

  return (
    <Panel
      className={cx(
        "group flex min-h-[16rem] flex-col justify-between gap-5 overflow-hidden p-0 transition duration-300",
        active
          ? "border-primary-fixed-dim/45 shadow-[0_0_32px_rgb(0_219_233_/_0.16)]"
          : "",
      )}
    >
      <div className="relative min-h-32 overflow-hidden border-b border-white/10 bg-surface-container-high p-5">
        {room.thumbnailUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- Provider thumbnails are external metadata; Next image optimization is deferred until media storage/provider policy is finalized. */}
            <img
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-55 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-70"
              src={room.thumbnailUrl}
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(14_14_15_/_0.35),rgb(14_14_15_/_0.9)),linear-gradient(to_right,rgb(14_14_15_/_0.65),transparent)]"
            />
          </>
        ) : null}
        {active ? (
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(0_219_233_/_0.9),transparent)]"
          />
        ) : null}
        <div
          aria-hidden
          className={cx(
            "absolute inset-0 opacity-80 transition duration-300 group-hover:opacity-100",
            disabled ? lockedHeaderFx : config.headerFx,
          )}
        />
        <div className="relative flex items-start justify-between gap-3">
          <Badge tone={config.tone}>
            <ModeIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {config.label}
          </Badge>
          <div className="flex flex-wrap justify-end gap-2">
            {room.isSaved ? <Badge tone="neutral">Saved</Badge> : null}
            <span className="technical-label rounded-sm border border-white/10 bg-background/60 px-2 py-1 text-on-surface-variant">
              {privacyLabel(room)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-5 pb-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-headline-md font-semibold text-on-surface">
                {room.name}
              </h3>
              <p className="mt-1 truncate text-label-sm text-on-surface-variant">
                Hosted by {room.host}
              </p>
            </div>
            <span
              className={cx(
                "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                active ? config.activeDot : "bg-outline-variant",
              )}
              aria-label={active ? "active" : "idle"}
              role="img"
            />
          </div>

          <p className="line-clamp-2 min-h-12 text-body-md text-on-surface-variant [overflow-wrap:anywhere]">
            {room.nowPlaying}
          </p>
          {room.sourceType === "youtube" ? (
            <DashboardYouTubeMetadata sourceUrl={room.sourceUrl} />
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-label-sm text-on-surface-variant">
          <div className="rounded-md border border-white/10 bg-surface-container-low p-3">
            <dt className="technical-label text-on-surface-variant/70">
              People
            </dt>
            <dd className="mt-1 flex items-center gap-2 text-on-surface">
              <Users className="h-4 w-4 text-primary-fixed-dim" aria-hidden />
              {room.participants}
            </dd>
          </div>
          <div className="rounded-md border border-white/10 bg-surface-container-low p-3">
            <dt className="technical-label text-on-surface-variant/70">
              State
            </dt>
            <dd className="mt-1 truncate text-on-surface">{room.duration}</dd>
          </div>
        </dl>

        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="technical-label min-w-0 truncate text-on-surface-variant">
            {room.updatedAt}
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {removableSavedRooms && room.isSaved ? (
              <button
                aria-label={`Remove ${room.name} from saved rooms`}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-sm border border-white/10 px-3 text-label-sm font-semibold text-on-surface-variant transition hover:border-error/35 hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
                disabled={removingSavedRoom}
                onClick={removeSavedRoom}
                type="button"
              >
                <BookmarkX className="h-4 w-4" aria-hidden />
                Remove
              </button>
            ) : null}
            {disabled ? (
              <Badge className="shrink-0" tone="neutral">
                <Lock className="h-4 w-4" aria-hidden />
                {joinLabel(room)}
              </Badge>
            ) : (
              <PendingLink
                className={buttonClassName({
                  className: "shrink-0",
                  size: "sm",
                })}
                href={`/rooms/${room.id}`}
                loadingDetail="Opening the room and restoring your local session."
                loadingLabel="Joining room"
                tone={room.mode === "listen" ? "amber" : "cyan"}
              >
                <Play className="h-4 w-4" aria-hidden />
                {joinLabel(room)}
              </PendingLink>
            )}
          </span>
        </div>
        {removeError ? (
          <p className="text-label-sm text-error" role="alert">
            {removeError}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

function EmptyState({
  actionLabel,
  description,
  gated,
  title,
}: {
  actionLabel?: string;
  description: string;
  gated?: boolean;
  title: string;
}) {
  return (
    <Panel className="flex min-h-[16rem] flex-col items-start justify-between gap-6 border-dashed bg-surface-container-low">
      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-surface-container-high text-primary-fixed-dim">
        {gated ? (
          <Lock className="h-5 w-5" aria-hidden />
        ) : (
          <Radio className="h-5 w-5" aria-hidden />
        )}
      </div>
      <div>
        <h3 className="text-headline-md font-semibold text-on-surface">
          {title}
        </h3>
        <p className="mt-2 max-w-xl text-body-md text-on-surface-variant">
          {description}
        </p>
      </div>
      {actionLabel ? (
        <Button size="sm" variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
    </Panel>
  );
}

export function RoomRows({
  actionLabel,
  description,
  emptyDescription,
  emptyTitle,
  gated,
  rooms,
  title,
  removableSavedRooms,
}: RoomRowsProps) {
  const headingId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-heading`;
  const [removedRoomIds, setRemovedRoomIds] = useState<Set<string>>(
    () => new Set(),
  );
  const visibleRooms = removableSavedRooms
    ? rooms.filter((room) => !removedRoomIds.has(room.id))
    : rooms;

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2
            className="text-headline-md font-semibold text-on-surface"
            id={headingId}
          >
            {title}
          </h2>
          <p className="mt-1 max-w-2xl text-body-md text-on-surface-variant">
            {description}
          </p>
        </div>
        {visibleRooms.length > 0 ? (
          <span className="technical-label text-on-surface-variant">
            {visibleRooms.length} {visibleRooms.length === 1 ? "room" : "rooms"}
          </span>
        ) : null}
      </div>

      {visibleRooms.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleRooms.map((room) => (
            <RoomCard
              key={room.id}
              onRemoved={() =>
                setRemovedRoomIds((current) => new Set(current).add(room.id))
              }
              removableSavedRooms={removableSavedRooms}
              room={room}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          actionLabel={actionLabel}
          description={emptyDescription}
          gated={gated}
          title={emptyTitle}
        />
      )}
    </section>
  );
}
