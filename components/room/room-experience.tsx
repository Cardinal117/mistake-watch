"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";

import { Button } from "@/components/ui";
import { completeRoomTransition } from "@/lib/performance/room-transition";
import type { AccountSummary } from "@/lib/account/types";
import type { RoomSnapshot } from "@/lib/rooms";
import { PLAYER_FULLSCREEN_EVENT } from "@/lib/player/local-controls";
import { useLiveRoom } from "@/lib/spacetime";
import { ListenModeLayout } from "./listen-mode-layout";
import { WatchModeLayout } from "./watch-mode-layout";

type RoomExperienceProps = {
  account: AccountSummary;
  accountNotice?: "guest-room-attached";
  room: RoomSnapshot;
};

export function RoomExperience({
  account,
  accountNotice,
  room,
}: RoomExperienceProps) {
  const router = useRouter();
  const liveRoom = useLiveRoom(room);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const liveMode =
    liveRoom.snapshot.session?.mode === "listen" ? "listen" : "watch";
  const liveRoomSnapshot = useMemo<RoomSnapshot>(
    () => ({
      ...room,
      mode: liveMode,
    }),
    [liveMode, room],
  );
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
    if (accountNotice === "guest-room-attached") {
      router.replace(`/rooms/${room.id}`, { scroll: false });
    }
  }, [accountNotice, room.id, router]);

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
    return (
      <ListenModeLayout
        account={account}
        accountNotice={accountNotice}
        liveRoom={liveRoom}
        room={liveRoomSnapshot}
      />
    );
  }

  return (
    <WatchModeLayout
      account={account}
      accountNotice={accountNotice}
      liveRoom={liveRoom}
      room={liveRoomSnapshot}
      stageRef={stageRef}
    />
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
