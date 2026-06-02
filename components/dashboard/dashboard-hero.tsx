import { Play } from "lucide-react";
import { Badge, PendingLink, buttonClassName } from "@/components/ui";
import type { DashboardRoomSummary } from "@/lib/rooms";

type DashboardHeroProps = {
  currentRoom: DashboardRoomSummary | null;
  statusMessage?: string;
};

export function DashboardHero({
  currentRoom,
  statusMessage,
}: DashboardHeroProps) {
  return (
    <section className="relative min-h-[300px] overflow-hidden border-b border-white/10 md:min-h-[330px]">
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgb(0_219_233_/_0.58),transparent)]"
      />

      <div className="relative z-10 flex min-h-[300px] w-full items-end px-6 pb-8 pt-10 md:min-h-[330px] md:px-8 md:pb-9">
        <div className="max-w-2xl space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Private Dashboard</Badge>
            <span className="technical-label text-secondary-fixed-dim">
              Friends and family first
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="max-w-xl text-headline-lg font-bold leading-tight text-on-surface [overflow-wrap:anywhere] md:text-[2.5rem] md:leading-[1.1]">
              Start a room that feels like everyone is already there.
            </h1>
            <p className="max-w-xl text-body-md text-on-surface-variant">
              Create a private lounge, share an invite, or rejoin from this
              browser when you have an active room. Saved rooms stay available
              for regular watch nights without implying anyone is online.
            </p>
          </div>

          {currentRoom ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <PendingLink
                className={buttonClassName({
                  className: "w-full min-w-0 sm:w-auto",
                  size: "lg",
                })}
                href={`/rooms/${currentRoom.id}`}
                loadingDetail="Opening the room and restoring your local session."
                loadingLabel="Joining room"
                tone={currentRoom.mode === "listen" ? "amber" : "cyan"}
              >
                <Play className="h-5 w-5" aria-hidden />
                <span className="truncate">Rejoin {currentRoom.name}</span>
              </PendingLink>
            </div>
          ) : null}

          {statusMessage ? (
            <p className="max-w-2xl rounded-md border border-error/25 bg-error-container/20 p-3 text-body-md text-error">
              {statusMessage}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
