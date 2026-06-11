"use client";

import { useMemo, useState } from "react";
import {
  Film,
  Headphones,
  Image as ImageIcon,
  Link2,
  PictureInPicture2,
} from "lucide-react";

import { Badge, Button } from "@/components/ui";
import { resolveWaveformSource } from "@/lib/player";
import { getYouTubeThumbnailUrl } from "@/lib/player/source";
import type { RoomSnapshot } from "@/lib/rooms";
import type { LiveRoomState } from "@/lib/spacetime";
import { cx } from "@/lib/ui";
import { AudioVisualizer } from "./audio-visualizer";
import { useWaveformEnvironment } from "./use-waveform-environment";
import { YouTubeMetadataLine } from "./youtube-metadata-line";
import { YoutubeMediaPlayer } from "./youtube-media-player";

type YoutubeRoomStageProps = {
  liveRoom: LiveRoomState;
  mode: "listen" | "watch";
  room: RoomSnapshot;
};

export function YoutubeRoomStage({
  liveRoom,
  mode,
  room,
}: YoutubeRoomStageProps) {
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const liveSource = liveRoom.snapshot.session?.sourceUrl;
  const liveTitle = liveRoom.snapshot.session?.sourceTitle;
  const liveStatus = liveRoom.snapshot.session?.status ?? "paused";
  const activeQueueItem = liveRoom.snapshot.queue.find(
    (item) => item.status === "playing",
  );
  const queuedCount = liveRoom.snapshot.queue.filter(
    (item) => item.status === "queued",
  ).length;
  const thumbnailUrl = liveSource ? getYouTubeThumbnailUrl(liveSource) : null;
  const listenMode = mode === "listen";
  const isPlaying = liveStatus === "playing";
  const waveformEnvironment = useWaveformEnvironment();
  const waveformPlan = useMemo(
    () =>
      resolveWaveformSource(
        {
          sourceType: "youtube",
          sourceUrl: liveSource,
        },
        waveformEnvironment,
      ),
    [liveSource, waveformEnvironment],
  );

  return (
    <div className="relative h-full min-h-0 min-w-0">
      <section
        aria-labelledby="youtube-stage-heading"
        className={cx(
          "relative min-w-0 overflow-hidden rounded-xl border border-white/10 bg-surface-container-lowest",
          listenMode
            ? "min-h-[30rem] md:min-h-[34rem] lg:h-full lg:min-h-0 lg:rounded-none lg:border-y-0"
            : "h-full min-h-0",
          listenMode ? "amber-glow" : "screen-glow",
        )}
      >
        {listenMode ? <MusicBackdrop active={isPlaying} /> : null}
        <div
          aria-hidden
          className={cx(
            "absolute inset-0",
            listenMode
              ? "bg-[radial-gradient(circle_at_50%_38%,rgb(255_186_32_/_0.2),transparent_30%),radial-gradient(circle_at_24%_64%,rgb(0_219_233_/_0.08),transparent_28%),linear-gradient(to_bottom,rgb(0_0_0_/_0.12),rgb(0_0_0_/_0.86))]"
              : "bg-[radial-gradient(circle_at_50%_42%,rgb(0_219_233_/_0.12),transparent_34%),linear-gradient(to_bottom,rgb(0_0_0_/_0.12),rgb(0_0_0_/_0.82))]",
          )}
        />
        {thumbnailUrl && listenMode ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail metadata is external provider artwork. */}
            <img
              alt=""
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-3xl"
              fetchPriority="high"
              loading="eager"
              src={thumbnailUrl}
            />
          </>
        ) : null}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(to_bottom,rgb(0_0_0_/_0.7),transparent)]"
        />

        {listenMode ? (
          <div className="relative z-10 grid min-h-[30rem] place-items-center px-4 pb-36 pt-16 md:min-h-[34rem] md:px-5 lg:h-full lg:min-h-0 lg:pb-16">
            <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(300px,540px)_minmax(0,1fr)] lg:items-center">
              <div className="mx-auto grid w-full max-w-[320px] gap-4 md:max-w-[540px]">
                <div className="aspect-square rounded-xl border border-white/10 bg-[radial-gradient(circle_at_35%_28%,rgb(255_222_168_/_0.32),transparent_26%),radial-gradient(circle_at_62%_65%,rgb(0_219_233_/_0.16),transparent_30%),linear-gradient(145deg,rgb(255_186_32_/_0.2),rgb(32_31_32_/_0.96))] p-3 shadow-amber-glow">
                  <div className="relative h-full overflow-hidden rounded-lg border border-white/10 bg-background/45 backdrop-blur-sm">
                    {thumbnailUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail metadata is external provider artwork. */}
                        <img
                          alt=""
                          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
                          fetchPriority="high"
                          loading="eager"
                          src={thumbnailUrl}
                        />
                        {/* eslint-disable-next-line @next/next/no-img-element -- YouTube thumbnail metadata is external provider artwork. */}
                        <img
                          alt=""
                          className="absolute inset-0 z-10 h-full w-full object-cover"
                          fetchPriority="high"
                          loading="eager"
                          src={thumbnailUrl}
                        />
                      </>
                    ) : (
                      <div className="absolute inset-0 z-10 flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgb(255_186_32_/_0.24),transparent_34%),linear-gradient(145deg,rgb(42_42_43),rgb(14_14_15))] text-secondary-fixed-dim">
                        <Headphones className="h-20 w-20" aria-hidden />
                      </div>
                    )}
                    <div
                      aria-hidden
                      className="absolute inset-0 z-20 bg-[linear-gradient(to_bottom,rgb(14_14_15_/_0.08),rgb(14_14_15_/_0.52))]"
                    />
                    <span className="absolute bottom-[15rem] right-3 z-40 rounded-sm border border-secondary-fixed-dim/30 bg-surface/85 px-2 py-1 text-label-sm font-semibold text-secondary-fixed-dim backdrop-blur-xl">
                      YouTube Source
                    </span>
                    <Button
                      aria-label={
                        sourceExpanded
                          ? "Use compact YouTube source player"
                          : "Expand YouTube source player"
                      }
                      className="absolute left-3 top-3 z-40 bg-surface/85 backdrop-blur-xl"
                      onClick={() => setSourceExpanded((current) => !current)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      {sourceExpanded ? (
                        <PictureInPicture2 className="h-4 w-4" aria-hidden />
                      ) : (
                        <ImageIcon className="h-4 w-4" aria-hidden />
                      )}
                      Source: {sourceExpanded ? "Expanded" : "Compact"}
                    </Button>
                  </div>
                </div>
                <AudioVisualizer active={isPlaying} plan={waveformPlan} />
              </div>

              <div className="text-center lg:text-left">
                <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
                  <Badge tone="amber">Listen Mode</Badge>
                  <span className="technical-label text-secondary-fixed-dim">
                    {liveStatus === "playing"
                      ? "Synced listening"
                      : liveStatus === "ended"
                        ? queuedCount > 0
                          ? "Loading next"
                          : "Queue ended"
                        : room.nowPlaying.mood}
                  </span>
                </div>
                <h2
                  className="mt-5 text-headline-lg font-semibold text-on-surface [overflow-wrap:anywhere] md:text-display-lg"
                  id="youtube-stage-heading"
                >
                  {liveTitle ?? room.nowPlaying.title}
                </h2>
                {activeQueueItem?.artist ? (
                  <p className="mt-2 text-body-lg text-on-surface">
                    {activeQueueItem.artist}
                  </p>
                ) : null}
                <YouTubeMetadataLine
                  className="mt-3 justify-center lg:justify-start"
                  sourceUrl={liveSource}
                  tone="amber"
                />
                <p className="mt-1 text-body-md text-on-surface-variant">
                  {queuedCount > 0
                    ? `${queuedCount} queued next`
                    : room.nowPlaying.album}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex h-full min-h-0 items-center justify-center px-4 py-10 md:px-5">
            <div className="pointer-events-none absolute left-5 top-5 z-20 rounded-md border border-white/10 bg-surface/80 px-3 py-2 backdrop-blur-xl">
              <Badge>Watch Mode</Badge>
              <h2
                className="mt-2 max-w-md truncate text-title-md font-semibold text-on-surface"
                id="youtube-stage-heading"
              >
                {liveTitle ?? room.nowPlaying.title}
              </h2>
            </div>
          </div>
        )}

        <YoutubeMediaPlayer
          className={cx(
            "z-30 overflow-hidden bg-black transition-[height,width,inset,border-radius,border-color,box-shadow] duration-300",
            listenMode
              ? cx(
                  "absolute bottom-3 right-3 rounded-md border border-secondary-fixed-dim/40 shadow-amber-glow",
                  sourceExpanded
                    ? "h-[13.75rem] w-[min(30rem,calc(100%-1.5rem))] md:aspect-video md:h-auto"
                    : "h-[13.75rem] w-[13.75rem] max-w-[calc(100%-1.5rem)]",
                )
              : "absolute inset-0 h-full w-full",
          )}
          liveRoom={liveRoom}
          mode={mode}
        />
      </section>
    </div>
  );
}

function MusicBackdrop({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={cx(
        "pointer-events-none absolute inset-0 overflow-hidden opacity-80",
        active && "music-backdrop-active",
      )}
    >
      {(["left", "right"] as const).map((side) => (
        <div
          className={cx(
            "music-backdrop-wave absolute bottom-0 top-0 flex w-28 items-center gap-1.5 md:w-36 lg:w-44",
            side === "left"
              ? "left-0 justify-start pl-4"
              : "right-0 justify-end pr-4",
          )}
          data-side={side}
          key={side}
        >
          {Array.from({ length: 34 }).map((_, index) => (
            <span
              className="music-backdrop-bar block w-1 rounded-sm bg-secondary-fixed-dim/45 shadow-amber-glow"
              key={index}
              style={{
                animationDelay: `${((index + (side === "right" ? 5 : 0)) % 13) * 82}ms`,
                height: `${18 + ((index * 23 + (side === "right" ? 17 : 0)) % 68)}%`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
