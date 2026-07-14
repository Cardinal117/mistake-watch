"use client";

import { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, ShieldX } from "lucide-react";

import { Button } from "@/components/ui";
import { completeRoomTransition } from "@/lib/performance/room-transition";
import type { AccountSummary } from "@/lib/account/types";
import type { RoomSnapshot } from "@/lib/rooms";
import { PLAYER_FULLSCREEN_EVENT } from "@/lib/player/local-controls";
import { useLiveRoom, type LiveRoomState } from "@/lib/spacetime";
import { getRoomConnectionPresentation } from "@/lib/spacetime/live-room/connection-readiness";

const ListenModeLayout = dynamic(
  () =>
    import("./listen/listen-mode-layout").then(
      (module) => module.ListenModeLayout,
    ),
  { loading: RoomModeLoadingBoundary },
);
const WatchModeLayout = dynamic(
  () =>
    import("./watch/watch-mode-layout").then(
      (module) => module.WatchModeLayout,
    ),
  { loading: RoomModeLoadingBoundary },
);

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
    if (liveRoom.connectionReadiness.status === "ready") {
      completeRoomTransition("Room connection");
    }
  }, [liveRoom.connectionReadiness.status]);

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

  if (liveRoom.connectionReadiness.status !== "ready") {
    return (
      <RoomConnectionBoundary
        readiness={liveRoom.connectionReadiness}
        retry={liveRoom.retryConnection}
      />
    );
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

function RoomConnectionBoundary({
  readiness,
  retry,
}: {
  readiness: Exclude<LiveRoomState["connectionReadiness"], { status: "ready" }>;
  retry(): void;
}) {
  const presentation = getRoomConnectionPresentation(readiness);
  const terminal = presentation.canRetry;

  return (
    <main className="grid min-h-screen place-items-center bg-background px-margin-mobile text-on-surface">
      <section
        aria-busy={!terminal}
        aria-live={terminal ? "assertive" : "polite"}
        className="grid w-full max-w-md gap-4 rounded-lg border border-white/10 bg-surface/95 p-6 text-center"
        role={terminal ? "alert" : "status"}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-primary-fixed-dim/30 bg-primary-fixed-dim/10 text-primary-fixed-dim">
          {terminal ? (
            <AlertTriangle className="h-6 w-6" aria-hidden />
          ) : (
            <RefreshCw
              className="h-6 w-6 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          )}
        </div>
        <div>
          <p className="technical-label text-primary-fixed-dim">Room signal</p>
          <h1 className="mt-2 text-headline-md font-semibold text-on-surface">
            {presentation.label}
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {presentation.detail}
          </p>
        </div>
        {terminal ? (
          <Button className="mx-auto" onClick={retry} type="button">
            <RefreshCw className="h-4 w-4" aria-hidden />
            Retry connection
          </Button>
        ) : null}
      </section>
    </main>
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

function RoomModeLoadingBoundary() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading room"
      className="grid h-dvh min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-background px-margin-mobile py-3 text-on-surface md:px-margin-desktop"
    >
      <div className="h-12 animate-pulse border-b border-white/10 bg-surface-container-lowest/70" />
      <div className="min-h-0 animate-pulse rounded-xl border border-white/10 bg-black/60 shadow-screen-glow" />
      <div className="h-20 animate-pulse border-t border-white/10 bg-surface-container-lowest/70" />
    </main>
  );
}
