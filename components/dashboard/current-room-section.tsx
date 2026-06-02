import { Activity, KeyRound, Play, Video } from "lucide-react";
import { Badge, Panel, PendingLink } from "@/components/ui";
import type { DashboardRoomSummary } from "@/lib/rooms";
import { DashboardYouTubeMetadata } from "./dashboard-youtube-metadata";

type CurrentRoomSectionProps = {
  room: DashboardRoomSummary | null;
};

export function CurrentRoomSection({ room }: CurrentRoomSectionProps) {
  if (!room) {
    return (
      <section aria-labelledby="current-room-heading">
        <Panel className="border-dashed bg-surface-container-low">
          <Badge>Current Room</Badge>
          <h2
            className="mt-3 text-headline-md font-semibold text-on-surface"
            id="current-room-heading"
          >
            No active room on this browser
          </h2>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            Create a room or join with an invite. The browser will remember
            room-scoped guest access after that.
          </p>
        </Panel>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="current-room-heading"
      className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]"
    >
      <Panel className="overflow-hidden p-0">
        <div className="relative border-b border-white/10 bg-surface-container-high p-5">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgb(0_219_233_/_0.18),transparent_34%),linear-gradient(120deg,rgb(255_255_255_/_0.08),transparent_60%)]"
          />
          <div className="relative flex flex-wrap items-center gap-3">
            <Badge>Current Room</Badge>
            {room.isSaved ? <Badge tone="neutral">Saved</Badge> : null}
            <span className="technical-label text-primary-fixed-dim">
              {room.updatedAt}
            </span>
          </div>
        </div>

        <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
          <div className="min-w-0">
            <h2
              className="truncate text-headline-lg font-semibold text-on-surface"
              id="current-room-heading"
            >
              {room.name}
            </h2>
            <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
              {room.nowPlaying}
            </p>
            {room.sourceType === "youtube" ? (
              <DashboardYouTubeMetadata sourceUrl={room.sourceUrl} />
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-label-sm">
            <div className="rounded-md border border-white/10 bg-surface-container-low p-3">
              <dt className="technical-label text-on-surface-variant/70">
                Host
              </dt>
              <dd className="mt-1 truncate text-on-surface">{room.host}</dd>
            </div>
            <div className="rounded-md border border-white/10 bg-surface-container-low p-3">
              <dt className="technical-label text-on-surface-variant/70">
                People
              </dt>
              <dd className="mt-1 text-on-surface">{room.participants}</dd>
            </div>
          </dl>
        </div>
      </Panel>

      <Panel className="flex flex-col justify-between gap-5 overflow-hidden p-0">
        <div className="grid min-h-36 grid-cols-[8rem_minmax(0,1fr)] border-b border-white/10 bg-surface-container-low">
          <div className="relative overflow-hidden bg-surface-container-high">
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
              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgb(0_219_233_/_0.18),transparent_34%),linear-gradient(145deg,rgb(42_42_43),rgb(14_14_15))] text-primary-fixed-dim">
                <Video className="h-9 w-9" aria-hidden />
              </div>
            )}
          </div>
          <div className="grid min-w-0 content-center gap-2 p-4">
            <Badge>{room.mode === "listen" ? "Listen" : "Watch"}</Badge>
            <p className="line-clamp-2 text-body-md font-semibold text-on-surface">
              {room.nowPlaying}
            </p>
            {room.sourceType === "youtube" ? (
              <DashboardYouTubeMetadata sourceUrl={room.sourceUrl} />
            ) : null}
            <PendingLink
              className="inline-flex w-fit items-center gap-2 rounded-md border border-primary-fixed-dim/45 px-3 py-2 text-label-sm font-semibold text-primary-fixed-dim transition hover:bg-primary-fixed-dim/10"
              href={`/rooms/${room.id}`}
              loadingDetail="Opening the room and restoring your local session."
              loadingLabel="Joining room"
              tone={room.mode === "listen" ? "amber" : "cyan"}
            >
              <Play className="h-4 w-4" aria-hidden />
              Rejoin
            </PendingLink>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="ml-5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-white/10 bg-surface-container-high text-secondary-fixed-dim">
            <KeyRound className="h-5 w-5" aria-hidden />
          </div>
          <div className="pr-5">
            <h3 className="text-body-lg font-semibold text-on-surface">
              Invite access
            </h3>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Room code {room.roomCode} keeps the guest-first flow visible until
              accounts are introduced.
            </p>
          </div>
        </div>

        <div className="mx-5 mb-5 flex items-center gap-2 rounded-md border border-white/10 bg-surface-container-low p-3 text-label-sm text-on-surface-variant">
          <Activity className="h-4 w-4 text-primary-fixed-dim" aria-hidden />
          Live room state updates dashboard people, names, and media status.
        </div>
      </Panel>
    </section>
  );
}
