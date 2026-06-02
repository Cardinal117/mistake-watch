import { Radio, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui";
import type { RoomSnapshot } from "@/lib/rooms";

type RoomStatusHudProps = {
  room: RoomSnapshot;
};

export function RoomStatusHud({ room }: RoomStatusHudProps) {
  const accentClass =
    room.mode === "listen"
      ? "text-secondary-fixed-dim"
      : "text-primary-fixed-dim";

  return (
    <header className="absolute left-4 right-4 top-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-surface-container/70 p-3 backdrop-blur-xl md:left-6 md:right-6 md:top-6">
      <div className="flex min-w-0 items-center gap-3">
        <Badge tone={room.mode === "listen" ? "amber" : "cyan"}>
          Live Room
        </Badge>
        <div className="min-w-0">
          <h1 className="truncate text-body-lg font-semibold text-on-surface">
            {room.name}
          </h1>
          <p className="technical-label text-on-surface-variant">
            {room.code} / {room.nowPlaying.resolution}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-label-sm text-on-surface-variant">
        <span className="inline-flex h-8 items-center gap-2 rounded-md border border-white/10 bg-surface-container-low px-2.5">
          <Users className={`h-4 w-4 ${accentClass}`} aria-hidden />
          {room.participants}
        </span>
        <span className="inline-flex h-8 items-center gap-2 rounded-md border border-white/10 bg-surface-container-low px-2.5">
          <Radio className={`h-4 w-4 ${accentClass}`} aria-hidden />
          {room.nowPlaying.latency}
        </span>
        <span className="hidden h-8 items-center gap-2 rounded-md border border-white/10 bg-surface-container-low px-2.5 sm:inline-flex">
          <ShieldCheck
            className="h-4 w-4 text-secondary-fixed-dim"
            aria-hidden
          />
          Host controlled
        </span>
      </div>
    </header>
  );
}
