"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";

import { Button, TabButton, TabsList } from "@/components/ui";
import { completeRoomTransition } from "@/lib/performance/room-transition";
import type { RoomSnapshot } from "@/lib/rooms";
import { PLAYER_FULLSCREEN_EVENT } from "@/lib/player/local-controls";
import { useLiveRoom } from "@/lib/spacetime";
import { MediaStage } from "./media-stage";
import { ModeSwitcher } from "./mode-switcher";
import { ListenModeLayout } from "./listen-mode-layout";
import { RoomNavigationPanel } from "./room-navigation-panel";
import { RoomSidebar, roomTabs, type RoomTabId } from "./room-sidebar";
import { TransportControls } from "./transport-controls";
import { YoutubeRoomStage } from "./youtube-room-stage";

type RoomExperienceProps = {
  room: RoomSnapshot;
};

export function RoomExperience({ room }: RoomExperienceProps) {
  const router = useRouter();
  const liveRoom = useLiveRoom(room);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [mobilePanelTab, setMobilePanelTab] = useState<RoomTabId>("queue");
  const liveMode =
    liveRoom.snapshot.session?.mode === "listen" ? "listen" : "watch";
  const liveRoomSnapshot = useMemo<RoomSnapshot>(
    () => ({
      ...room,
      mode: liveMode,
    }),
    [liveMode, room],
  );
  const onlineParticipantCount = liveRoom.participants.filter(
    (participant) => participant.status === "online",
  ).length;
  const liveSourceType = liveRoom.snapshot.session?.sourceType;

  useEffect(() => {
    function handleFullscreen() {
      const stage = stageRef.current;

      if (!stage) {
        return;
      }

      if (document.fullscreenElement) {
        void document.exitFullscreen();
        return;
      }

      void stage.requestFullscreen();
    }

    window.addEventListener(PLAYER_FULLSCREEN_EVENT, handleFullscreen);

    return () =>
      window.removeEventListener(PLAYER_FULLSCREEN_EVENT, handleFullscreen);
  }, []);

  useEffect(() => {
    if (liveRoom.connectionStatus === "connected") {
      completeRoomTransition("Room connection");
    }
  }, [liveRoom.connectionStatus]);

  useEffect(() => {
    if (!liveRoom.removalNotice) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.replace("/?notice=removed-from-room");
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [liveRoom.removalNotice, router]);

  if (liveRoom.removalNotice) {
    return <RoomRemovedNotice message={liveRoom.removalNotice} />;
  }

  if (liveRoomSnapshot.mode === "listen") {
    return <ListenModeLayout liveRoom={liveRoom} room={liveRoomSnapshot} />;
  }

  return (
    <>
      <div className="grid min-h-screen w-full px-margin-mobile py-4 md:px-margin-desktop lg:grid-cols-[280px_minmax(0,1fr)] lg:px-0 lg:py-0">
        <div className="hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:overflow-y-auto">
          <RoomNavigationPanel liveRoom={liveRoom} room={liveRoomSnapshot} />
        </div>

        <div className="grid min-w-0 content-start">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-surface/80 backdrop-blur-xl lg:hidden">
            <RoomNavigationPanel
              compact={false}
              liveRoom={liveRoom}
              room={liveRoomSnapshot}
            />
            <ModeSwitcher
              canSwitch={
                liveRoom.canManageAuthority &&
                liveRoom.connectionStatus === "connected"
              }
              mode={liveRoomSnapshot.mode}
              onSwitchMode={liveRoom.switchMode}
            />
          </div>

          <TabsList className="sticky top-0 z-30 mt-3 grid grid-cols-3 rounded-md border border-white/10 bg-surface-container-lowest/95 backdrop-blur-xl lg:hidden">
            {roomTabs.map((tab) => (
              <TabButton
                active={mobilePanelTab === tab.id}
                className={
                  mobilePanelTab === tab.id &&
                  liveRoomSnapshot.mode === "listen"
                    ? "bg-secondary-fixed-dim/12 text-secondary-fixed-dim"
                    : undefined
                }
                key={tab.id}
                onClick={() => setMobilePanelTab(tab.id)}
              >
                <span className="inline-flex min-w-0 items-center justify-center gap-2">
                  <span>{tab.label}</span>
                  {tab.id === "members" ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-white/10 bg-surface-container-low px-1.5 text-[11px] font-semibold leading-none text-on-surface-variant">
                      {onlineParticipantCount}
                    </span>
                  ) : null}
                </span>
              </TabButton>
            ))}
          </TabsList>

          <div className="grid min-w-0 gap-4 lg:h-[calc(100vh-8rem)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-0 lg:overflow-hidden">
            <div className="min-w-0 lg:h-full lg:min-h-0" ref={stageRef}>
              <div
                className="room-stage-mode-panel min-w-0 lg:h-full lg:min-h-0"
                data-mode={liveRoomSnapshot.mode}
              >
                {liveSourceType === "youtube" ? (
                  <YoutubeRoomStage
                    liveRoom={liveRoom}
                    mode={liveRoomSnapshot.mode}
                    room={liveRoomSnapshot}
                  />
                ) : (
                  <MediaStage liveRoom={liveRoom} room={liveRoomSnapshot} />
                )}
              </div>
            </div>
            <RoomSidebar
              activeTab={mobilePanelTab}
              liveRoom={liveRoom}
              onActiveTabChange={setMobilePanelTab}
              room={liveRoomSnapshot}
            />
          </div>
        </div>
      </div>

      <TransportControls liveRoom={liveRoom} room={liveRoomSnapshot} />
    </>
  );
}

function RoomRemovedNotice({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-margin-mobile text-on-surface">
      <section
        aria-live="assertive"
        className="grid w-full max-w-md gap-4 rounded-lg border border-error/35 bg-surface/95 p-6 text-center shadow-[0_0_36px_rgb(255_180_171_/_0.12)]"
        role="alert"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-error/35 bg-error/10 text-error">
          <ShieldX className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <p className="technical-label text-error">Room access ended</p>
          <h1 className="mt-2 text-headline-md font-semibold text-on-surface">
            You were removed from the room
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {message} You will be returned to the dashboard.
          </p>
        </div>
        <Button
          className="mx-auto"
          onClick={() => {
            window.location.href = "/?notice=removed-from-room";
          }}
          type="button"
          variant="secondary"
        >
          Back to dashboard
        </Button>
      </section>
    </main>
  );
}
