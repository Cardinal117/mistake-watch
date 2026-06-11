import { Film, Link2 } from "lucide-react";
import { Badge } from "@/components/ui";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { DirectMediaPlayer } from "./direct-media-player";
import { IdleMediaTube } from "./idle-media-tube";
import { YoutubeMediaPlayer } from "./youtube-media-player";

type MediaStageProps = {
  liveRoom: LiveRoomState;
  room: RoomSnapshot;
};

export function MediaStage({ liveRoom, room }: MediaStageProps) {
  const liveSource = liveRoom.snapshot.session?.sourceUrl;
  const liveSourceType = liveRoom.snapshot.session?.sourceType;
  const awaitingMedia = !liveSource;

  return (
    <div className="relative h-full min-h-0 min-w-0">
      {awaitingMedia ? <IdleMediaTube mode={room.mode} /> : null}
      <section
        aria-labelledby="media-stage-heading"
        className="screen-glow relative h-full min-h-0 min-w-0 overflow-hidden rounded-xl border border-white/10 bg-surface-container-lowest"
      >
        {awaitingMedia ? (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgb(0_219_233_/_0.16),transparent_34%),linear-gradient(145deg,rgb(255_255_255_/_0.08),transparent_36%),linear-gradient(to_bottom,rgb(0_0_0_/_0.15),rgb(0_0_0_/_0.82))]"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgb(0_0_0_/_0.7),transparent)]"
            />
          </>
        ) : null}

        {liveSource && liveSourceType === "youtube" ? (
          <YoutubeMediaPlayer
            className="absolute inset-0 z-10 h-full w-full bg-black"
            liveRoom={liveRoom}
            mode="watch"
          />
        ) : liveSource ? (
          <DirectMediaPlayer
            className="absolute inset-0 z-10 h-full w-full bg-black object-contain"
            liveRoom={liveRoom}
            mode="watch"
          />
        ) : null}

        {awaitingMedia ? (
          <div className="relative z-10 flex h-full min-h-0 items-center justify-center px-4 py-10 md:px-5">
            <div className="grid max-w-xl place-items-center gap-5 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-white/10 bg-surface-container/70 text-primary-fixed-dim backdrop-blur-xl">
                <Film className="h-9 w-9" aria-hidden />
              </div>
              <div>
                <Badge>Player ready</Badge>
                <h2
                  className="mt-4 text-headline-md font-semibold text-on-surface [overflow-wrap:anywhere] sm:text-headline-lg"
                  id="media-stage-heading"
                >
                  {room.nowPlaying.title}
                </h2>
                <p className="mt-2 text-body-md text-on-surface-variant">
                  Load a YouTube link, direct video URL, or HLS stream from the
                  room sidebar to start synchronized playback.
                </p>
              </div>
              <div className="flex max-w-full flex-wrap justify-center gap-2 text-label-sm text-on-surface-variant">
                <span className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-md border border-white/10 bg-surface-container/70 px-3 py-2">
                  <Link2
                    className="h-4 w-4 text-primary-fixed-dim"
                    aria-hidden
                  />
                  <span className="truncate">{room.nowPlaying.source}</span>
                </span>
                <span className="rounded-md border border-white/10 bg-surface-container/70 px-3 py-2">
                  {liveRoom.connectionStatus}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
