"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { getYouTubeThumbnailUrl } from "@/lib/player/source";
import { MediaStage } from "../media-stage";
import { TransportControls } from "../transport-controls";
import { YoutubeRoomStage } from "../youtube-room-stage";
import { WatchAudienceSystem } from "./audience/watch-audience-system";
import type { WatchModeLayoutProps, WatchSurfaceId } from "./contracts";
import { WatchSignalBand } from "./header/watch-signal-band";
import { WatchAmbientGlow } from "./presentation";

const WatchQueueSurface = dynamic(
  () =>
    import("./queue/watch-queue-surface").then(
      (module) => module.WatchQueueSurface,
    ),
  { loading: WatchQueueSurfaceLoadingBoundary },
);

export function WatchModeLayout({
  account,
  accountNotice,
  liveRoom,
  room,
  stageRef,
}: WatchModeLayoutProps) {
  const [activeSurface, setActiveSurface] = useState<WatchSurfaceId | null>(
    null,
  );
  const liveSourceType = liveRoom.snapshot.session?.sourceType;
  const activeQueueItem = liveRoom.snapshot.queue.find(
    (item) => item.status === "playing",
  );
  const queuedCount = liveRoom.snapshot.queue.filter(
    (item) => item.status === "queued",
  ).length;
  const onlineCount = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  ).length;
  const thumbnailUrl =
    activeQueueItem?.thumbnailUrl ??
    (liveRoom.snapshot.session?.sourceType === "youtube" &&
    liveRoom.snapshot.session.sourceUrl
      ? getYouTubeThumbnailUrl(liveRoom.snapshot.session.sourceUrl)
      : null);
  function openSurface(surface: WatchSurfaceId) {
    setActiveSurface(surface);
  }

  function closeSurface() {
    setActiveSurface(null);
  }

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-on-surface">
      <WatchAmbientGlow thumbnailUrl={thumbnailUrl} />

      <div className="relative z-10 grid h-dvh min-h-0 grid-rows-[auto_minmax(0,1fr)] px-margin-mobile pb-[12.75rem] pt-0 md:pl-margin-desktop md:pr-[5rem] md:pt-0 lg:pb-[9.25rem]">
        <WatchSignalBand
          activeSurface={activeSurface}
          account={account}
          accountNotice={accountNotice}
          canSwitch={
            liveRoom.canManageAuthority &&
            liveRoom.connectionStatus === "connected"
          }
          connectionStatus={liveRoom.connectionStatus}
          liveRoom={liveRoom}
          onOpenSurface={openSurface}
          onlineCount={onlineCount}
          queuedCount={queuedCount}
          room={room}
        />

        <main className="grid min-h-0 pt-2 md:pt-2">
          <section aria-label="Watch stage" className="grid min-h-0">
            <div
              className="room-stage-mode-panel min-h-0 min-w-0 overflow-hidden rounded-xl border border-white/10 bg-black/60 shadow-screen-glow"
              data-mode="watch"
              ref={stageRef}
            >
              {liveSourceType === "youtube" ? (
                <YoutubeRoomStage
                  liveRoom={liveRoom}
                  mode="watch"
                  room={room}
                />
              ) : (
                <MediaStage liveRoom={liveRoom} room={room} />
              )}
            </div>
          </section>
        </main>
      </div>

      {activeSurface === "queue" ? (
        <WatchQueueSurface
          account={account}
          activeSurface={activeSurface}
          liveRoom={liveRoom}
          onClose={closeSurface}
          room={room}
        />
      ) : null}

      <WatchAudienceSystem
        expanded={activeSurface === "audience"}
        liveRoom={liveRoom}
        onClose={closeSurface}
        onOpen={() => openSurface("audience")}
        room={room}
      />

      <TransportControls
        liveRoom={liveRoom}
        presentation="cinematic"
        room={room}
      />
    </div>
  );
}

function WatchQueueSurfaceLoadingBoundary() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading queue and media"
      className="fixed inset-0 z-[70] bg-background/45 backdrop-blur-[2px]"
    >
      <div
        className="absolute inset-x-2 bottom-2 animate-pulse rounded-lg border border-white/10 bg-background md:inset-x-6 md:bottom-auto md:top-2 md:mx-auto md:max-w-[92rem]"
        style={{ height: "min(94dvh, 56rem)" }}
      />
    </div>
  );
}
